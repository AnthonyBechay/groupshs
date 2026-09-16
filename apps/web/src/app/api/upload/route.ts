import { getSession } from "@/lib/auth";
import { compressImage, MAX_UPLOAD_BYTES, ALLOWED_IMAGE_TYPES } from "@/lib/image";
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
        // Callers may pass a target folder (default: "activities") and custom max dimensions
        const folder = (formData.get("folder") as string | null) || "activities";
        const maxWidth = parseInt((formData.get("maxWidth") as string | null) || "1600");
        const maxHeight = parseInt((formData.get("maxHeight") as string | null) || "1200");

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        if (![...ALLOWED_IMAGE_TYPES, "image/svg+xml"].includes(file.type)) {
            return NextResponse.json({ error: "Invalid file type. Allowed: JPEG, PNG, WebP, GIF, SVG" }, { status: 400 });
        }

        if (file.size > MAX_UPLOAD_BYTES) {
            return NextResponse.json({ error: "File too large. Max 10MB" }, { status: 400 });
        }

        const rawBuffer = Buffer.from(await file.arrayBuffer());

        // SVGs go through untouched
        if (file.type === "image/svg+xml") {
            const url = await uploadToR2(rawBuffer as Buffer<ArrayBuffer>, file.name, file.type, folder);
            return NextResponse.json({ url });
        }

        // compressImage decides for itself whether transparency is actually used;
        // the flag only forces the alpha path for callers that need it (logos).
        const { buffer, contentType } = await compressImage(rawBuffer, {
            maxWidth,
            maxHeight,
            quality: 80,
            preserveAlpha: explicitPreserveAlpha,
        });

        const url = await uploadToR2(buffer, file.name, contentType, folder);

        return NextResponse.json({
            url,
            // Handy for spotting a pipeline regression from the browser console.
            bytes: buffer.length,
            originalBytes: rawBuffer.length,
        });
    } catch (error) {
        console.error("Upload error:", error);
        return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }
}
