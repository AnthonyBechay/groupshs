import { prisma } from "@/db";
import { getSession } from "@/lib/auth";
import { deleteFromR2 } from "@/lib/r2";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getSession();
        if (!session || session.role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const body = await request.json();

        const updated = await prisma.partner.update({
            where: { id },
            data: {
                name: body.name,
                description: body.description ?? null,
                websiteUrl: body.websiteUrl ?? null,
                sortOrder: body.sortOrder ?? undefined,
            },
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error("Error updating partner:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getSession();
        if (!session || session.role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const partner = await prisma.partner.findUnique({ where: { id } });
        if (partner) {
            await deleteFromR2(partner.logoUrl).catch(() => {});
        }
        await prisma.partner.delete({ where: { id } });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting partner:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
