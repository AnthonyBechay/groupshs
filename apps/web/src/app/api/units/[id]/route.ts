import { prisma } from "@/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;

        const unit = await prisma.unit.findUnique({
            where: { id },
            include: {
                activities: {
                    orderBy: { startDate: "desc" },
                },
                members: {
                    select: { id: true, firstName: true, lastName: true, role: true, progression: true },
                    orderBy: { firstName: "asc" },
                },
            },
        });

        if (!unit) {
            return NextResponse.json({ error: "Unit not found" }, { status: 404 });
        }

        return NextResponse.json(unit);
    } catch (error) {
        console.error("Error fetching unit:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
