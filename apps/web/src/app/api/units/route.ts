import { prisma } from "@/db";
import { VISIBLE_UNITS_WHERE } from "@/lib/scout-config";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const units = await prisma.unit.findMany({
            // Public endpoint: system units must never be exposed here.
            where: VISIBLE_UNITS_WHERE,
            include: {
                _count: {
                    select: {
                        members: { where: { status: "ACTIVE" } },
                        activities: true,
                    },
                },
            },
            orderBy: { name: "asc" },
        });
        return NextResponse.json(units);
    } catch (error) {
        console.error("Error fetching units:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
