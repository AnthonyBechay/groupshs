import { prisma } from "@/db";
import { getSession } from "@/lib/auth";
import { uploadToR2 } from "@/lib/r2";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
    try {
        const session = await getSession();
        if (!session || session.role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const photos = await prisma.galleryPhoto.findMany({
            orderBy: { sortOrder: "asc" },
        });
        return NextResponse.json(photos);
    } catch (error) {
        console.error("Error fetching gallery:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session || session.role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const formData = await request.formData();
        const file = formData.get("file") as File | null;
        const caption = formData.get("caption") as string || null;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const url = await uploadToR2(buffer, file.name, file.type, "gallery");

        // Get max sort order
        const last = await prisma.galleryPhoto.findFirst({ orderBy: { sortOrder: "desc" } });
        const sortOrder = (last?.sortOrder ?? -1) + 1;

        const photo = await prisma.galleryPhoto.create({
            data: { imageUrl: url, caption, sortOrder },
        });

        return NextResponse.json(photo);
    } catch (error) {
        console.error("Error uploading gallery photo:", error);
        return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }
}
