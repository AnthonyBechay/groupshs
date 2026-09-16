import sharp from "sharp";

/**
 * Image compression for uploads.
 *
 * The rule that matters: branch on whether transparency is actually USED, not
 * on whether an alpha channel exists. Phones and screenshots routinely produce
 * fully-opaque PNGs that still carry an alpha channel; treating those as
 * transparent forced them down the lossless PNG path and left multi-megabyte
 * files in place (a 1.5 MB photo would only shrink to ~1 MB, versus ~37 kB as
 * JPEG). `stats().isOpaque` answers the real question.
 */

/** Largest upload accepted, before compression. Shared by every upload route. */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/** Image types accepted for upload (SVG is handled separately, admin-only). */
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export type CompressOptions = {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    /** Force the transparent path even if the image turns out to be opaque. */
    preserveAlpha?: boolean;
};

export async function compressImage(
    buffer: Buffer,
    options: CompressOptions = {}
): Promise<{ buffer: Buffer; contentType: string }> {
    const { maxWidth = 1600, maxHeight = 1200, quality = 80, preserveAlpha = false } = options;

    const meta = await safeMetadata(buffer);
    const animated = meta?.pages != null && meta.pages > 1;

    // Animated sources (GIF / animated WebP) keep every frame; taking only the
    // first would silently throw the animation away.
    if (animated) {
        const out = await sharp(buffer, { animated: true })
            .resize(maxWidth, maxHeight, { fit: "inside", withoutEnlargement: true })
            .webp({ quality, effort: 4 })
            .toBuffer();
        return smallestOf(out, "image/webp", buffer, meta?.format);
    }

    const base = () =>
        sharp(buffer)
            // Apply the EXIF orientation before the tag is stripped, otherwise
            // photos taken in portrait upload sideways.
            .rotate()
            .resize(maxWidth, maxHeight, { fit: "inside", withoutEnlargement: true });

    const needsAlpha = preserveAlpha || await usesTransparency(buffer);

    if (needsAlpha) {
        // WebP keeps exact alpha and is far smaller than PNG. Critically, it does
        // NOT quantise to a palette — palette quantisation was what turned
        // anti-aliased edges into a white box on transparent logos.
        const out = await base().webp({ quality: 90, alphaQuality: 100, effort: 4 }).toBuffer();
        return smallestOf(out, "image/webp", buffer, meta?.format);
    }

    // Opaque: flatten onto white so any unused alpha channel cannot come out
    // black, then encode lossily.
    const out = await base()
        .flatten({ background: "#ffffff" })
        .jpeg({ quality, mozjpeg: true })
        .toBuffer();
    return smallestOf(out, "image/jpeg", buffer, meta?.format);
}

/**
 * Does the image actually use transparency?
 *
 * `metadata().hasAlpha` only reports that an alpha channel is present, which is
 * true for masses of fully-opaque PNGs. `stats().isOpaque` inspects the pixels.
 */
export async function usesTransparency(buffer: Buffer): Promise<boolean> {
    try {
        const meta = await sharp(buffer).metadata();
        if (!meta.hasAlpha) return false;          // no channel at all — cheap exit
        const stats = await sharp(buffer).stats();
        return !stats.isOpaque;
    } catch {
        return false;
    }
}

/** Back-compat alias; prefer {@link usesTransparency}. */
export async function hasTransparency(buffer: Buffer): Promise<boolean> {
    return usesTransparency(buffer);
}

async function safeMetadata(buffer: Buffer) {
    try {
        return await sharp(buffer).metadata();
    } catch {
        return null;
    }
}

/**
 * Never make a file bigger. An already well-compressed JPEG/WebP can come out
 * larger after a re-encode; in that case keep the original bytes.
 */
function smallestOf(
    encoded: Buffer,
    encodedType: string,
    original: Buffer,
    originalFormat: string | undefined
): { buffer: Buffer; contentType: string } {
    const originalType =
        originalFormat === "jpeg" ? "image/jpeg" :
        originalFormat === "webp" ? "image/webp" :
        originalFormat === "png" ? "image/png" :
        null;

    // Only fall back when the original is itself a web-friendly format.
    if (originalType && original.length < encoded.length) {
        return { buffer: original, contentType: originalType };
    }
    return { buffer: encoded, contentType: encodedType };
}
