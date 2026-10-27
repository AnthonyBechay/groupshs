import { prisma } from "@/db";
import { getSession } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
import { OPEN_REQUEST_STATUSES } from "@/lib/stock";
import { canEditItem, canSeeInventory, canUseStock, isStorekeeper } from "@/lib/stock-access";
import { itemInclude, parseItemBody, viewableItemsWhere } from "@/lib/stock-service";

/**
 * GET — the inventory, or with ?catalog=1 just what leaders can request
 * (which everyone using the stock screens may see).
 */
export async function GET(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session || !canUseStock(session)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const catalog = new URL(request.url).searchParams.get("catalog") === "1";

        let where: Prisma.StockItemWhereInput;
        if (catalog) where = { requestable: true, archived: false };
        else if (canSeeInventory(session)) where = viewableItemsWhere(session);
        else return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const items = await prisma.stockItem.findMany({
            where,
            include: {
                ...itemInclude,
                _count: { select: { requests: { where: { status: { in: OPEN_REQUEST_STATUSES } } } } },
            },
            orderBy: [{ category: "asc" }, { name: "asc" }],
        });
        // What the group pays at the QG is the storekeeper's business only.
        const storekeeper = isStorekeeper(session);
        return NextResponse.json(items.map(i => ({ ...i, costPrice: storekeeper ? i.costPrice : null, canEdit: canEditItem(session, i) })));
    } catch (error) {
        console.error("Error listing stock:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

/** POST — a new item. Owner and place are checked; the first count is logged. */
export async function POST(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session || !canSeeInventory(session)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const body = await request.json().catch(() => ({}));
        const parsed = await parseItemBody(body, session, true);
        if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
        const data = parsed.data as Prisma.StockItemUncheckedCreateInput;
        if (!canEditItem(session, { unitId: data.unitId ?? null })) {
            return NextResponse.json({ error: "You can only add items owned by your unit" }, { status: 403 });
        }

        const item = await prisma.$transaction(async (tx) => {
            const created = await tx.stockItem.create({ data });
            if (created.quantity) {
                await tx.stockMovement.create({
                    data: { itemId: created.id, delta: created.quantity, quantityAfter: created.quantity, reason: "Initial count", byId: session.userId, byName: session.name },
                });
            }
            return created;
        });
        return NextResponse.json(item);
    } catch (error) {
        console.error("Error creating stock item:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
