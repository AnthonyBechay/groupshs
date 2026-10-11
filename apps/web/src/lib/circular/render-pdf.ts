/**
 * Draw a resolved circular as an A4 PDF.
 *
 * jsPDF has no rich-text layout: it places one string in one font at one point.
 * A circular needs bold and italic words inside justified paragraphs, so this
 * file does its own line breaking — text is cut into ATOMS (a word, possibly
 * made of several differently-styled pieces, as in "**camp**:"), atoms are
 * packed into lines, and each line is painted piece by piece.
 *
 * The built-in Times and Helvetica fonts cover Latin text including French
 * accents and typographic quotes. They do NOT cover Arabic; a letter needing
 * Arabic should be exported to Word instead.
 */

import { jsPDF } from "jspdf";
import type { Align, Para, ResolvedCircular, Run } from "./types";

export type CircularImage = { data: Uint8Array; width: number; height: number };
export type CircularImages = {
    left: CircularImage | null;     // association
    center: CircularImage | null;   // group
    right: CircularImage | null;    // unit
    stamp: CircularImage | null;
};

// ─── Page geometry (points) ───────────────────────────────────────────────────

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN_X = 68;
const CONTENT_W = PAGE_W - MARGIN_X * 2;

const HEADER_TOP = 52;
const LOGO_BOX = { side: { w: 122, h: 78 }, center: { w: 110, h: 92 } };
const GROUP_NAME_Y = 164;
const BODY_TOP = 184;
const BODY_BOTTOM = 748;
const FOOTER_Y = 774;

const FONT_SIZE = 12;
const LEADING = 15.6;
const BASELINE = 11.2;          // from the top of a line to its baseline
const PARA_GAP = 11;
const INDENT = 36;
const BULLET_INDENT = 18;
const STAMP_SIZE = 80;
const GROUP_GREEN: [number, number, number] = [30, 125, 50];

/**
 * jsPDF's width table has no entry for these six letters and falls back to a
 * default, which made "Sœurs" a quarter of a letter too narrow and glued it to
 * the next word. Real advance widths from the Times AFM files (1/1000 em).
 */
const TIMES_WIDTHS: Record<string, Record<FontStyle, number>> = {
    "œ": { normal: 722, bold: 722, italic: 667, bolditalic: 722 },
    "Œ": { normal: 889, bold: 1000, italic: 944, bolditalic: 944 },
    "š": { normal: 389, bold: 389, italic: 389, bolditalic: 389 },
    "Š": { normal: 556, bold: 556, italic: 500, bolditalic: 556 },
    "ž": { normal: 444, bold: 444, italic: 389, bolditalic: 389 },
    "Ž": { normal: 611, bold: 667, italic: 556, bolditalic: 611 },
};
const UNMEASURED = /[œŒšŠžŽ]/;

// ─── Rich-text layout ─────────────────────────────────────────────────────────

type FontStyle = "normal" | "bold" | "italic" | "bolditalic";
type Piece = { text: string; style: FontStyle; underline: boolean; width: number };
type Atom = { pieces: Piece[]; width: number };
type Line = { atoms: Atom[]; width: number; last: boolean };

const styleOf = (run: Run): FontStyle =>
    run.bold && run.italic ? "bolditalic" : run.bold ? "bold" : run.italic ? "italic" : "normal";

