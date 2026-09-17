import { prisma } from "@/db";
import { getSession, hasPermission } from "@/lib/auth";
import { compressImage, MAX_UPLOAD_BYTES, ALLOWED_IMAGE_TYPES } from "@/lib/image";
import { uploadToR2 } from "@/lib/r2";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
    try {
        const session = await getSession();
        if (!hasPermission(session, "canManageGallery")) {
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
        if (!hasPermission(session, "canManageGallery")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const formData = await request.formData();
        const file = formData.get("file") as File | null;
        const caption = formData.get("caption") as string || null;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
            return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
        }

        // Cap before decoding: sharp allocates from the decoded pixel buffer, so
        // an unbounded upload here is a memory spike, not just a slow request.
        if (file.size > MAX_UPLOAD_BYTES) {
            return NextResponse.json(
                { error: `"${file.name}" is too large. Maximum 10MB per photo.` },
                { status: 400 }
            );
        }

        const rawBuffer = Buffer.from(await file.arrayBuffer());
        const { buffer, contentType } = await compressImage(rawBuffer, {
            maxWidth: 1600,
            maxHeight: 1200,
            quality: 80,
        });
        const url = await uploadToR2(buffer, file.name, contentType, "gallery");

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
