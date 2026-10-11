/**
 * Dates, times and reference numbers as they are written on a circular.
 *
 * Everything reads the UTC parts of a date. Activity dates are stored as
 * midnight UTC of the day that was picked; formatting them in local time would
 * print the previous day for anyone west of Greenwich.
 */

import { getFiscalYear } from "@/lib/age-transition";

const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function parts(iso: string | Date) {
    const d = typeof iso === "string" ? new Date(iso) : iso;
    if (Number.isNaN(d.getTime())) return null;
    return { y: d.getUTCFullYear(), m: d.getUTCMonth(), d: d.getUTCDate(), w: d.getUTCDay() };
}

/** "July 3, 2025" */
export function formatDate(iso: string | Date | null | undefined): string {
    const p = iso ? parts(iso) : null;
    return p ? `${MONTHS[p.m]} ${p.d}, ${p.y}` : "";
}

/** "Thursday, July 3, 2025" */
export function formatDateWithWeekday(iso: string | Date | null | undefined): string {
    const p = iso ? parts(iso) : null;
    return p ? `${WEEKDAYS[p.w]}, ${MONTHS[p.m]} ${p.d}, ${p.y}` : "";
}

/** 1 → "1st", 22 → "22nd", 11 → "11th" */
export function ordinal(n: number): string {
    const tens = n % 100;
    if (tens >= 11 && tens <= 13) return `${n}th`;
    switch (n % 10) {
        case 1: return `${n}st`;
        case 2: return `${n}nd`;
        case 3: return `${n}rd`;
        default: return `${n}th`;
    }
}

/** "22nd" — the day of the month, for "at 8:30 a.m. on the 22nd". */
export function formatDayOrdinal(iso: string | Date | null | undefined): string {
    const p = iso ? parts(iso) : null;
    return p ? ordinal(p.d) : "";
}

/**
 * A date range the way the group writes it, repeating as little as possible:
 *
 *   one day                 July 22, 2025
 *   same month              July 22 till 26, 2025
 *   same year               July 30 till August 2, 2025
 *   across New Year         December 30, 2025 till January 2, 2026
 */
export function formatDateRange(startIso: string | Date | null | undefined, endIso?: string | Date | null): string {
    const s = startIso ? parts(startIso) : null;
    if (!s) return "";
    const e = endIso ? parts(endIso) : null;
    if (!e || (e.y === s.y && e.m === s.m && e.d === s.d)) return formatDate(startIso);
    if (e.y !== s.y) return `${formatDate(startIso)} till ${formatDate(endIso)}`;
    if (e.m !== s.m) return `${MONTHS[s.m]} ${s.d} till ${MONTHS[e.m]} ${e.d}, ${s.y}`;
    return `${MONTHS[s.m]} ${s.d} till ${e.d}, ${s.y}`;
}

/** "08:30" → "8:30 a.m.", "14:00" → "2:00 p.m.". Anything else is returned as typed. */
export function formatTime(hhmm: string | null | undefined): string {
    if (!hhmm) return "";
    const m = /^(\d{1,2}):(\d{2})/.exec(hhmm.trim());
    if (!m) return hhmm.trim();
    const h = Number(m[1]);
    if (h > 23) return hhmm.trim();
    const suffix = h >= 12 ? "p.m." : "a.m.";
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${m[2]} ${suffix}`;
}

// ─── Scout year and reference ─────────────────────────────────────────────────

/** The calendar year the scout year containing `iso` starts in. */
export function scoutYearOf(iso: string | Date, fiscalYearStartMonth: number): number {
    const d = typeof iso === "string" ? new Date(iso) : iso;
    return getFiscalYear(d, fiscalYearStartMonth).startYear;
}

/** "2024-2025" — or just "2025" when the scout year is the calendar year. */
export function scoutYearLabel(startYear: number, fiscalYearStartMonth: number): string {
    return fiscalYearStartMonth === 1 ? `${startYear}` : `${startYear}-${startYear + 1}`;
}

/** "24-25" */
export function scoutYearShort(startYear: number, fiscalYearStartMonth: number): string {
    const two = (y: number) => String(y % 100).padStart(2, "0");
    return fiscalYearStartMonth === 1 ? two(startYear) : `${two(startYear)}-${two(startYear + 1)}`;
}

/** "Meute Hathi" → "MeuteHathi", "éclaireurs de l'aigle" → "ÉclaireursDeLAigle" */
export function unitSlug(name: string): string {
    return name
        .split(/[^\p{L}\p{N}]+/u)
        .filter(Boolean)
        .map(w => w[0].toUpperCase() + w.slice(1))
        .join("");
}

/** "06/24-25/MeuteHathi" */
export function formatReference(seq: number, startYear: number, fiscalYearStartMonth: number, unitName: string): string {
    const n = String(seq).padStart(2, "0");
    return [n, scoutYearShort(startYear, fiscalYearStartMonth), unitSlug(unitName)].filter(Boolean).join("/");
}
