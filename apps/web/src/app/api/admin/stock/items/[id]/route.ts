import { prisma } from "@/db";
import { getSession } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { canEditItem, isStorekeeper } from "@/lib/stock-access";
import { parseItemBody } from "@/lib/stock-service";

type Params = { params: Promise<{ id: string }> };

/**
 * PATCH — edit an item. Quantity is NOT changed here (that goes through
 * /adjust, so it is logged). Moving it to another owner needs rights on both.
 */
export async function PATCH(request: NextRequest, { params }: Params) {
    try {
        const session = await getSession();
        const { id } = await params;
        const item = await prisma.stockItem.findUnique({ where: { id }, select: { unitId: true } });
        if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
        if (!session || !canEditItem(session, item)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

        const body = await request.json().catch(() => ({}));
        delete body.quantity;
        const parsed = await parseItemBody(body, session, false);
        if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
        if ("unitId" in parsed.data && !canEditItem(session, { unitId: (parsed.data.unitId as string | null) ?? null })) {
            return NextResponse.json({ error: "You can only give items to a unit you look after" }, { status: 403 });
        }
        const updated = await prisma.stockItem.update({ where: { id }, data: parsed.data });
        return NextResponse.json(updated);
    } catch (error) {
        console.error("Error updating stock item:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

/** DELETE — only an item nobody ever requested; otherwise archive it. */
export async function DELETE(_: NextRequest, { params }: Params) {
    try {
        const session = await getSession();
        const { id } = await params;
        const item = await prisma.stockItem.findUnique({ where: { id }, select: { unitId: true, _count: { select: { requests: true } } } });
        if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
        if (!session || !(isStorekeeper(session) || canEditItem(session, item))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        if (item._count.requests > 0) {
            return NextResponse.json({ error: "This item has requests on record. Archive it instead, so their history stays." }, { status: 409 });
        }
        await prisma.stockItem.delete({ where: { id } });
        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error("Error deleting stock item:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
