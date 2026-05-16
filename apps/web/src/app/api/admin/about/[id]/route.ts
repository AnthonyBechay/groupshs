import { prisma } from "@/db";
import { getSession, hasPermission } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getSession();
        if (!hasPermission(session, "canManageSettings")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const { id } = await params;
        const body = await request.json();

        const updated = await prisma.aboutSection.update({
            where: { id },
            data: {
                year: typeof body.year === "number" ? body.year : null,
                dateLabel: body.dateLabel ?? null,
                title: body.title,
                description: body.description ?? null,
                imageUrl: body.imageUrl ?? null,
            },
        });
        return NextResponse.json(updated);
    } catch (error) {
        console.error("Error updating about section:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getSession();
        if (!hasPermission(session, "canManageSettings")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const { id } = await params;
        await prisma.aboutSection.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting about section:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
