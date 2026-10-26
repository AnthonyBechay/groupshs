import { prisma } from "@/db";
import { getSession, hasPermission } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { ATTENDED_VALUES } from "@/lib/activity-schedule";
import { activityRoster, canViewActivity, findActivityScope } from "@/lib/activity-sessions";

type Params = { params: Promise<{ id: string; sessionId: string }> };

/** GET — who is expected at this session and what has been recorded. */
export async function GET(_: NextRequest, { params }: Params) {
    try {
        const session = await getSession();
        if (!hasPermission(session, "canManageActivities")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const { id, sessionId } = await params;
        const [activity, s] = await Promise.all([
            findActivityScope(id),
            prisma.activitySession.findFirst({ where: { id: sessionId, activityId: id } }),
        ]);
        if (!activity || !s) return NextResponse.json({ error: "Not found" }, { status: 404 });
        if (!canViewActivity(session, activity)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

        const members = await activityRoster(session, activity);
        const records = await prisma.activityAttendance.findMany({
            where: { sessionId, memberId: { in: members.map(m => m.id) } },
        });
        return NextResponse.json({ members, records });
    } catch (error) {
        console.error("Error fetching attendance:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

/**
 * POST — mark several members at once ("everyone present"): { memberIds, attended }.
 * Only members this user may see are touched; the rest are ignored.
 */
export async function POST(request: NextRequest, { params }: Params) {
    try {
        const session = await getSession();
        if (!hasPermission(session, "canManageActivities")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const { id, sessionId } = await params;
        const [activity, s] = await Promise.all([
            findActivityScope(id),
            prisma.activitySession.findFirst({ where: { id: sessionId, activityId: id } }),
        ]);
        if (!activity || !s) return NextResponse.json({ error: "Not found" }, { status: 404 });
        if (!canViewActivity(session, activity)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

        const body = await request.json();
        if (!(ATTENDED_VALUES as readonly string[]).includes(body.attended)) {
            return NextResponse.json({ error: "Invalid attendance value" }, { status: 400 });
        }
        const wanted = new Set<string>(Array.isArray(body.memberIds) ? body.memberIds : []);
        const roster = (await activityRoster(session, activity)).filter(m => wanted.has(m.id));

        await prisma.$transaction(roster.map(m => prisma.activityAttendance.upsert({
            where: { sessionId_memberId: { sessionId, memberId: m.id } },
            create: { activityId: id, sessionId, memberId: m.id, attended: body.attended },
            update: { attended: body.attended, attendedDays: null },
        })));

        const records = await prisma.activityAttendance.findMany({
            where: { sessionId, memberId: { in: roster.map(m => m.id) } },
        });
        return NextResponse.json({ updated: roster.length, records, skipped: wanted.size - roster.length });
    } catch (error) {
        console.error("Error bulk-marking attendance:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