export function renderCircularPdf(circular: ResolvedCircular, images: CircularImages, title = "Circular"): Uint8Array {
    const doc = new jsPDF({ unit: "pt", format: "a4", compress: true });
    doc.setProperties({ title });
    doc.setTextColor(0, 0, 0);

    const setFont = (style: FontStyle, size = FONT_SIZE) => { doc.setFont("times", style); doc.setFontSize(size); };
    // Kerning OFF when measuring. jsPDF's own measurement subtracts kerning
    // pairs ("To", "Va", "We"), but the text it writes is not kerned, so every
    // such word came out wider than measured and swallowed the space after it.
    const rawWidth = (text: string) => doc.getStringUnitWidth(text, { doKerning: false });
    const widthOf = (text: string, style: FontStyle, size = FONT_SIZE) => {
        setFont(style, size);
        let units = rawWidth(text);
        if (UNMEASURED.test(text)) {
            for (const ch of text) {
                const real = TIMES_WIDTHS[ch]?.[style];
                if (real) units += real / 1000 - rawWidth(ch);
            }
        }
        return units * size;
    };
    const spaceW = widthOf(" ", "normal");

    function toAtoms(runs: Run[]): Atom[] {
        const atoms: Atom[] = [];
        let open: Atom | null = null;
        for (const run of runs) {
            const style = styleOf(run);
            for (const part of run.text.split(/(\s+)/)) {
                if (part === "") continue;
                if (/^\s+$/.test(part)) { open = null; continue; }
                const piece: Piece = { text: part, style, underline: !!run.underline, width: widthOf(part, style) };
                if (!open) { open = { pieces: [], width: 0 }; atoms.push(open); }
                open.pieces.push(piece);
                open.width += piece.width;
            }
        }
        return atoms;
    }

    function wrap(runs: Run[], maxWidth: number): Line[] {
        const lines: Line[] = [];
        let current: Line = { atoms: [], width: 0, last: false };
        for (const atom of toAtoms(runs)) {
            const needed = current.atoms.length ? current.width + spaceW + atom.width : atom.width;
            if (current.atoms.length && needed > maxWidth) {
                lines.push(current);
                current = { atoms: [atom], width: atom.width, last: false };
            } else {
                current.atoms.push(atom);
                current.width = needed;
            }
        }
        if (current.atoms.length) lines.push(current);
        if (lines.length) lines[lines.length - 1].last = true;
        return lines;
    }

    function paintLine(line: Line, x: number, top: number, maxWidth: number, align: Align) {
        const gaps = line.atoms.length - 1;
        let gap = spaceW;
        let cursor = x;
        if (align === "center") cursor = x + (maxWidth - line.width) / 2;
        else if (align === "right") cursor = x + maxWidth - line.width;
        // The last line of a justified paragraph stays ragged, as in print.
        else if (align === "justify" && !line.last && gaps > 0) gap = spaceW + (maxWidth - line.width) / gaps;

        const baseline = top + BASELINE;
        line.atoms.forEach((atom, a) => {
            atom.pieces.forEach((piece, p) => {
                setFont(piece.style);
                doc.text(piece.text, cursor, baseline);
                if (piece.underline) {
                    // Carry the rule across the space when the next word is
                    // underlined too, or "__2 white t-shirts__" comes out dashed.
                    const lastOfAtom = p === atom.pieces.length - 1;
                    const next = lastOfAtom ? line.atoms[a + 1]?.pieces[0] : undefined;
                    const extra = next?.underline ? gap : 0;
                    doc.setLineWidth(0.6);
                    doc.line(cursor, baseline + 1.6, cursor + piece.width + extra, baseline + 1.6);
                }
                cursor += piece.width;
            });
            cursor += gap;
        });
    }

    /** A paragraph cut into lines, with where its text starts. */
    function layoutPara(para: Para, x: number, width: number) {
        const left = x + (para.indent ? INDENT : 0);
        const textX = left + (para.bullet ? BULLET_INDENT : 0);
        const textW = x + width - textX;
        return { left, textX, textW, lines: wrap(para.runs, textW) };
    }

    // ─── Vertical flow ───────────────────────────────────────────────────────

    let y = BODY_TOP;
    /** Nothing drawn on this page yet — gaps are skipped so a page never starts with a blank band. */
    let atTop = true;

    const newPage = () => { doc.addPage(); y = BODY_TOP; atTop = true; };
    const ensure = (height: number) => { if (!atTop && y + height > BODY_BOTTOM) newPage(); };
    const gap = (height: number) => { if (!atTop) y += height; };

    function flowParas(paras: Para[]) {
        for (const para of paras) {
            if (para.gapBefore) gap(PARA_GAP);
            const { left, textX, textW, lines } = layoutPara(para, MARGIN_X, CONTENT_W);
            lines.forEach((line, i) => {
                ensure(LEADING);
                if (i === 0 && para.bullet) { setFont("normal"); doc.text(para.bullet, left, y + BASELINE); }
                paintLine(line, textX, y, textW, para.align);
                y += LEADING;
                atTop = false;
            });
        }
    }

    /** Paint paragraphs in a fixed column without page breaks; returns the height used. */
    function columnHeight(paras: Para[], x: number, width: number, paint: boolean, top: number): number {
        let cursor = top;
        for (const para of paras) {
            const { left, textX, textW, lines } = layoutPara(para, x, width);
            lines.forEach((line, i) => {
                if (paint) {
                    if (i === 0 && para.bullet) { setFont("normal"); doc.text(para.bullet, left, cursor + BASELINE); }
                    paintLine(line, textX, cursor, textW, "left");
                }
                cursor += LEADING;
            });
        }
        return cursor - top;
    }

    // ─── First-page lines: reference, theme, dateline ────────────────────────

    let metaBaseline = GROUP_NAME_Y + 16;
    if (circular.reference) {
        setFont("normal");
        doc.text(`Ref. ${circular.reference}`, MARGIN_X, metaBaseline);
        metaBaseline += 18;
    }
    if (circular.theme.length) {
        const [line] = wrap(circular.theme.map(r => ({ ...r, italic: !r.italic })), CONTENT_W);
        if (line) paintLine(line, MARGIN_X, metaBaseline - BASELINE, CONTENT_W, "center");
        metaBaseline += 18;
    }
    if (circular.dateline.length) {
        const [line] = wrap(circular.dateline, CONTENT_W);
        if (line) paintLine(line, MARGIN_X, metaBaseline - BASELINE, CONTENT_W, "right");
        metaBaseline += 18;
    }
    y = Math.max(BODY_TOP, metaBaseline - BASELINE + 2);

    // ─── Blocks ──────────────────────────────────────────────────────────────

    circular.blocks.forEach((block, index) => {
        const previous = circular.blocks[index - 1];
        switch (block.type) {
            case "pageBreak":
                newPage();
                break;

            case "paras":
                gap(PARA_GAP);
                flowParas(block.paras);
                break;

            case "heading": {
                const boxH = 19;
                gap(LEADING);
                // Keep the title with at least the first line under it.
                ensure(boxH + PARA_GAP + LEADING * 2);
                doc.setLineWidth(0.9);
                doc.rect(MARGIN_X, y, CONTENT_W, boxH);
                const [line] = wrap(block.runs, CONTENT_W - 12);
                if (line) paintLine(line, MARGIN_X + 6, y + 2.6, CONTENT_W - 12, "center");
                y += boxH + 4;
                atTop = false;
                break;
            }

            case "columns": {
                const gutter = 24;
                const colW = (CONTENT_W - gutter) / 2;
                const height = Math.max(
                    columnHeight(block.left, MARGIN_X, colW, false, 0),
                    columnHeight(block.right, MARGIN_X + colW + gutter, colW, false, 0)
                );
                gap(PARA_GAP);
                ensure(height);
                columnHeight(block.left, MARGIN_X, colW, true, y);
                columnHeight(block.right, MARGIN_X + colW + gutter, colW, true, y);
                y += height;
                atTop = false;
                break;
            }

            case "contacts": {
                // Sits directly under the sentence that introduces it.
                if (previous?.type !== "paras") gap(PARA_GAP);
                ensure(block.rows.length * LEADING);
                const roleW = Math.max(0, ...block.rows.map(r => (r.role ? widthOf(r.role, "normal") : 0)));
                const nameW = Math.max(0, ...block.rows.map(r => widthOf(r.name, "normal")));
                const nameX = MARGIN_X + (roleW ? roleW + 12 : 0);
                const phoneX = Math.max(nameX + nameW + 30, MARGIN_X + 160);
                setFont("normal");
                for (const row of block.rows) {
                    ensure(LEADING);
                    if (row.role) doc.text(row.role, MARGIN_X, y + BASELINE);
                    doc.text(row.name, nameX, y + BASELINE);
                    if (row.phone) doc.text(row.phone, phoneX, y + BASELINE);
                    y += LEADING;
                    atTop = false;
                }
                break;
            }

            case "signature": {
                const stamp = block.stamp ? images.stamp : null;
                const height = block.lines.length * LEADING + (stamp ? STAMP_SIZE + 2 : 0);
                if (previous?.type !== "contacts") gap(PARA_GAP);
                // The stamp may reach down beside the footer, as it does on
                // paper; sending two lines and a stamp alone to a new page
                // because of a few points would look far worse.
                if (!atTop && y + height > FOOTER_Y + 10) newPage();
                for (const runs of block.lines) {
                    const [line] = wrap(runs, CONTENT_W);
                    if (line) paintLine(line, MARGIN_X, y, CONTENT_W, "right");
                    y += LEADING;
                }
                if (stamp) {
                    const box = fit(stamp, STAMP_SIZE, STAMP_SIZE);
                    doc.addImage(stamp.data, "PNG", PAGE_W - MARGIN_X - box.w - 4, y + 2, box.w, box.h, "stamp", "FAST");
                    y += STAMP_SIZE + 2;
                }
                atTop = false;
                break;
            }
        }
    });

    // ─── Letterhead and footer, on every page ────────────────────────────────

    const pages = doc.getNumberOfPages();
    for (let page = 1; page <= pages; page++) {
        doc.setPage(page);

        const place = (image: CircularImage | null, alias: string, boxX: number, boxW: number, boxH: number, alignX: "left" | "center" | "right") => {
            if (!image) return;
            const box = fit(image, boxW, boxH);
            const x = alignX === "left" ? boxX : alignX === "right" ? boxX + boxW - box.w : boxX + (boxW - box.w) / 2;
            // Side logos are centered on the tall center logo.
            const yTop = HEADER_TOP + (LOGO_BOX.center.h - box.h) / 2;
            doc.addImage(image.data, "PNG", x, yTop, box.w, box.h, alias, "FAST");
        };
        place(images.left, "logo-left", MARGIN_X, LOGO_BOX.side.w, LOGO_BOX.side.h, "left");
        place(images.center, "logo-center", (PAGE_W - LOGO_BOX.center.w) / 2, LOGO_BOX.center.w, LOGO_BOX.center.h, "center");
        place(images.right, "logo-right", PAGE_W - MARGIN_X - LOGO_BOX.side.w, LOGO_BOX.side.w, LOGO_BOX.side.h, "right");

        if (circular.groupName) {
            doc.setFont("helvetica", "bold");
            doc.setFontSize(15);
            doc.setTextColor(...GROUP_GREEN);
            doc.text(circular.groupName, PAGE_W / 2, GROUP_NAME_Y, { align: "center" });
            doc.setTextColor(0, 0, 0);
        }

        if (circular.footerLeft) { setFont("italic", 11); doc.text(circular.footerLeft, MARGIN_X, FOOTER_Y); }
        if (circular.footerRight) { setFont("normal", 11); doc.text(circular.footerRight, PAGE_W - MARGIN_X, FOOTER_Y, { align: "right" }); }
    }

    return new Uint8Array(doc.output("arraybuffer"));
}

/** The largest size that fits the box without distorting the image. */
function fit(image: CircularImage, maxW: number, maxH: number): { w: number; h: number } {
    const scale = Math.min(maxW / image.width, maxH / image.height);
    return { w: image.width * scale, h: image.height * scale };
}

export const PDF_PAGE = { width: PAGE_W, height: PAGE_H };
