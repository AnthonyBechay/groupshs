import { prisma } from "@/db";
import { getSession } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getSession();
        if (!session || session.role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const body = await request.json();

        const updated = await prisma.member.update({
            where: { id },
            data: {
                firstName: body.firstName,
                lastName: body.lastName,
                dateOfBirth: body.dateOfBirth || null,
                phone: body.phone || null,
                role: body.role || null,
                progression: body.progression || null,
                unitId: body.unitId,
            },
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error("Error updating member:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getSession();
        if (!session || session.role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        await prisma.member.delete({ where: { id } });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting member:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
