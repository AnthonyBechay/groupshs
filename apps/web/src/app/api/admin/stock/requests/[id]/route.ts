import { prisma } from "@/db";
import { getSession } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
import { CAN_CANCEL, CAN_EDIT, CAN_GIVE_FROM_STOCK, itemFitsUnit, requestStatusLabel } from "@/lib/stock";
import { canRequestFor, isStorekeeper } from "@/lib/stock-access";
import { StockError, moveStock, stepsFor } from "@/lib/stock-service";

/**
 * PATCH
 *   { action: "move", to, note? }   a step from stepsFor(): the unit's maîtrise and
 *                                   the storekeeper take any; a shopper only "bought"
 *   { action: "give", note? }       storekeeper: hand it out from stock (quantity goes down)
 *   { action: "cancel" }            the unit's leaders, until it has been bought
 *   { action: "edit", itemId?, variant?, quantity? }
 *                                   the unit's leaders, until it has been bought
 *   { action: "paid", paid }        the unit's leaders
 *   { action: "match", memberId }   the unit's leaders: attach a family's order to the
 *                                   right scout (or null to detach it)
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getSession();
        const { id } = await params;
        const r = await prisma.itemRequest.findUnique({ where: { id }, include: { item: { select: { name: true } }, unit: { select: { unitType: true } } } });
        if (!r) return NextResponse.json({ error: "Not found" }, { status: 404 });
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const body = await request.json().catch(() => ({}));
        const note = typeof body.note === "string" && body.note.trim() ? body.note.trim().slice(0, 500) : undefined;
        const leader = canRequestFor(session, r.unitId);

        if (body.action === "move") {
            if (!stepsFor(session, r).includes(body.to)) {
                return NextResponse.json({ error: `You cannot move it from ${requestStatusLabel(r.status)} to ${requestStatusLabel(body.to)}` }, { status: 403 });
            }
            const updated = await prisma.itemRequest.update({
                where: { id }, data: { status: body.to, handledByName: session.name, statusNote: note ?? r.statusNote },
            });
            return NextResponse.json(updated);
        }

        if (body.action === "give") {
            if (!isStorekeeper(session)) return NextResponse.json({ error: "Only the storekeeper hands out from stock" }, { status: 403 });
            if (!CAN_GIVE_FROM_STOCK.includes(r.status)) return NextResponse.json({ error: "This one is already bought" }, { status: 409 });
            const updated = await prisma.$transaction(async (tx) => {
                // The status filter makes a double click hand it out only once.
                const res = await tx.itemRequest.updateMany({
                    where: { id, status: { in: CAN_GIVE_FROM_STOCK } },
                    data: { status: "DELIVERED", fromStock: true, handledByName: session.name, statusNote: note ?? r.statusNote },
                });
                if (res.count === 0) throw new StockError("This request changed meanwhile");
                await moveStock(tx, r.itemId, -r.quantity, {
                    reason: `Handed out: request${r.variant ? ` (${r.variant})` : ""}`, requestId: r.id, by: session,
                });
                return tx.itemRequest.findUniqueOrThrow({ where: { id } });
            });
            return NextResponse.json(updated);
        }

        if (!leader) return NextResponse.json({ error: "Only this unit's leaders can change it" }, { status: 403 });

        if (body.action === "cancel") {
            if (!CAN_CANCEL.includes(r.status)) return NextResponse.json({ error: `It is already ${requestStatusLabel(r.status).toLowerCase()}` }, { status: 409 });
            const updated = await prisma.itemRequest.update({ where: { id }, data: { status: "CANCELLED", statusNote: note ?? r.statusNote } });
            return NextResponse.json(updated);
        }

        if (body.action === "edit") {
            if (!CAN_EDIT.includes(r.status)) return NextResponse.json({ error: "It is already bought — it can no longer be changed" }, { status: 409 });
            const data: Prisma.ItemRequestUncheckedUpdateInput = {};
            const itemId = typeof body.itemId === "string" && body.itemId ? body.itemId : r.itemId;
            const item = await prisma.stockItem.findFirst({
                where: { id: itemId, ...(itemId !== r.itemId ? { requestable: true, archived: false } : {}) },
                select: { id: true, name: true, variants: true, forUnitTypes: true, sellPrice: true, currency: true },
            });
            if (!item) return NextResponse.json({ error: "That item cannot be requested" }, { status: 400 });
            if (itemId !== r.itemId) {
                if (!itemFitsUnit(item, r.unit.unitType)) return NextResponse.json({ error: `"${item.name}" is not offered to this unit` }, { status: 400 });
                // A different item is a different price: take today's.
                Object.assign(data, { itemId, unitPrice: item.sellPrice, currency: item.currency });
            }
            const variant = "variant" in body || itemId !== r.itemId
                ? (typeof body.variant === "string" && body.variant ? body.variant : null)
                : r.variant;
            if (item.variants.length && !(variant && item.variants.includes(variant))) {
                return NextResponse.json({ error: `Choose a size / option for "${item.name}"` }, { status: 400 });
            }
            data.variant = item.variants.length ? variant : null;
            if ("quantity" in body) {
                const quantity = Number(body.quantity);
                if (!Number.isInteger(quantity) || quantity < 1 || quantity > 200) return NextResponse.json({ error: "Quantity must be between 1 and 200" }, { status: 400 });
                data.quantity = quantity;
            }
            const updated = await prisma.itemRequest.update({ where: { id }, data });
            return NextResponse.json(updated);
        }

        if (body.action === "paid") {
            const paid = body.paid === true;
            const updated = await prisma.itemRequest.update({ where: { id }, data: { paid, paidAt: paid ? new Date() : null } });
            return NextResponse.json(updated);
        }

        if (body.action === "match") {
            const memberId = typeof body.memberId === "string" && body.memberId ? body.memberId : null;
            if (memberId) {
                const member = await prisma.member.findFirst({
                    where: { id: memberId, status: "ACTIVE", OR: [{ unitId: r.unitId }, { servesUnitId: r.unitId }] },
                    select: { id: true },
                });
                if (!member) return NextResponse.json({ error: "Pick a scout of this unit" }, { status: 400 });
            }
            // The typed name is kept: it is what the family wrote, and shows where a match came from.
            const updated = await prisma.itemRequest.update({ where: { id }, data: { memberId } });
            return NextResponse.json(updated);
        }

        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    } catch (error) {
        if (error instanceof StockError) return NextResponse.json({ error: error.message }, { status: 409 });
        console.error("Error updating request:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
