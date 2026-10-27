import { prisma } from "@/db";
import { getSession } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
import { CAN_CANCEL, CAN_EDIT, OPEN_REQUEST_STATUSES, itemFitsUnit } from "@/lib/stock";
import { canRequestFor, canUseStock, isStorekeeper } from "@/lib/stock-access";
import { newOrderRef, stepsFor, viewableRequestsWhere } from "@/lib/stock-service";

const requestInclude = {
    item: {
        select: {
            id: true, name: true, category: true, quantity: true, variants: true,
            sellPrice: true, costPrice: true, currency: true, unitOfMeasure: true, photoUrl: true,
        },
    },
    unit: { select: { id: true, name: true, unitType: true } },
    member: { select: { id: true, firstName: true, lastName: true } },
} as const;

/** GET ?status=open|all|<STATUS>&unitId= — requests this user may see. */
export async function GET(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session || !canUseStock(session)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const sp = new URL(request.url).searchParams;
        const status = sp.get("status") ?? "open";
        const unitId = sp.get("unitId");

        const where: Prisma.ItemRequestWhereInput = {
            AND: [viewableRequestsWhere(session)],
            ...(unitId ? { unitId } : {}),
            ...(status === "open" ? { status: { in: OPEN_REQUEST_STATUSES } } : status === "all" ? {} : { status }),
        };
        const rows = await prisma.itemRequest.findMany({ where, include: requestInclude, orderBy: { createdAt: "desc" }, take: 1000 });
        const storekeeper = isStorekeeper(session);
        return NextResponse.json(rows.map(r => {
            const leader = canRequestFor(session, r.unitId);
            // Buying prices are the storekeeper's business, not the units'.
            const item = storekeeper ? r.item : { ...r.item, costPrice: null };
            return {
                ...r,
                item,
                unitPrice: r.unitPrice ?? r.item.sellPrice,
                currency: r.currency ?? r.item.currency,
                next: stepsFor(session, r),
                canGive: storekeeper,
                canCancel: leader && CAN_CANCEL.includes(r.status),
                canEdit: leader && CAN_EDIT.includes(r.status),
                // Paid and who it is for stay editable after hand-over: money often comes later.
                canManage: leader && !["REJECTED", "CANCELLED"].includes(r.status),
            };
        }));
    } catch (error) {
        console.error("Error listing requests:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

/**
 * POST { unitId, memberId?, items: [{ itemId, variant?, quantity?, note? }], sameAs? }
 * — a leader's order for one scout (or the unit). Leaders are the ones who
 * approve, so it starts approved and goes straight to the QG list.
 *
 * sameAs: the id of an existing request. The new lines join that person's
 * order — same scout or typed name, same family reference — which is how a
 * leader adds a forgotten item to what a family ordered.
 */
export async function POST(request: NextRequest) {
    try {
        const session = await getSession();
        const body = await request.json().catch(() => ({}));
        const sameAs = typeof body.sameAs === "string" && body.sameAs
            ? await prisma.itemRequest.findUnique({
                where: { id: body.sameAs },
                select: { unitId: true, memberId: true, requestedForName: true, contactName: true, contactPhone: true, source: true, orderRef: true },
            })
            : null;
        if (body.sameAs && !sameAs) return NextResponse.json({ error: "That order no longer exists" }, { status: 404 });
        const unitId = sameAs?.unitId ?? (typeof body.unitId === "string" ? body.unitId : "");
        if (!session || !unitId || !canRequestFor(session, unitId)) {
            return NextResponse.json({ error: "You can only request items for a unit you lead" }, { status: 403 });
        }
        const unit = await prisma.unit.findUnique({ where: { id: unitId }, select: { unitType: true } });
        if (!unit) return NextResponse.json({ error: "Unit not found" }, { status: 404 });

        const lines: Record<string, unknown>[] = Array.isArray(body.items) ? body.items.slice(0, 50) : [];
        if (!lines.length) return NextResponse.json({ error: "Add at least one item" }, { status: 400 });
        // One scout for the whole order (or none: for the unit). Older clients
        // sent it per line; that still works.
        const orderMember = sameAs ? sameAs.memberId : typeof body.memberId === "string" && body.memberId ? body.memberId : null;

        const items = await prisma.stockItem.findMany({
            where: { id: { in: lines.map(l => String(l.itemId)) }, requestable: true, archived: false },
            select: { id: true, name: true, variants: true, forUnitTypes: true, sellPrice: true, currency: true },
        });
        const memberIds = [...new Set([orderMember, ...lines.map(l => l.memberId)].filter((v): v is string => typeof v === "string" && !!v))];
        const members = await prisma.member.findMany({
            where: { id: { in: memberIds }, status: "ACTIVE", OR: [{ unitId }, { servesUnitId: unitId }] },
            select: { id: true },
        });

        const orderRef = sameAs?.orderRef ?? newOrderRef();
        const data: Prisma.ItemRequestCreateManyInput[] = [];
        for (const l of lines) {
            const item = items.find(i => i.id === l.itemId);
            if (!item) return NextResponse.json({ error: "One of the items cannot be requested" }, { status: 400 });
            if (!itemFitsUnit(item, unit.unitType)) return NextResponse.json({ error: `"${item.name}" is not offered to this unit` }, { status: 400 });
            const memberId = (typeof l.memberId === "string" && l.memberId) || orderMember;
            if (memberId && !members.some(m => m.id === memberId)) {
                return NextResponse.json({ error: "Requests are for scouts of this unit" }, { status: 400 });
            }
            const variant = typeof l.variant === "string" && l.variant ? l.variant : null;
            if (item.variants.length && !(variant && item.variants.includes(variant))) {
                return NextResponse.json({ error: `Choose a size / option for "${item.name}"` }, { status: 400 });
            }
            const quantity = Number(l.quantity ?? 1);
            if (!Number.isInteger(quantity) || quantity < 1 || quantity > 200) return NextResponse.json({ error: "Quantity must be between 1 and 200" }, { status: 400 });
            data.push({
                itemId: item.id, unitId, memberId: memberId || null, variant, quantity,
                note: typeof l.note === "string" && l.note.trim() ? l.note.trim().slice(0, 500) : null,
                status: "APPROVED", source: sameAs?.source ?? "LEADER", orderRef,
                requestedForName: sameAs?.requestedForName ?? null,
                contactName: sameAs?.contactName ?? null, contactPhone: sameAs?.contactPhone ?? null,
                unitPrice: item.sellPrice, currency: item.currency,
                requestedById: session.userId, requestedByName: session.name,
            });
        }
        await prisma.itemRequest.createMany({ data });
        return NextResponse.json({ created: data.length, orderRef });
    } catch (error) {
        console.error("Error creating requests:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
