import { prisma } from "@/db";
import { getSession, hasPermission } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getSession();
        if (!hasPermission(session, "canManageHistory")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const body = await request.json();
        const { name, lastRole, yearsActive, photoUrl, bio } = body;

        if (!name || !lastRole) {
            return NextResponse.json({ error: "Name and last role are required" }, { status: 400 });
        }

        const ancien = await prisma.ancien.update({
            where: { id },
            data: {
                name,
                lastRole,
                yearsActive: yearsActive || null,
                photoUrl: photoUrl || null,
                bio: bio || null,
            },
        });

        return NextResponse.json(ancien);
    } catch (error) {
        console.error("Error updating ancien:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getSession();
        if (!hasPermission(session, "canManageHistory")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        await prisma.ancien.delete({ where: { id } });

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error("Error deleting ancien:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
