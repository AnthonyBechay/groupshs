import { prisma } from "@/db";
import { getSession, hasPermission } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { sanitizeProgramme } from "@/lib/activity-schedule";
import {
    attendanceTotals, canEditActivity, canViewActivity, expectedHeadcounts, findActivityScope,
} from "@/lib/activity-sessions";

/** GET /api/admin/activities/:id — the activity and every one of its sessions. */
export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getSession();
        if (!hasPermission(session, "canManageActivities")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const { id } = await params;
        const activity = await findActivityScope(id);
        if (!activity) return NextResponse.json({ error: "Not found" }, { status: 404 });
        if (!canViewActivity(session, activity)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

        const sessions = await prisma.activitySession.findMany({
            where: { activityId: id },
            orderBy: { date: "asc" },
        });
        const [totals, expected, circulars] = await Promise.all([
            attendanceTotals(sessions.map(s => s.id)),
            expectedHeadcounts(),
            prisma.circular.count({ where: { activityId: id } }),
        ]);
        const headcount = expected(activity.unitId, activity.unit.unitType);

        return NextResponse.json({
            activity: { ...activity, circularCount: circulars },
            canEdit: canEditActivity(session, activity),
            sessions: sessions.map(s => ({
                id: s.id,
                date: s.date,
                status: s.status,
                cancelReason: s.cancelReason,
                programmeCount: sanitizeProgramme(s.programme).length,
                hasNotes: !!s.notes,
                attendance: { ...(totals.get(s.id) ?? { recorded: 0, present: 0 }), expected: headcount },
            })),
        });
    } catch (error) {
        console.error("Error loading activity:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
