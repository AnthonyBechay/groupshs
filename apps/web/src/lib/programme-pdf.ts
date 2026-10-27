/**
 * A session's programme as an A4 PDF: one section per day, one row per moment.
 *
 * Plain left-aligned text, so jsPDF's own line splitting is enough (the
 * circular renderer does its own only because it justifies mixed styles).
 * Helvetica is Latin-only: French accents print, Arabic does not.
 */

import { jsPDF } from "jspdf";
import type { CircularImage } from "@/lib/circular/render-pdf";
import { MEALS, type ProgrammeItem } from "@/lib/activity-schedule";

export type ProgrammeDoc = {
    groupName: string;
    logo: CircularImage | null;
    title: string;
    subtitle: string;        // "Troupe Aztecs · Camp"
    when: string;            // "Saturday 3 October 2026 – Monday 5 October" (no arrows: not in Helvetica)
    where: string | null;
    hours: string | null;    // "Drop-off 08:00 · Pick-up 17:00"
    days: { label: string; items: ProgrammeItem[] }[];
    notes: string | null;
};

const W = 595.28, H = 841.89, M = 42;
const TIME_W = 78;
const BOTTOM = H - 48;
const mealLabel = (m: string) => MEALS.find(x => x.value === m)?.label ?? "";

export function renderProgrammePdf(p: ProgrammeDoc): Uint8Array {
    const doc = new jsPDF({ unit: "pt", format: "a4", compress: true });
    doc.setProperties({ title: `Programme — ${p.title}` });
    let y = M;

    const text = (s: string, x: number, yy: number, size: number, style: "normal" | "bold" | "italic" = "normal", grey = false) => {
        doc.setFont("helvetica", style);
        doc.setFontSize(size);
        doc.setTextColor(grey ? 110 : 20);
        doc.text(s, x, yy);
    };
    const lines = (s: string, width: number, size: number, style: "normal" | "bold" | "italic" = "normal") => {
        doc.setFont("helvetica", style);
        doc.setFontSize(size);
        return doc.splitTextToSize(s, width) as string[];
    };
    const newPage = () => { doc.addPage(); y = M; };
    const room = (h: number) => { if (y + h > BOTTOM) newPage(); };

    // ── Header ──
    let textX = M;
    if (p.logo) {
        const size = 54;
        const ratio = p.logo.width / p.logo.height;
        const w = ratio >= 1 ? size : size * ratio, h = ratio >= 1 ? size / ratio : size;
        doc.addImage(p.logo.data, "PNG", M, y, w, h);
        textX = M + size + 14;
    }
    text(p.groupName.toUpperCase(), textX, y + 10, 8, "bold", true);
    for (const [i, l] of lines(p.title, W - textX - M, 18, "bold").entries()) text(l, textX, y + 30 + i * 20, 18, "bold");
    y += Math.max(64, 30 + lines(p.title, W - textX - M, 18, "bold").length * 20);
    text(p.subtitle, M, y, 10, "bold", true); y += 14;
    text(p.when, M, y, 10); y += 14;
    if (p.where) { text(p.where, M, y, 10); y += 14; }
    if (p.hours) { text(p.hours, M, y, 10, "normal", true); y += 14; }
    y += 6;
    doc.setDrawColor(200); doc.line(M, y, W - M, y); y += 18;

    // ── Days ──
    if (p.days.every(d => d.items.length === 0)) {
        text("No programme yet.", M, y, 11, "italic", true);
    }
    for (const day of p.days) {
        if (day.items.length === 0 && p.days.length > 1) continue;
        room(48);
        doc.setFillColor(238, 242, 240);
        doc.rect(M, y - 12, W - 2 * M, 20, "F");
        text(day.label, M + 8, y + 2, 11, "bold");
        y += 22;

        for (const it of day.items) {
            const time = it.time ? `${it.time}${it.endTime ? ` – ${it.endTime}` : ""}` : "";
            const bodyW = W - 2 * M - TIME_W - 8;
            const title = it.kind === "MEAL" && mealLabel(it.meal) && mealLabel(it.meal) !== it.title
                ? `${it.title} (${mealLabel(it.meal)})` : it.title;
            const titleLines = lines(title || "—", bodyW, 10.5, "bold");
            const detailLines = it.details ? lines(it.details, bodyW, 9.5) : [];
            const h = titleLines.length * 13 + (it.by ? 12 : 0) + detailLines.length * 12 + 10;
            room(h);
            if (it.kind === "MEAL") {
                doc.setFillColor(253, 246, 227);
                doc.rect(M, y - 10, W - 2 * M, h, "F");
            }
            text(time, M + 6, y, 10, "bold");
            let yy = y;
            for (const l of titleLines) { text(l, M + TIME_W, yy, 10.5, "bold"); yy += 13; }
            if (it.by) { text(`Led by ${it.by}`, M + TIME_W, yy, 9, "italic", true); yy += 12; }
            for (const l of detailLines) { text(l, M + TIME_W, yy, 9.5, "normal", true); yy += 12; }
            y += h;
            doc.setDrawColor(230); doc.line(M, y - 10, W - M, y - 10);
        }
        y += 10;
    }

    if (p.notes) {
        room(40);
        text("Notes", M, y, 11, "bold"); y += 15;
        for (const l of lines(p.notes, W - 2 * M, 10)) { room(13); text(l, M, y, 10); y += 13; }
    }

    // ── Footer on every page ──
    const pages = doc.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
        doc.setPage(i);
        text(`${p.title} — programme`, M, H - 24, 8, "normal", true);
        text(`${i} / ${pages}`, W - M - 24, H - 24, 8, "normal", true);
    }
    return new Uint8Array(doc.output("arraybuffer"));
}
