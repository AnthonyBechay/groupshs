import { prisma } from "@/db";
import { getSession, hashPassword, type SessionUser } from "@/lib/auth";
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

        if ("canManageUnits" in body) data.canManageUnits = !!body.canManageUnits;
        if ("canManageMembers" in body) data.canManageMembers = !!body.canManageMembers;
        if ("canManageActivities" in body) data.canManageActivities = !!body.canManageActivities;
        if ("canManageGallery" in body) data.canManageGallery = !!body.canManageGallery;
        if ("canManagePartners" in body) data.canManagePartners = !!body.canManagePartners;
        if ("canManageSocialLinks" in body) data.canManageSocialLinks = !!body.canManageSocialLinks;
        if ("canManageNews" in body) data.canManageNews = !!body.canManageNews;
        if ("canViewSubmissions" in body) data.canViewSubmissions = !!body.canViewSubmissions;
        if ("canManageSettings" in body) data.canManageSettings = !!body.canManageSettings;
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
