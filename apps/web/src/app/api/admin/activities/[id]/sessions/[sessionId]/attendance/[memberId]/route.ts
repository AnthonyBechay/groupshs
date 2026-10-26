import { prisma } from "@/db";
import { getSession, hasPermission } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { activityRoster, canViewActivity, findActivityScope } from "@/lib/activity-sessions";

const ALLOWED_CONFIRMATION = new Set(["CONFIRMED", "NOT_COMING", "PENDING", "PARTIAL", null, ""]);
const ALLOWED_ATTENDED = new Set(["FULLY", "NOT_AT_ALL", "PARTIAL", null, ""]);

type Params = { params: Promise<{ id: string; sessionId: string; memberId: string }> };

/** PUT — one member's record for one session. */
export async function PUT(request: NextRequest, { params }: Params) {
    try {
        const session = await getSession();
        if (!hasPermission(session, "canManageActivities")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id, sessionId, memberId } = await params;
        const body = await request.json();

        const [activity, s] = await Promise.all([
            findActivityScope(id),
            prisma.activitySession.findFirst({ where: { id: sessionId, activityId: id } }),
        ]);
        if (!activity || !s) return NextResponse.json({ error: "Not found" }, { status: 404 });
        if (!canViewActivity(session, activity)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

        // The roster already encodes who belongs here AND who this user may
        // see, so it is the single check: a CT marking the group camp can only
        // touch his own unit's children.
        const roster = await activityRoster(session, activity);
        if (!roster.some(m => m.id === memberId)) {
            return NextResponse.json({ error: "This member is not on this activity's list" }, { status: 400 });
        }

        if ("confirmation" in body && !ALLOWED_CONFIRMATION.has(body.confirmation)) {
            return NextResponse.json({ error: "Invalid confirmation value" }, { status: 400 });
        }
        if ("attended" in body && !ALLOWED_ATTENDED.has(body.attended)) {
            return NextResponse.json({ error: "Invalid attended value" }, { status: 400 });
        }

        const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim().slice(0, 500) : null);
        const data = {
            confirmation: body.confirmation || null,
            confirmationDays: typeof body.confirmationDays === "number" ? body.confirmationDays : null,
            confirmationReason: str(body.confirmationReason),
            confirmationNote: str(body.confirmationNote),
            attended: body.attended || null,
            attendedDays: typeof body.attendedDays === "number" ? body.attendedDays : null,
            attendanceNote: str(body.attendanceNote),
        };

        const record = await prisma.activityAttendance.upsert({
            where: { sessionId_memberId: { sessionId, memberId } },
            create: { activityId: id, sessionId, memberId, ...data },
            update: data,
        });

        return NextResponse.json(record);
    } catch (error) {
        console.error("Error upserting attendance:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
