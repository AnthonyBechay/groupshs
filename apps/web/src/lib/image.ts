import sharp from "sharp";

export async function compressImage(
    buffer: Buffer,
    options: { maxWidth?: number; maxHeight?: number; quality?: number } = {}
): Promise<{ buffer: Buffer; contentType: string }> {
    const { maxWidth = 1600, maxHeight = 1200, quality = 80 } = options;

    const output = await sharp(buffer)
        .resize(maxWidth, maxHeight, { fit: "inside", withoutEnlargement: true })
        .jpeg({ quality, mozjpeg: true })
        .toBuffer();

    return { buffer: output, contentType: "image/jpeg" };
}
