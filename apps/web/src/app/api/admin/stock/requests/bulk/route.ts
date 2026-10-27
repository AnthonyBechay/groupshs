import { prisma } from "@/db";
import { getSession } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { STOREKEEPER_NEXT, type RequestStatus } from "@/lib/stock";
import { isStorekeeper } from "@/lib/stock-access";

/**
 * POST { ids, to } — move several requests at once: everything approved has
 * been bought at the QG, everything bought has arrived. Requests that cannot
 * make that step (already further along) are left alone and counted.
 */
export async function POST(request: NextRequest) {
    try {
        const session = await getSession();
        if (!isStorekeeper(session)) return NextResponse.json({ error: "Only the storekeeper processes requests" }, { status: 403 });
        const body = await request.json().catch(() => ({}));
        const ids: string[] = Array.isArray(body.ids) ? body.ids.filter((v: unknown) => typeof v === "string").slice(0, 500) : [];
        const to = body.to as RequestStatus;
        const from = Object.entries(STOREKEEPER_NEXT).filter(([, next]) => next.includes(to)).map(([f]) => f);
        if (!ids.length || !from.length) return NextResponse.json({ error: "Nothing to update" }, { status: 400 });

        const res = await prisma.itemRequest.updateMany({
            where: { id: { in: ids }, status: { in: from } },
            data: { status: to, handledByName: session!.name },
        });
        return NextResponse.json({ updated: res.count, skipped: ids.length - res.count });
    } catch (error) {
        console.error("Error bulk-updating requests:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
