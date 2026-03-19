import { prisma } from "@/db";
import { getSession } from "@/lib/auth";
import { deleteFromR2 } from "@/lib/r2";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getSession();
        if (!session || session.role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;

        const photo = await prisma.galleryPhoto.findUnique({ where: { id } });
        if (!photo) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }

        // Delete from R2
        await deleteFromR2(photo.imageUrl).catch(() => {});

        // Delete from DB
        await prisma.galleryPhoto.delete({ where: { id } });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting gallery photo:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
