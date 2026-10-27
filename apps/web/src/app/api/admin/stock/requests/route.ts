import { prisma } from "@/db";
import { getSession } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
import { CAN_CANCEL, OPEN_REQUEST_STATUSES } from "@/lib/stock";
import { canRequestFor, canUseStock, isStorekeeper } from "@/lib/stock-access";
import { viewableRequestsWhere } from "@/lib/stock-service";

const requestInclude = {
    item: { select: { id: true, name: true, category: true, quantity: true, variants: true, price: true, unitOfMeasure: true } },
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
        const rows = await prisma.itemRequest.findMany({ where, include: requestInclude, orderBy: { createdAt: "desc" }, take: 500 });
        const storekeeper = isStorekeeper(session);
        return NextResponse.json(rows.map(r => ({
            ...r,
            canProcess: storekeeper,
            canCancel: CAN_CANCEL.includes(r.status) && canRequestFor(session, r.unitId),
        })));
    } catch (error) {
        console.error("Error listing requests:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

/**
 * POST { unitId, items: [{ itemId, memberId?, variant?, quantity? , note? }] }
 * — one or several requests at once, e.g. a shirt and a scarf for a new scout.
 */
export async function POST(request: NextRequest) {
    try {
        const session = await getSession();
        const body = await request.json().catch(() => ({}));
        const unitId = typeof body.unitId === "string" ? body.unitId : "";
        if (!session || !unitId || !canRequestFor(session, unitId)) {
            return NextResponse.json({ error: "You can only request items for a unit you lead" }, { status: 403 });
        }
        const lines: Record<string, unknown>[] = Array.isArray(body.items) ? body.items.slice(0, 50) : [];
        if (!lines.length) return NextResponse.json({ error: "Add at least one item" }, { status: 400 });

        const items = await prisma.stockItem.findMany({
            where: { id: { in: lines.map(l => String(l.itemId)) }, requestable: true, archived: false },
            select: { id: true, name: true, variants: true },
        });
        const memberIds = [...new Set(lines.map(l => l.memberId).filter((v): v is string => typeof v === "string" && !!v))];
        const members = await prisma.member.findMany({
            where: { id: { in: memberIds }, status: "ACTIVE", OR: [{ unitId }, { servesUnitId: unitId }] },
            select: { id: true },
        });

        const data: Prisma.ItemRequestCreateManyInput[] = [];
        for (const l of lines) {
            const item = items.find(i => i.id === l.itemId);
            if (!item) return NextResponse.json({ error: "One of the items cannot be requested" }, { status: 400 });
            const memberId = typeof l.memberId === "string" && l.memberId ? l.memberId : null;
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
                itemId: item.id, unitId, memberId, variant, quantity,
                note: typeof l.note === "string" && l.note.trim() ? l.note.trim().slice(0, 500) : null,
                requestedById: session.userId, requestedByName: session.name,
            });
        }
        await prisma.itemRequest.createMany({ data });
        return NextResponse.json({ created: data.length });
    } catch (error) {
        console.error("Error creating requests:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
