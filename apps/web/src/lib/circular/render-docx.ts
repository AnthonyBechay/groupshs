/**
 * Build a resolved circular as a Word document.
 *
 * Same content as the PDF (both start from `resolveCircular`), but here Word
 * does the line breaking, so the two can differ by a word at a line end. The
 * letterhead and footer are a real Word header and footer: they repeat on every
 * page and stay out of the way while someone edits the letter.
 *
 * Sizes: `docx` wants twentieths of a point (twips) for lengths, half-points
 * for font sizes, and pixels at 96 dpi for images.
 */

import {
    AlignmentType, BorderStyle, Document, Footer, Header, ImageRun, Packer, PageBreak, Paragraph, Tab, Table,
    TableCell, TableLayoutType, TableRow, TabStopType, TextRun, VerticalAlign, WidthType,
} from "docx";
import type { Align, Para, ResolvedCircular, Run } from "./types";
import type { CircularImage, CircularImages } from "./render-pdf";

const pt = (points: number) => Math.round(points * 20);
const px = (points: number) => Math.round((points * 96) / 72);

const MARGIN_X = 68;
const CONTENT_W = 595.28 - MARGIN_X * 2;
const FONT = "Times New Roman";
const GAP = pt(11);
const INDENT = pt(36);
const BULLET_INDENT = pt(18);

const ALIGN: Record<Align, (typeof AlignmentType)[keyof typeof AlignmentType]> = {
    left: AlignmentType.LEFT,
    justify: AlignmentType.JUSTIFIED,
    center: AlignmentType.CENTER,
    right: AlignmentType.RIGHT,
};

const NO_BORDER = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const NO_BORDERS = {
    top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER,
    insideHorizontal: NO_BORDER, insideVertical: NO_BORDER,
};

function textRuns(runs: Run[], base: { italics?: boolean } = {}): TextRun[] {
    return runs.map(run => new TextRun({
        text: run.text,
        bold: run.bold,
        // On an italic line (the theme), *emphasis* flips back to upright.
        italics: base.italics ? !run.italic : run.italic,
        underline: run.underline ? {} : undefined,
    }));
}

function image(img: CircularImage, maxW: number, maxH: number): ImageRun {
    const scale = Math.min(maxW / img.width, maxH / img.height);
    return new ImageRun({
        type: "png",
        data: Buffer.from(img.data),
        transformation: { width: px(img.width * scale), height: px(img.height * scale) },
    });
}

function paragraph(para: Para, extra: { before?: number; pageBreakBefore?: boolean } = {}): Paragraph {
    const left = (para.indent ? INDENT : 0) + (para.bullet ? BULLET_INDENT : 0);
    return new Paragraph({
        alignment: ALIGN[para.align],
        pageBreakBefore: extra.pageBreakBefore,
        spacing: { before: extra.before ?? (para.gapBefore ? GAP : 0) },
        indent: left ? { left, hanging: para.bullet ? BULLET_INDENT : 0 } : undefined,
        children: [
            ...(para.bullet ? [new TextRun({ children: [para.bullet, new Tab()] })] : []),
            ...textRuns(para.runs),
        ],
    });
}

function cell(children: (Paragraph | Table)[], width: number, align?: (typeof AlignmentType)[keyof typeof AlignmentType]): TableCell {
    return new TableCell({
        width: { size: pt(width), type: WidthType.DXA },
        borders: NO_BORDERS,
        verticalAlign: VerticalAlign.CENTER,
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
        children: children.length ? children : [new Paragraph({ alignment: align, children: [] })],
    });
}

function borderlessTable(widths: number[], rows: TableCell[][]): Table {
    return new Table({
        width: { size: pt(widths.reduce((a, b) => a + b, 0)), type: WidthType.DXA },
        columnWidths: widths.map(pt),
        layout: TableLayoutType.FIXED,
        borders: NO_BORDERS,
        rows: rows.map(cells => new TableRow({ children: cells })),
    });
}

