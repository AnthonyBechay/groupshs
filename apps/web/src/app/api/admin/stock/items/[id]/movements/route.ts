import { prisma } from "@/db";
import { getSession } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { canSeeInventory, isStorekeeper } from "@/lib/stock-access";
import { canAccessUnit } from "@/lib/auth";

/** GET — the last changes of quantity for one item. */
export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getSession();
    const { id } = await params;
    const item = await prisma.stockItem.findUnique({ where: { id }, select: { unitId: true } });
    if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const visible = !!session && canSeeInventory(session)
        && (isStorekeeper(session) || !item.unitId || canAccessUnit(session, item.unitId));
    if (!visible) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const rows = await prisma.stockMovement.findMany({ where: { itemId: id }, orderBy: { createdAt: "desc" }, take: 50 });
    return NextResponse.json(rows);
}
