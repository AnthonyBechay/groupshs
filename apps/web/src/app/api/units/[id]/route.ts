import { prisma } from "@/db";
import { ARCHIVE_UNIT_TYPE } from "@/lib/scout-config";
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
                    where: { status: "ACTIVE" },
                    select: { id: true, firstName: true, lastName: true, role: true, progressions: true },
                    orderBy: { firstName: "asc" },
                },
            },
        });

        // A system unit is "not found" as far as the public is concerned.
        if (!unit || unit.unitType === ARCHIVE_UNIT_TYPE) {
            return NextResponse.json({ error: "Unit not found" }, { status: 404 });
        }

        return NextResponse.json(unit);
    } catch (error) {
        console.error("Error fetching unit:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