export async function renderCircularDocx(circular: ResolvedCircular, images: CircularImages, title = "Circular"): Promise<Buffer> {
    // ─── Letterhead ──────────────────────────────────────────────────────────
    const third = CONTENT_W / 3;
    const logoCell = (img: CircularImage | null, align: (typeof AlignmentType)[keyof typeof AlignmentType], maxW: number, maxH: number) =>
        cell([new Paragraph({ alignment: align, children: img ? [image(img, maxW, maxH)] : [] })], third, align);

    const header = new Header({
        children: [
            borderlessTable([third, third, third], [[
                logoCell(images.left, AlignmentType.LEFT, 122, 78),
                logoCell(images.center, AlignmentType.CENTER, 110, 92),
                logoCell(images.right, AlignmentType.RIGHT, 122, 78),
            ]]),
            new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: pt(4) },
                children: [new TextRun({ text: circular.groupName, bold: true, font: "Arial", size: 30, color: "1E7D32" })],
            }),
        ],
    });

    const footer = new Footer({
        children: [new Paragraph({
            tabStops: [{ type: TabStopType.RIGHT, position: pt(CONTENT_W) }],
            children: [
                new TextRun({ text: circular.footerLeft, italics: true, size: 22 }),
                new TextRun({ children: [new Tab(), circular.footerRight], size: 22 }),
            ],
        })],
    });

    // ─── Body ────────────────────────────────────────────────────────────────
    const body: (Paragraph | Table)[] = [];

    if (circular.reference) body.push(new Paragraph({ children: [new TextRun(`Ref. ${circular.reference}`)] }));
    if (circular.theme.length) body.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: pt(3) }, children: textRuns(circular.theme, { italics: true }) }));
    if (circular.dateline.length) body.push(new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { before: pt(3) }, children: textRuns(circular.dateline) }));

    /** A page break waiting for the next block to carry it. */
    let breakPending = false;
    /** Nothing on this page yet: skip the gap, as the PDF does. */
    let atTop = body.length === 0;

    // Tables cannot carry "page break before", so they get a break paragraph.
    const beforeTable = () => {
        if (breakPending) { body.push(new Paragraph({ children: [new PageBreak()] })); breakPending = false; }
    };

    circular.blocks.forEach((block, index) => {
        const previous = circular.blocks[index - 1];
        switch (block.type) {
            case "pageBreak":
                breakPending = true;
                atTop = true;
                return;

            case "paras":
                block.paras.forEach((para, i) => {
                    const first = i === 0;
                    body.push(paragraph(para, {
                        before: first ? (atTop ? 0 : GAP) : undefined,
                        pageBreakBefore: first && breakPending,
                    }));
                });
                breakPending = false;
                break;

            case "heading": {
                const rule = { style: BorderStyle.SINGLE, size: 8, space: 2, color: "000000" };
                body.push(new Paragraph({
                    alignment: AlignmentType.CENTER,
                    pageBreakBefore: breakPending,
                    keepNext: true,
                    spacing: { before: atTop ? 0 : pt(15.6), after: pt(4) },
                    border: { top: rule, bottom: rule, left: rule, right: rule },
                    children: textRuns(block.runs),
                }));
                breakPending = false;
                break;
            }

            case "columns": {
                beforeTable();
                const gutter = 24;
                const colW = (CONTENT_W - gutter) / 2;
                body.push(new Paragraph({ spacing: { before: 0, after: 0, line: atTop ? 20 : GAP, lineRule: "exact" }, children: [] }));
                body.push(borderlessTable([colW, gutter, colW], [[
                    cell(block.left.map(p => paragraph(p)), colW),
                    cell([], gutter),
                    cell(block.right.map(p => paragraph(p)), colW),
                ]]));
                break;
            }

            case "contacts": {
                beforeTable();
                if (previous?.type !== "paras" && !atTop) {
                    body.push(new Paragraph({ spacing: { before: 0, after: 0, line: GAP, lineRule: "exact" }, children: [] }));
                }
                const hasRoles = block.rows.some(r => r.role);
                const widths = hasRoles ? [48, 150, 150] : [170, 150];
                const line = (text: string) => [new Paragraph({ children: [new TextRun(text)] })];
                body.push(borderlessTable(widths, block.rows.map(row => hasRoles
                    ? [cell(line(row.role), widths[0]), cell(line(row.name), widths[1]), cell(line(row.phone), widths[2])]
                    : [cell(line(row.name), widths[0]), cell(line(row.phone), widths[1])]
                )));
                break;
            }

            case "signature": {
                const stamp = block.stamp ? images.stamp : null;
                block.lines.forEach((runs, i) => {
                    body.push(new Paragraph({
                        alignment: AlignmentType.RIGHT,
                        pageBreakBefore: i === 0 && breakPending,
                        // Keep the closing lines and the stamp on one page.
                        keepNext: i < block.lines.length - 1 || !!stamp,
                        spacing: { before: i === 0 && previous?.type !== "contacts" && !atTop ? GAP : 0 },
                        children: textRuns(runs),
                    }));
                });
                if (stamp) {
                    body.push(new Paragraph({
                        alignment: AlignmentType.RIGHT,
                        pageBreakBefore: block.lines.length === 0 && breakPending,
                        spacing: { before: pt(2) },
                        children: [image(stamp, 80, 80)],
                    }));
                }
                breakPending = false;
                break;
            }
        }
        atTop = false;
    });

    const doc = new Document({
        title,
        creator: circular.groupName,
        styles: { default: { document: { run: { font: FONT, size: 24 }, paragraph: { spacing: { line: 276, before: 0, after: 0 } } } } },
        sections: [{
            properties: {
                page: {
                    size: { width: pt(595.28), height: pt(841.89) },
                    margin: { top: pt(182), bottom: pt(92), left: pt(MARGIN_X), right: pt(MARGIN_X), header: pt(48), footer: pt(52) },
                },
            },
            headers: { default: header },
            footers: { default: footer },
            children: body,
        }],
    });

    return Packer.toBuffer(doc);
}
