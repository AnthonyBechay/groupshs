import { prisma } from "@/db";
import { getSession, hasPermission, canAccessUnit } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getSession();
        if (!hasPermission(session, "canManageActivities")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const activity = await prisma.activity.findUnique({
            where: { id },
            include: { unit: { select: { id: true, name: true, unitType: true } } },
        });
        if (!activity) return NextResponse.json({ error: "Not found" }, { status: 404 });
        if (!canAccessUnit(session, activity.unitId)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const [members, records] = await Promise.all([
            prisma.member.findMany({
                where: { unitId: activity.unitId },
                include: { subgroup: { select: { id: true, name: true } } },
                orderBy: [{ subgroupId: "asc" }, { lastName: "asc" }, { firstName: "asc" }],
            }),
            prisma.activityAttendance.findMany({ where: { activityId: id } }),
        ]);

        return NextResponse.json({ activity, members, records });
    } catch (error) {
        console.error("Error fetching attendance:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
