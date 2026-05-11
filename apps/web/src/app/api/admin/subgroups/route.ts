import { prisma } from "@/db";
import { getSession, isAdmin, hasPermission, canAccessUnit } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    try {
        const session = await getSession();
        if (!isAdmin(session)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const unitId = searchParams.get("unitId");

        const where: Record<string, unknown> = {};
        if (unitId) where.unitId = unitId;
        if (session && !session.isSuperAdmin && session.allowedUnitIds.length > 0) {
            where.unitId = unitId
                ? (session.allowedUnitIds.includes(unitId) ? unitId : "__none__")
                : { in: session.allowedUnitIds };
        }

        const subgroups = await prisma.subgroup.findMany({
            where,
            include: {
                unit: { select: { id: true, name: true, unitType: true } },
                _count: { select: { members: true } },
            },
            orderBy: { name: "asc" },
        });

        return NextResponse.json(subgroups);
    } catch (error) {
        console.error("Error fetching subgroups:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await getSession();
        if (!hasPermission(session, "canManageMembers") && !hasPermission(session, "canManageUnits")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { name, description, unitId } = body;

        if (!name || !unitId) {
            return NextResponse.json({ error: "Name and unit are required" }, { status: 400 });
        }

        if (!canAccessUnit(session, unitId)) {
            return NextResponse.json({ error: "Forbidden: not your unit" }, { status: 403 });
        }

        const subgroup = await prisma.subgroup.create({
            data: { name, description: description || null, unitId },
        });

        return NextResponse.json(subgroup);
    } catch (error) {
        console.error("Error creating subgroup:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
