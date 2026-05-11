import { prisma } from "@/db";
import { getSession, hasPermission, canAccessUnit } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getSession();
        if (!hasPermission(session, "canManageMembers") && !hasPermission(session, "canManageUnits")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const existing = await prisma.subgroup.findUnique({ where: { id } });
        if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
        if (!canAccessUnit(session, existing.unitId)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const body = await request.json();

        const updated = await prisma.subgroup.update({
            where: { id },
            data: {
                name: body.name,
                description: body.description ?? null,
            },
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error("Error updating subgroup:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getSession();
        if (!hasPermission(session, "canManageMembers") && !hasPermission(session, "canManageUnits")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const existing = await prisma.subgroup.findUnique({ where: { id } });
        if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
        if (!canAccessUnit(session, existing.unitId)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        await prisma.subgroup.delete({ where: { id } });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting subgroup:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
