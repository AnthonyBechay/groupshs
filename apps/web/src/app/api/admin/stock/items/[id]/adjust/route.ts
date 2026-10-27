import { prisma } from "@/db";
import { getSession } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { canEditItem } from "@/lib/stock-access";
import { StockError, moveStock } from "@/lib/stock-service";

/**
 * POST { delta, reason } or { count, reason } — add, remove, or record a fresh
 * count ("we counted 14 pots"). Always logged with who and why.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getSession();
        const { id } = await params;
        const item = await prisma.stockItem.findUnique({ where: { id }, select: { unitId: true, quantity: true } });
        if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
        if (!session || !canEditItem(session, item)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

        const body = await request.json().catch(() => ({}));
        const reason = typeof body.reason === "string" && body.reason.trim() ? body.reason.trim().slice(0, 300) : null;
        let delta: number;
        if (body.count !== undefined) {
            const count = Number(body.count);
            if (!Number.isInteger(count) || count < 0) return NextResponse.json({ error: "A count is a whole number" }, { status: 400 });
            delta = count - item.quantity;
        } else {
            delta = Number(body.delta);
            if (!Number.isInteger(delta) || delta === 0) return NextResponse.json({ error: "Add or remove a whole number" }, { status: 400 });
        }
        if (delta === 0) return NextResponse.json({ quantity: item.quantity });

        const quantity = await prisma.$transaction(tx => moveStock(tx, id, delta, {
            reason: reason ?? (body.count !== undefined ? "Recount" : null), by: session,
        }));
        return NextResponse.json({ quantity });
    } catch (error) {
        if (error instanceof StockError) return NextResponse.json({ error: error.message }, { status: 400 });
        console.error("Error adjusting stock:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
