import { prisma } from "@/db";
import { getSession } from "@/lib/auth";
import { compressImage } from "@/lib/image";
import { uploadToR2 } from "@/lib/r2";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
    try {
        const session = await getSession();
        if (!session || session.role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const partners = await prisma.partner.findMany({ orderBy: { sortOrder: "asc" } });
        return NextResponse.json(partners);
    } catch (error) {
        console.error("Error fetching partners:", error);
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
        const name = formData.get("name") as string;
        const websiteUrl = (formData.get("websiteUrl") as string) || null;

        if (!file || !name) {
            return NextResponse.json({ error: "Name and logo file are required" }, { status: 400 });
        }

        const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"];
        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
        }

        const rawBuffer = Buffer.from(await file.arrayBuffer()) as Buffer<ArrayBuffer>;
        let uploadBuffer: Buffer<ArrayBuffer> = rawBuffer;
        let uploadContentType = file.type;

        if (file.type !== "image/svg+xml") {
            const compressed = await compressImage(rawBuffer, { maxWidth: 400, maxHeight: 400, quality: 85 });
            uploadBuffer = compressed.buffer as Buffer<ArrayBuffer>;
            uploadContentType = compressed.contentType;
        }

        const logoUrl = await uploadToR2(uploadBuffer, file.name, uploadContentType, "partners");

        const last = await prisma.partner.findFirst({ orderBy: { sortOrder: "desc" } });
        const sortOrder = (last?.sortOrder ?? -1) + 1;

        const partner = await prisma.partner.create({
            data: { name, logoUrl, websiteUrl, sortOrder },
        });

        return NextResponse.json(partner);
    } catch (error) {
        console.error("Error creating partner:", error);
        return NextResponse.json({ error: "Failed to create partner" }, { status: 500 });
    }
}
