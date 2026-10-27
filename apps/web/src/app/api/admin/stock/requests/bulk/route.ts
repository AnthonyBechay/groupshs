import { prisma } from "@/db";
import { getSession } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { LEADER_NEXT, STOREKEEPER_NEXT, type RequestStatus } from "@/lib/stock";
import { canUseStock, isStorekeeper } from "@/lib/stock-access";
import { viewableRequestsWhere } from "@/lib/stock-service";

/**
 * POST { ids, to } — move several requests at once: approve a unit's family
 * orders, mark everything bought at the QG, everything arrived. The storekeeper
 * can take any step; a unit's maîtrise only its own steps (see LEADER_NEXT),
 * and only on requests of units it can access. Requests that cannot make that
 * step are left alone and counted.
 */
export async function POST(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session || !canUseStock(session)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const body = await request.json().catch(() => ({}));
        const ids: string[] = Array.isArray(body.ids) ? body.ids.filter((v: unknown) => typeof v === "string").slice(0, 1000) : [];
        const to = body.to as RequestStatus;
        const rules = isStorekeeper(session) ? STOREKEEPER_NEXT : LEADER_NEXT;
        const from = Object.entries(rules).filter(([, next]) => next.includes(to)).map(([f]) => f);
        if (!ids.length || !from.length) return NextResponse.json({ error: "Nothing to update" }, { status: 400 });

        const res = await prisma.itemRequest.updateMany({
            where: { id: { in: ids }, status: { in: from }, AND: [viewableRequestsWhere(session)] },
            data: { status: to, handledByName: session.name },
        });
        return NextResponse.json({ updated: res.count, skipped: ids.length - res.count });
    } catch (error) {
        console.error("Error bulk-updating requests:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
