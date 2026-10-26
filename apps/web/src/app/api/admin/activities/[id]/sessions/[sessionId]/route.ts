import { prisma } from "@/db";
import { getSession, hasPermission } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
import { sanitizeProgramme } from "@/lib/activity-schedule";
import { canEditActivity, canViewActivity, findActivityScope } from "@/lib/activity-sessions";

type Params = { params: Promise<{ id: string; sessionId: string }> };

async function load(params: Params["params"]) {
    const { id, sessionId } = await params;
    const [activity, s] = await Promise.all([
        findActivityScope(id),
        prisma.activitySession.findFirst({ where: { id: sessionId, activityId: id } }),
    ]);
    return { activity, s };
}

/** GET — one session with its programme, plus its neighbours for prev/next. */
export async function GET(_: NextRequest, { params }: Params) {
    try {
        const session = await getSession();
        if (!hasPermission(session, "canManageActivities")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const { activity, s } = await load(params);
        if (!activity || !s) return NextResponse.json({ error: "Not found" }, { status: 404 });
        if (!canViewActivity(session, activity)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

        const [prev, next] = await Promise.all([
            prisma.activitySession.findFirst({
                where: { activityId: activity.id, date: { lt: s.date } },
                orderBy: { date: "desc" },
                select: { id: true, date: true, programme: true },
            }),
            prisma.activitySession.findFirst({
                where: { activityId: activity.id, date: { gt: s.date } },
                orderBy: { date: "asc" },
                select: { id: true, date: true },
            }),
        ]);

        return NextResponse.json({
            activity,
            canEdit: canEditActivity(session, activity),
            session: { ...s, programme: sanitizeProgramme(s.programme) },
            prev: prev && { id: prev.id, date: prev.date, programme: sanitizeProgramme(prev.programme) },
            next,
        });
    } catch (error) {
        console.error("Error loading session:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

/**
 * PATCH — the programme and notes of this session, or cancel / restore it.
 * Writing needs edit rights on the activity: a CT can read the group camp's
 * programme but not rewrite it.
 */
export async function PATCH(request: NextRequest, { params }: Params) {
    try {
        const session = await getSession();
        if (!hasPermission(session, "canManageActivities")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const { activity, s } = await load(params);
        if (!activity || !s) return NextResponse.json({ error: "Not found" }, { status: 404 });
        if (!canEditActivity(session, activity)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

        const body = await request.json();
        const data: Prisma.ActivitySessionUpdateInput = {};
        if ("programme" in body) data.programme = sanitizeProgramme(body.programme);
        if ("notes" in body) data.notes = typeof body.notes === "string" && body.notes.trim() ? body.notes.trim().slice(0, 5000) : null;
        if ("status" in body) {
            if (body.status !== "SCHEDULED" && body.status !== "CANCELLED") {
                return NextResponse.json({ error: "Invalid status" }, { status: 400 });
            }
            data.status = body.status;
            data.cancelReason = body.status === "CANCELLED"
                ? (typeof body.cancelReason === "string" && body.cancelReason.trim() ? body.cancelReason.trim().slice(0, 300) : null)
                : null;
        }

        const updated = await prisma.activitySession.update({ where: { id: s.id }, data });
        return NextResponse.json({ ...updated, programme: sanitizeProgramme(updated.programme) });
    } catch (error) {
        console.error("Error updating session:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
