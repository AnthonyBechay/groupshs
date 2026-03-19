import { prisma } from "@/db";
import { getSession } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
    try {
        const session = await getSession();
        if (!session || session.role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

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

export async function POST(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session || session.role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { name, unitType } = await request.json();

        if (!name || !unitType) {
            return NextResponse.json({ error: "Name and unit type are required" }, { status: 400 });
        }

        const validTypes = ["LOUVETEAUX", "ECLAIREURS", "ROUTIERS", "CHEFS"];
        if (!validTypes.includes(unitType)) {
            return NextResponse.json({ error: "Invalid unit type" }, { status: 400 });
        }

        const unit = await prisma.unit.create({ data: { name, unitType } });
        return NextResponse.json(unit);
    } catch (error) {
        console.error("Error creating unit:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
