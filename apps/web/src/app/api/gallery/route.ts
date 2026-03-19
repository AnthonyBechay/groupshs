import { prisma } from "@/db";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const photos = await prisma.galleryPhoto.findMany({
            orderBy: { sortOrder: "asc" },
        });
        return NextResponse.json(photos);
    } catch (error) {
        console.error("Error fetching gallery:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
