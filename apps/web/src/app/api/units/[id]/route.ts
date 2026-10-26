import { prisma } from "@/db";
import { ARCHIVE_UNIT_TYPE, PUBLIC_ACTIVITY_WHERE } from "@/lib/scout-config";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;

        const unit = await prisma.unit.findUnique({
            where: { id },
            // Public endpoint: only what the public site shows. It used to send
            // hidden activities and the full roster of children's names.
            include: {
                activities: {
                    where: PUBLIC_ACTIVITY_WHERE,
                    orderBy: { startDate: "desc" },
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
