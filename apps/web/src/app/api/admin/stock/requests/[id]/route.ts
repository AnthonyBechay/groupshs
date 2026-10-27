import { prisma } from "@/db";
import { getSession } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { CAN_CANCEL, CAN_GIVE_FROM_STOCK, canMoveRequest, requestStatusLabel } from "@/lib/stock";
import { canRequestFor, isStorekeeper } from "@/lib/stock-access";
import { StockError, moveStock } from "@/lib/stock-service";

/**
 * PATCH
 *   { action: "move", to, note? }  storekeeper: approve, reject, bought, ready, delivered
 *   { action: "give", note? }      storekeeper: hand it out from stock (quantity goes down)
 *   { action: "cancel" }           the unit's leaders, until it has been bought
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getSession();
        const { id } = await params;
        const r = await prisma.itemRequest.findUnique({ where: { id }, include: { item: { select: { name: true } } } });
        if (!r) return NextResponse.json({ error: "Not found" }, { status: 404 });
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const body = await request.json().catch(() => ({}));
        const note = typeof body.note === "string" && body.note.trim() ? body.note.trim().slice(0, 500) : undefined;

        if (body.action === "cancel") {
            if (!canRequestFor(session, r.unitId)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
            if (!CAN_CANCEL.includes(r.status)) return NextResponse.json({ error: `It is already ${requestStatusLabel(r.status).toLowerCase()}` }, { status: 409 });
            const updated = await prisma.itemRequest.update({ where: { id }, data: { status: "CANCELLED", statusNote: note ?? r.statusNote } });
            return NextResponse.json(updated);
        }

        if (!isStorekeeper(session)) return NextResponse.json({ error: "Only the storekeeper processes requests" }, { status: 403 });

        if (body.action === "give") {
            if (!CAN_GIVE_FROM_STOCK.includes(r.status)) return NextResponse.json({ error: "This one is already being bought" }, { status: 409 });
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

        if (body.action === "move") {
            if (!canMoveRequest(r.status, body.to)) {
                return NextResponse.json({ error: `Cannot go from ${requestStatusLabel(r.status)} to ${requestStatusLabel(body.to)}` }, { status: 409 });
            }
            const updated = await prisma.itemRequest.update({
                where: { id }, data: { status: body.to, handledByName: session.name, statusNote: note ?? r.statusNote },
            });
            return NextResponse.json(updated);
        }
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    } catch (error) {
        if (error instanceof StockError) return NextResponse.json({ error: error.message }, { status: 409 });
        console.error("Error updating request:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
