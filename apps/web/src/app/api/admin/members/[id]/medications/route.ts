import { prisma } from "@/db";
import { getSession, hasPermission, canAccessUnit } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getSession();
        if (!hasPermission(session, "canManageMembers")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const member = await prisma.member.findUnique({ where: { id } });
        if (!member) return NextResponse.json({ error: "Not found" }, { status: 404 });
        if (!canAccessUnit(session, member.unitId)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const body = await request.json();
        const { name, dosage, startDate, endDate, timeToTake } = body;

        if (!name) return NextResponse.json({ error: "Medication name is required" }, { status: 400 });

        const med = await prisma.memberMedication.create({
            data: {
                memberId: id,
                name,
                dosage: dosage || null,
                startDate: startDate || null,
                endDate: endDate || null,
                timeToTake: timeToTake || null,
            },
        });
        return NextResponse.json(med);
    } catch (error) {
        console.error("Error creating medication:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
