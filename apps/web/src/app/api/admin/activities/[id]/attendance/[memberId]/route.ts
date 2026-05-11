import { prisma } from "@/db";
import { getSession, hasPermission, canAccessUnit } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

const ALLOWED_CONFIRMATION = new Set(["CONFIRMED", "NOT_COMING", "PENDING", "PARTIAL", null, ""]);
const ALLOWED_ATTENDED = new Set(["FULLY", "NOT_AT_ALL", "PARTIAL", null, ""]);

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string; memberId: string }> }) {
    try {
        const session = await getSession();
        if (!hasPermission(session, "canManageActivities")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id, memberId } = await params;
        const body = await request.json();

        const activity = await prisma.activity.findUnique({ where: { id } });
        if (!activity) return NextResponse.json({ error: "Activity not found" }, { status: 404 });
        if (!canAccessUnit(session, activity.unitId)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const member = await prisma.member.findUnique({ where: { id: memberId } });
        if (!member) return NextResponse.json({ error: "Member not found" }, { status: 404 });
        if (member.unitId !== activity.unitId) {
            return NextResponse.json({ error: "Member not in this activity's unit" }, { status: 400 });
        }

        if ("confirmation" in body && !ALLOWED_CONFIRMATION.has(body.confirmation)) {
            return NextResponse.json({ error: "Invalid confirmation value" }, { status: 400 });
        }
        if ("attended" in body && !ALLOWED_ATTENDED.has(body.attended)) {
            return NextResponse.json({ error: "Invalid attended value" }, { status: 400 });
        }

        const data = {
            confirmation: body.confirmation ?? null,
            confirmationDays: typeof body.confirmationDays === "number" ? body.confirmationDays : null,
            confirmationReason: body.confirmationReason ?? null,
            confirmationNote: body.confirmationNote ?? null,
            attended: body.attended ?? null,
            attendedDays: typeof body.attendedDays === "number" ? body.attendedDays : null,
            attendanceNote: body.attendanceNote ?? null,
        };

        const record = await prisma.activityAttendance.upsert({
            where: { activityId_memberId: { activityId: id, memberId } },
            create: { activityId: id, memberId, ...data },
            update: data,
        });

        return NextResponse.json(record);
    } catch (error) {
        console.error("Error upserting attendance:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
