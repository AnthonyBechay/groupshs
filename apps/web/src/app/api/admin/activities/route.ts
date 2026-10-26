import { prisma } from "@/db";
import { getSession, hasPermission } from "@/lib/auth";
import { NextResponse } from "next/server";
import { canEditActivity, viewableActivitiesWhere } from "@/lib/activity-sessions";
import { toDay } from "@/lib/activity-schedule";

/**
 * GET /api/admin/activities — every activity the user may see, hidden ones
 * included, each with a summary of its sessions (how many, the next one).
 */
export async function GET() {
    try {
        const session = await getSession();
        if (!hasPermission(session, "canManageActivities")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const today = toDay(new Date());

        const activities = await prisma.activity.findMany({
            where: viewableActivitiesWhere(session),
            include: {
                unit: { select: { id: true, name: true, unitType: true, imageUrl: true } },
                sessions: {
                    select: { id: true, date: true, status: true },
                    orderBy: { date: "asc" },
                },
                _count: { select: { circulars: true } },
            },
            orderBy: { startDate: "desc" },
        });

        return NextResponse.json(activities.map(({ sessions, ...a }) => {
            const live = sessions.filter(s => s.status !== "CANCELLED");
            const next = live.find(s => s.date >= today) ?? null;
            return {
                ...a,
                canEdit: canEditActivity(session, a),
                sessionSummary: {
                    total: sessions.length,
                    cancelled: sessions.length - live.length,
                    past: live.filter(s => s.date < today).length,
                    nextSessionId: next?.id ?? null,
                    nextDate: next?.date ?? null,
                    // Where "Attendance" should land: the next session, else the latest one.
                    focusSessionId: next?.id ?? sessions.at(-1)?.id ?? null,
                },
            };
        }));
    } catch (error) {
        console.error("Error listing admin activities:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
