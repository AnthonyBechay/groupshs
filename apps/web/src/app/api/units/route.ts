import { prisma } from "@/db";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const units = await prisma.unit.findMany({
            include: { _count: { select: { members: true, activities: true } } },
            orderBy: { name: "asc" },
        });
        return NextResponse.json(units);
    } catch (error) {
        console.error("Error fetching units:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
