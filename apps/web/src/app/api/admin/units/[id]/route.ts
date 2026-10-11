import { prisma } from "@/db";
import { getSession, hasPermission, canAccessUnit } from "@/lib/auth";
import { ASSIGNABLE_UNIT_TYPES, ARCHIVE_UNIT_TYPE, unitHoldsMembers } from "@/lib/scout-config";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getSession();
        if (!hasPermission(session, "canManageUnits")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        if (!canAccessUnit(session, id)) {
            return NextResponse.json({ error: "Forbidden: not your unit" }, { status: 403 });
        }

        const body = await request.json();
        const { name, unitType, description, contactName, contactPhone, imageUrl, contactMemberIds } = body;

        if (!name || !unitType) {
            return NextResponse.json({ error: "Name and unit type are required" }, { status: 400 });
        }
        if (!ASSIGNABLE_UNIT_TYPES.includes(unitType)) {
            return NextResponse.json({ error: "Invalid unit type" }, { status: 400 });
        }

        const current = await prisma.unit.findUnique({ where: { id }, select: { unitType: true } });
        if (!current) return NextResponse.json({ error: "Unit not found" }, { status: 404 });
        if (current.unitType === ARCHIVE_UNIT_TYPE) {
            return NextResponse.json({ error: "This is a system unit and cannot be edited" }, { status: 403 });
        }
        // Turning a unit into an activities-only one would strand its roster.
        if (!unitHoldsMembers(unitType)) {
            const active = await prisma.member.count({ where: { unitId: id, status: "ACTIVE" } });
            if (active > 0) {
                return NextResponse.json(
                    { error: `This unit has ${active} active member${active !== 1 ? "s" : ""}. Move them to another unit before making it activities-only.` },
                    { status: 409 }
                );
            }
        }

        const updated = await prisma.$transaction(async (tx) => {
            const u = await tx.unit.update({
                where: { id },
                data: {
                    name,
                    unitType,
                    description: description || null,
                    contactName: contactName || null,
                    contactPhone: contactPhone || null,
                    imageUrl: imageUrl !== undefined ? (imageUrl || null) : undefined,
                },
            });

            if (Array.isArray(contactMemberIds)) {
                await tx.unitContact.deleteMany({ where: { unitId: id } });
                if (contactMemberIds.length > 0) {
                    await tx.unitContact.createMany({
                        data: contactMemberIds.map((memberId: string, i: number) => ({
                            unitId: id,
                            memberId,
                            sortOrder: i,
                        })),
                    });
                }
            }

            return u;
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error("Error updating unit:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getSession();
        // Only super admins can delete units
        if (!session?.isSuperAdmin) {
            return NextResponse.json({ error: "Only super admins can delete units" }, { status: 403 });
        }

        const { id } = await params;

        const target = await prisma.unit.findUnique({ where: { id }, select: { unitType: true } });
        if (target?.unitType === ARCHIVE_UNIT_TYPE) {
            return NextResponse.json({ error: "This is a system unit and cannot be deleted" }, { status: 403 });
        }

        // Explain precisely why a delete is blocked rather than letting the
        // foreign key blow up as a 500. Departed members still hold a unitId,
        // so they count here even though rosters hide them.
        const [activeMembers, departedMembers, activities] = await Promise.all([
            prisma.member.count({ where: { unitId: id, status: "ACTIVE" } }),
            prisma.member.count({ where: { unitId: id, status: { not: "ACTIVE" } } }),
            prisma.activity.count({ where: { unitId: id } }),
        ]);

        if (activeMembers || departedMembers || activities) {
            const parts: string[] = [];
            if (activeMembers) parts.push(`${activeMembers} member${activeMembers !== 1 ? "s" : ""}`);
            if (departedMembers) parts.push(`${departedMembers} former member${departedMembers !== 1 ? "s" : ""}`);
            if (activities) parts.push(`${activities} activit${activities !== 1 ? "ies" : "y"}`);
            return NextResponse.json(
                { error: `This unit still has ${parts.join(", ")}. Move or remove them first.` },
                { status: 409 }
            );
        }

        await prisma.unit.delete({ where: { id } });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting unit:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
