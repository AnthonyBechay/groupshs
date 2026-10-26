import { prisma } from "@/db";
import { getSession, hasPermission } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { toDay, dayKey } from "@/lib/activity-schedule";
import { canEditActivity, findActivityScope, syncActivitySessions } from "@/lib/activity-sessions";

/**
 * POST { lastDate } — stop a weekly series: nothing after lastDate.
 *
 * Sessions after it that were never used disappear; any that already have a
 * programme or attendance are kept as cancelled (see syncActivitySessions).
 * Ending it before its first session is refused: delete or hide it instead.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getSession();
        if (!hasPermission(session, "canManageActivities")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const { id } = await params;
        const activity = await findActivityScope(id);
        if (!activity) return NextResponse.json({ error: "Not found" }, { status: 404 });
        if (!canEditActivity(session, activity)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        if (!activity.recurrence) return NextResponse.json({ error: "This activity does not repeat" }, { status: 400 });

        const { lastDate } = await request.json();
        if (!lastDate) return NextResponse.json({ error: "Pick the last date" }, { status: 400 });
        const last = toDay(lastDate);
        if (last < toDay(activity.startDate)) {
            return NextResponse.json({ error: "That is before the first session" }, { status: 400 });
        }
        if (activity.recurrenceUntil && last >= toDay(activity.recurrenceUntil)) {
            return NextResponse.json({ error: `The series already ends on ${dayKey(activity.recurrenceUntil)}` }, { status: 400 });
        }

        await prisma.$transaction(async (tx) => {
            await tx.activity.update({ where: { id }, data: { recurrenceUntil: last } });
            await syncActivitySessions(tx, id);
        });
        return NextResponse.json({ ok: true, recurrenceUntil: last });
    } catch (error) {
        console.error("Error ending series:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
