import { prisma } from "@/db";
import { getSession } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { canManageCircularsOf, loadCircularContext, metaOf, parseDay } from "@/lib/circular/service";
import { normalizeContent, type CircularContent, type CircularMeta } from "@/lib/circular/types";
import { resolveCircular } from "@/lib/circular/resolve";
import { loadCircularImages } from "@/lib/circular/images";
import { renderCircularPdf } from "@/lib/circular/render-pdf";
import { renderCircularDocx } from "@/lib/circular/render-docx";

type Params = { params: Promise<{ id: string }> };

const DOCX_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/**
 * Produce the PDF or Word file.
 *
 *   GET   the circular as last saved
 *   POST  the circular as it currently stands in the editor (unsaved draft in
 *         the body) — this is what feeds the live preview, and it means a
 *         download is always exactly what the preview shows
 *
 * `?format=pdf|docx`, `&download=1` to save rather than display.
 */
async function respond(request: NextRequest, id: string, draft: Record<string, unknown> | null) {
    const session = await getSession();
    const circular = await prisma.circular.findUnique({ where: { id } });
    if (!circular) return NextResponse.json({ error: "Circular not found" }, { status: 404 });
    const ctx = await loadCircularContext(circular.activityId);
    if (!ctx) return NextResponse.json({ error: "Activity not found" }, { status: 404 });
    if (!canManageCircularsOf(session, ctx.unit.id)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let content: CircularContent = normalizeContent(circular.content);
    const meta: CircularMeta = metaOf(circular);
    if (draft) {
        if ("content" in draft) content = normalizeContent(draft.content);
        const day = parseDay(draft.issueDate);
        if (day) meta.issueDate = day.toISOString();
        if (Number.isInteger(draft.seq) && (draft.seq as number) > 0) meta.seq = draft.seq as number;
        if ("referenceOverride" in draft) {
            meta.referenceOverride = typeof draft.referenceOverride === "string" && draft.referenceOverride.trim()
                ? draft.referenceOverride.trim()
                : null;
        }
    }

    const url = new URL(request.url);
    const format = url.searchParams.get("format") === "docx" ? "docx" : "pdf";
    const resolved = resolveCircular(content, ctx, meta);
    const images = await loadCircularImages(ctx);

    const reference = resolved.reference || `${meta.seq}`;
    const filename = `Circular-${reference.replace(/[^\p{L}\p{N}]+/gu, "-")}.${format}`;
    const bytes = format === "docx"
        ? new Uint8Array(await renderCircularDocx(resolved, images, circular.title))
        : renderCircularPdf(resolved, images, circular.title);

    const disposition = url.searchParams.get("download") === "1" ? "attachment" : "inline";
    return new NextResponse(bytes as unknown as BodyInit, {
        headers: {
            "Content-Type": format === "docx" ? DOCX_TYPE : "application/pdf",
            // The ASCII name is the fallback; filename* carries accents intact.
            "Content-Disposition": `${disposition}; filename="${filename.replace(/[^\x20-\x7E]/g, "_")}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
            "Cache-Control": "no-store",
        },
    });
}

export async function GET(request: NextRequest, { params }: Params) {
    try {
        const { id } = await params;
        return await respond(request, id, null);
    } catch (error) {
        console.error("Error rendering circular:", error);
        return NextResponse.json({ error: "Could not generate the file" }, { status: 500 });
    }
}

export async function POST(request: NextRequest, { params }: Params) {
    try {
        const { id } = await params;
        const draft = await request.json().catch(() => null);
        return await respond(request, id, draft && typeof draft === "object" ? draft : null);
    } catch (error) {
        console.error("Error rendering circular:", error);
        return NextResponse.json({ error: "Could not generate the file" }, { status: 500 });
    }
}
