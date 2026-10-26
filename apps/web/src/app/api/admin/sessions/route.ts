import { prisma } from "@/db";
import { getSession, hasPermission } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
import { toDay, sanitizeProgramme } from "@/lib/activity-schedule";
import { attendanceTotals, canEditActivity, expectedHeadcounts, viewableActivitiesWhere } from "@/lib/activity-sessions";

/**
 * GET /api/admin/sessions?from=YYYY-MM-DD&to=YYYY-MM-DD[&unitId=…]
 *
 * Every session in the range, for the agenda and the calendar. With a unitId,
 * that unit's sessions plus the group-wide ones its members attend.
 */
export async function GET(request: NextRequest) {
    try {
        const session = await getSession();
        if (!hasPermission(session, "canManageActivities")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const sp = new URL(request.url).searchParams;
        const from = sp.get("from"), to = sp.get("to"), unitId = sp.get("unitId");
        if (!from || !to) return NextResponse.json({ error: "from and to are required" }, { status: 400 });

        const activityWhere: Prisma.ActivityWhereInput = { AND: [viewableActivitiesWhere(session)] };
        if (unitId) {
            (activityWhere.AND as Prisma.ActivityWhereInput[]).push({
                OR: [{ unitId }, { unit: { unitType: "ALL" } }],
            });
        }
        if (sp.get("includeHidden") !== "true") activityWhere.hidden = false;

        const sessions = await prisma.activitySession.findMany({
            where: { date: { gte: toDay(from), lte: toDay(to) }, activity: activityWhere },
            include: {
                activity: {
                    select: {
                        id: true, title: true, activityType: true, recurrence: true, hidden: true,
                        dropoffTime: true, pickupTime: true, location: true, endDate: true, startDate: true,
                        unitId: true, unit: { select: { id: true, name: true, unitType: true } },
                    },
                },
            },
            orderBy: [{ date: "asc" }],
            take: 1000,
        });

        const [totals, expected] = await Promise.all([
            attendanceTotals(sessions.map(s => s.id)),
            expectedHeadcounts(),
        ]);

        return NextResponse.json(sessions.map(s => ({
            id: s.id,
            date: s.date,
            status: s.status,
            cancelReason: s.cancelReason,
            programmeCount: sanitizeProgramme(s.programme).length,
            activity: s.activity,
            canEdit: canEditActivity(session, s.activity),
            attendance: {
                ...(totals.get(s.id) ?? { recorded: 0, present: 0 }),
                expected: expected(s.activity.unitId, s.activity.unit.unitType),
            },
        })));
    } catch (error) {
        console.error("Error listing sessions:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
