import { prisma } from "@/db";
import { getSession, hasPermission, canAccessUnit } from "@/lib/auth";
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
        await prisma.unit.delete({ where: { id } });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting unit:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
