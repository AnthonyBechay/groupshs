import { prisma } from "@/db";
import { getSession } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { canUseStock, canRequestFor } from "@/lib/stock-access";
import { stepsFor, viewableRequestsWhere } from "@/lib/stock-service";

/**
 * POST — several requests at once. Requests this user may not change that way
 * are left alone and counted as skipped.
 *   { ids, to }           a status step: approve a unit's family orders, mark the
 *                         whole QG list bought, hand everything over. Each request
 *                         is checked with stepsFor(), so a shopper marking all
 *                         bought never approves anything on the way.
 *   { ids, paid }         paid / not paid — the unit's leaders
 *   { ids, memberId }     attach them to a scout (one person's order) — the unit's leaders
 */
export async function POST(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session || !canUseStock(session)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const body = await request.json().catch(() => ({}));
        const ids: string[] = Array.isArray(body.ids) ? body.ids.filter((v: unknown) => typeof v === "string").slice(0, 1000) : [];
        if (!ids.length) return NextResponse.json({ error: "Nothing to update" }, { status: 400 });

        const rows = await prisma.itemRequest.findMany({
            where: { id: { in: ids }, AND: [viewableRequestsWhere(session)] },
            select: { id: true, unitId: true, status: true },
        });

        if (typeof body.to === "string") {
            const ok = rows.filter(r => stepsFor(session, r).includes(body.to as never)).map(r => r.id);
            // The status filter keeps a request moved meanwhile from jumping a step.
            const res = ok.length ? await prisma.itemRequest.updateMany({
                where: { id: { in: ok }, status: { in: [...new Set(rows.filter(r => ok.includes(r.id)).map(r => r.status))] } },
                data: { status: body.to, handledByName: session.name },
            }) : { count: 0 };
            return NextResponse.json({ updated: res.count, skipped: ids.length - res.count });
        }

        const own = rows.filter(r => canRequestFor(session, r.unitId) && !["REJECTED", "CANCELLED"].includes(r.status));

        if (typeof body.paid === "boolean") {
            const res = await prisma.itemRequest.updateMany({
                where: { id: { in: own.map(r => r.id) } },
                data: { paid: body.paid, paidAt: body.paid ? new Date() : null },
            });
            return NextResponse.json({ updated: res.count, skipped: ids.length - res.count });
        }

        if ("memberId" in body) {
            const memberId = typeof body.memberId === "string" && body.memberId ? body.memberId : null;
            const units = [...new Set(own.map(r => r.unitId))];
            if (units.length > 1) return NextResponse.json({ error: "These requests are for different units" }, { status: 400 });
            if (memberId && units.length) {
                const member = await prisma.member.findFirst({
                    where: { id: memberId, status: "ACTIVE", OR: [{ unitId: units[0] }, { servesUnitId: units[0] }] },
                    select: { id: true },
                });
                if (!member) return NextResponse.json({ error: "Pick a scout of this unit" }, { status: 400 });
            }
            const res = await prisma.itemRequest.updateMany({ where: { id: { in: own.map(r => r.id) } }, data: { memberId } });
            return NextResponse.json({ updated: res.count, skipped: ids.length - res.count });
        }

        return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    } catch (error) {
        console.error("Error bulk-updating requests:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
