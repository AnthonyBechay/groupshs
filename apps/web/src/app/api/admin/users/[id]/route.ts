import { prisma } from "@/db";
import { getSession, hashPassword, PERMISSION_KEYS, type SessionUser } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

function requireSuperAdmin(session: SessionUser | null) {
    return session?.isSuperAdmin === true;
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getSession();
        if (!requireSuperAdmin(session)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const body = await request.json();

        const target = await prisma.user.findUnique({ where: { id } });
        if (!target) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const data: Record<string, unknown> = {};
        if (typeof body.name === "string") data.name = body.name;
        if (typeof body.email === "string") data.email = body.email;
        if (typeof body.role === "string") data.role = body.role;
        if (body.password) data.password = await hashPassword(body.password);
        // Driven by PERMISSION_KEYS so a new permission cannot be missed.
        for (const key of PERMISSION_KEYS) {
            if (key in body) data[key] = body[key] === true;
        }
        if (Array.isArray(body.allowedUnitIds)) data.allowedUnitIds = body.allowedUnitIds;

        const updated = await prisma.user.update({
            where: { id },
            data,
            select: { id: true, name: true, email: true, role: true },
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error("Error updating user:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getSession();
        if (!requireSuperAdmin(session)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;

        if (id === session?.userId) {
            return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
        }

        const target = await prisma.user.findUnique({ where: { id } });
        if (target?.role === "super_admin") {
            return NextResponse.json({ error: "Cannot delete super admin" }, { status: 400 });
        }

        await prisma.user.delete({ where: { id } });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting user:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
