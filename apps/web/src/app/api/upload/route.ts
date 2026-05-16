import { getSession } from "@/lib/auth";
import { compressImage, hasTransparency } from "@/lib/image";
import { uploadToR2 } from "@/lib/r2";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        const session = await getSession();
        if (!session || (session.role !== "admin" && session.role !== "super_admin")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const formData = await request.formData();
        const file = formData.get("file") as File | null;
        const explicitPreserveAlpha = formData.get("preserveAlpha") === "true";

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"];
        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json({ error: "Invalid file type. Allowed: JPEG, PNG, WebP, GIF, SVG" }, { status: 400 });
        }

        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
            return NextResponse.json({ error: "File too large. Max 10MB" }, { status: 400 });
        }

        const rawBuffer = Buffer.from(await file.arrayBuffer());

        // SVGs go through untouched
        if (file.type === "image/svg+xml") {
            const url = await uploadToR2(rawBuffer as Buffer<ArrayBuffer>, file.name, file.type);
            return NextResponse.json({ url });
        }

        // Auto-preserve alpha if the source has transparency, or the caller asked explicitly
        const preserveAlpha = explicitPreserveAlpha || await hasTransparency(rawBuffer);

        const { buffer, contentType } = await compressImage(rawBuffer, {
            maxWidth: 1600,
            maxHeight: 1200,
            quality: 80,
            preserveAlpha,
        });
        const url = await uploadToR2(buffer, file.name, contentType);

        return NextResponse.json({ url });
    } catch (error) {
        console.error("Upload error:", error);
        return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }
}
