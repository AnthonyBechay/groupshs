import sharp from "sharp";

export async function compressImage(
    buffer: Buffer,
    options: { maxWidth?: number; maxHeight?: number; quality?: number; preserveAlpha?: boolean } = {}
): Promise<{ buffer: Buffer; contentType: string }> {
    const { maxWidth = 1600, maxHeight = 1200, quality = 80, preserveAlpha = false } = options;

    const pipeline = sharp(buffer).resize(maxWidth, maxHeight, { fit: "inside", withoutEnlargement: true });

    if (preserveAlpha) {
        // Keep transparency: full RGBA PNG. Do NOT use palette:true — palette quantisation
        // turns semi-transparent / anti-aliased edge pixels into solid white.
        const output = await pipeline.png({ compressionLevel: 8 }).toBuffer();
        return { buffer: output, contentType: "image/png" };
    }

    const output = await pipeline.jpeg({ quality, mozjpeg: true }).toBuffer();
    return { buffer: output, contentType: "image/jpeg" };
}

// Detect if the input image has an alpha channel (transparency)
export async function hasTransparency(buffer: Buffer): Promise<boolean> {
    try {
        const meta = await sharp(buffer).metadata();
        return !!meta.hasAlpha;
    } catch {
        return false;
    }
}
