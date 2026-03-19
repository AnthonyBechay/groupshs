import { prisma } from "@/db";
import { getSession } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session || session.role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const unitId = searchParams.get("unitId");

        const where = unitId ? { unitId } : {};

        const members = await prisma.member.findMany({
            where,
            include: { unit: { select: { name: true, unitType: true } } },
            orderBy: { lastName: "asc" },
        });

        return NextResponse.json(members);
    } catch (error) {
        console.error("Error fetching members:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session || session.role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { firstName, lastName, dateOfBirth, phone, role, progression, unitId, joinedAt } = body;

        if (!firstName || !lastName || !unitId) {
            return NextResponse.json({ error: "First name, last name, and unit are required" }, { status: 400 });
        }

        const member = await prisma.member.create({
            data: {
                firstName,
                lastName,
                dateOfBirth: dateOfBirth || null,
                phone: phone || null,
                role: role || null,
                progression: progression || null,
                unitId,
                joinedAt: joinedAt ? new Date(joinedAt) : new Date(),
            },
        });

        return NextResponse.json(member);
    } catch (error) {
        console.error("Error creating member:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
