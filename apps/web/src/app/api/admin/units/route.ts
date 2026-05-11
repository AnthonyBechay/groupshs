import { prisma } from "@/db";
import { getSession, isAdmin, hasPermission } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
    try {
        const session = await getSession();
        if (!isAdmin(session)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const where = session && !session.isSuperAdmin && session.allowedUnitIds.length > 0
            ? { id: { in: session.allowedUnitIds } }
            : {};

        const units = await prisma.unit.findMany({
            where,
            include: {
                _count: { select: { members: true, activities: true } },
                contacts: {
                    include: {
                        member: { select: { id: true, firstName: true, lastName: true, phone: true, role: true, photoUrl: true } },
                    },
                    orderBy: { sortOrder: "asc" },
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

export async function POST(request: NextRequest) {
    try {
        const session = await getSession();
        // Only super admins can create new units (creating a unit you can't access would be weird)
        if (!session?.isSuperAdmin && !hasPermission(session, "canManageUnits")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        // Non-super-admins with restricted unit access cannot create new units
        if (session && !session.isSuperAdmin && session.allowedUnitIds.length > 0) {
            return NextResponse.json({ error: "Only super admins can create new units" }, { status: 403 });
        }

        const { name, unitType, description, contactName, contactPhone, imageUrl, contactMemberIds } = await request.json();

        if (!name || !unitType) {
            return NextResponse.json({ error: "Name and unit type are required" }, { status: 400 });
        }

        const validTypes = ["LOUVETEAUX", "ECLAIREURS", "ROUTIERS", "GROUP"];
        if (!validTypes.includes(unitType)) {
            return NextResponse.json({ error: "Invalid unit type" }, { status: 400 });
        }

        const unit = await prisma.unit.create({
            data: {
                name,
                unitType,
                description: description || null,
                contactName: contactName || null,
                contactPhone: contactPhone || null,
                imageUrl: imageUrl || null,
                contacts: Array.isArray(contactMemberIds) && contactMemberIds.length > 0
                    ? {
                        create: contactMemberIds.map((memberId: string, i: number) => ({
                            memberId,
                            sortOrder: i,
                        })),
                    }
                    : undefined,
            },
        });
        return NextResponse.json(unit);
    } catch (error) {
        console.error("Error creating unit:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
