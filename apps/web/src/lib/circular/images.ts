/**
 * Fetch the logos a circular prints and hand them to the renderers as PNG.
 *
 * Uploaded logos are stored as WebP (see image.ts) and may be SVG; neither
 * jsPDF nor Word can embed those. Converting on the server also sidesteps the
 * browser's cross-origin rules, which block reading R2 images into a canvas.
 */

import sharp from "sharp";
import path from "node:path";
import { readFile } from "node:fs/promises";
import type { CircularContext } from "./types";
import type { CircularImage, CircularImages } from "./render-pdf";

const MAX_BYTES = 12 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 8000;

/**
 * Only images we host are fetched. The URLs come from the database, where an
 * admin could have saved anything; without this check the server would fetch
 * arbitrary addresses on request, including ones only it can reach.
 */
function isAllowedRemote(url: URL): boolean {
    if (url.protocol !== "https:") return false;
    const publicBase = process.env.R2_PUBLIC_URL;
    if (publicBase) {
        try { if (new URL(publicBase).host === url.host) return true; } catch { /* misconfigured: fall through */ }
    }
    return /^pub-[a-z0-9]+\.r2\.dev$/i.test(url.host);
}

async function readSource(src: string): Promise<Buffer | null> {
    // A file shipped with the site, e.g. the default "/logo.png".
    if (src.startsWith("/") && !src.startsWith("//")) {
        const publicDir = path.join(process.cwd(), "public");
        const file = path.join(publicDir, path.normalize(src));
        if (!file.startsWith(publicDir + path.sep)) return null;
        return readFile(file);
    }

    const url = new URL(src);
    if (!isAllowedRemote(url)) return null;
    const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS), redirect: "error" });
    if (!res.ok) return null;
    const bytes = Buffer.from(await res.arrayBuffer());
    return bytes.length > MAX_BYTES ? null : bytes;
}

/** A logo that cannot be loaded is left out; the circular is still produced. */
export async function loadCircularImage(src: string | null | undefined, maxPx = 520): Promise<CircularImage | null> {
    if (!src) return null;
    try {
        const source = await readSource(src);
        if (!source) return null;
        // `density` only matters for SVG: rasterize it large enough to print.
        const { data, info } = await sharp(source, { density: 300 })
            .rotate()
            .resize(maxPx, maxPx, { fit: "inside", withoutEnlargement: true })
            .png({ compressionLevel: 9 })
            .toBuffer({ resolveWithObject: true });
        return { data: new Uint8Array(data), width: info.width, height: info.height };
    } catch (error) {
        console.error("Circular image could not be loaded:", src, error);
        return null;
    }
}

export async function loadCircularImages(ctx: CircularContext): Promise<CircularImages> {
    const [left, center, right, stamp] = await Promise.all([
        loadCircularImage(ctx.group.associationLogoUrl),
        loadCircularImage(ctx.group.logoUrl || "/logo.png"),
        loadCircularImage(ctx.unit.logoUrl),
        loadCircularImage(ctx.group.stampUrl, 360),
    ]);
    return { left, center, right, stamp };
}
