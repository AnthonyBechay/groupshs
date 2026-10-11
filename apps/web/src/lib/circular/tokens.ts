/**
 * `{{tokens}}` — the live values a circular's text can refer to.
 *
 * A token is filled, in order, from:
 *   1. the circular's own override (`content.values`)
 *   2. the activity / unit / group settings
 * A token with no value is NOT silently dropped: it prints as `[name]` and is
 * reported, so a missing fee is noticed before the letter goes to parents.
 */

import { UNIT_GENDER } from "@/lib/scout-config";
import type { CircularContent, CircularContext, CircularMeta } from "./types";
import {
    formatDate, formatDateRange, formatDateWithWeekday, formatDayOrdinal, formatReference,
    formatTime, scoutYearLabel, scoutYearOf,
} from "./format";

export type TokenSource = "circular" | "activity" | "unit" | "group" | "manual";

export type TokenDef = {
    key: string;
    label: string;
    source: TokenSource;
    /** Where the value is edited when it is not overridden here. */
    from: string;
    multiline?: boolean;
};

/** Every token, in the order the editor lists them. */
export const TOKEN_DEFS: TokenDef[] = [
    { key: "reference", label: "Reference", source: "circular", from: "Number and date above" },
    { key: "issueDate", label: "Letter date", source: "circular", from: "Date above" },

    { key: "title", label: "Activity name", source: "activity", from: "Activity → Title" },
    { key: "theme", label: "Theme", source: "activity", from: "Activity → Theme" },
    { key: "dates", label: "Dates", source: "activity", from: "Activity → Start / end date" },
    { key: "startDate", label: "Start date", source: "activity", from: "Activity → Start date" },
    { key: "endDate", label: "End date", source: "activity", from: "Activity → End date" },
    { key: "startDay", label: "Start day (22nd)", source: "activity", from: "Activity → Start date" },
    { key: "endDay", label: "End day (26th)", source: "activity", from: "Activity → End date" },
    { key: "location", label: "Location", source: "activity", from: "Activity → Main location" },
    { key: "startTime", label: "Drop-off time", source: "activity", from: "Activity → Dropoff time (start)" },
    { key: "startPlace", label: "Drop-off place", source: "activity", from: "Activity → Dropoff (start) location" },
    { key: "endTime", label: "Pick-up time", source: "activity", from: "Activity → Pickup time (end)" },
    { key: "endPlace", label: "Pick-up place", source: "activity", from: "Activity → Pickup (end) location" },
    { key: "fee", label: "Fee", source: "activity", from: "Activity → Fee" },
    { key: "whatToBring", label: "What to bring", source: "activity", from: "Activity → What to bring", multiline: true },

    { key: "unit", label: "Unit name", source: "unit", from: "Unit → Name" },
    { key: "members", label: "Members (Louveteaux…)", source: "unit", from: "Unit → Type" },
    { key: "child", label: "son / daughter", source: "unit", from: "Unit → Type" },
    { key: "children", label: "boys / girls", source: "unit", from: "Unit → Type" },
    { key: "him", label: "him / her", source: "unit", from: "Unit → Type" },
    { key: "his", label: "his / her", source: "unit", from: "Unit → Type" },

    { key: "group", label: "Group name", source: "group", from: "Settings → Circulars" },
    { key: "city", label: "City", source: "group", from: "Settings → Circulars" },
    { key: "motto", label: "Year motto", source: "group", from: "Settings → Circulars" },
    { key: "scoutYear", label: "Scout year", source: "group", from: "Letter date" },

    // No source anywhere else: these exist only to be filled in on the circular.
    { key: "confirmBy", label: "Confirm by", source: "manual", from: "" },
    { key: "campfireDate", label: "Campfire date", source: "manual", from: "" },
    { key: "campfireTime", label: "Campfire time", source: "manual", from: "" },
];

export const TOKEN_BY_KEY: Record<string, TokenDef> = Object.fromEntries(TOKEN_DEFS.map(t => [t.key, t]));

const MEMBERS_WORD: Record<string, string> = {
    LOUVETEAUX: "Louveteaux", LOUVETTES: "Louvettes",
    ECLAIREURS: "Eclaireurs", ECLAIREUSES: "Eclaireuses",
    ROUTIERS: "Routiers", PIONNIERES: "Pionnières",
};

/**
 * The words that depend on whether the unit is boys or girls. A mixed audience
 * (a group-wide activity) gets neutral wording rather than a guess.
 */
function genderedWords(unitType: string) {
    switch (UNIT_GENDER[unitType]) {
        case "BOYS": return { child: "son", children: "boys", him: "him", his: "his" };
        case "GIRLS": return { child: "daughter", children: "girls", him: "her", his: "her" };
        default: return { child: "child", children: "scouts", him: "them", his: "their" };
    }
}

/** The reference printed on the letter: the typed one if any, else the derived one. */
export function referenceOf(ctx: CircularContext, meta: CircularMeta): string {
    if (meta.referenceOverride?.trim()) return meta.referenceOverride.trim();
    const m = ctx.group.fiscalYearStartMonth;
    return formatReference(meta.seq, scoutYearOf(meta.issueDate, m), m, ctx.unit.name);
}

/** Token values straight from the system, before any per-circular override. */
export function autoTokens(ctx: CircularContext, meta: CircularMeta): Record<string, string> {
    const a = ctx.activity;
    const m = ctx.group.fiscalYearStartMonth;
    const end = a.endDate ?? a.startDate;
    return {
        reference: referenceOf(ctx, meta),
        issueDate: formatDate(meta.issueDate),

        title: a.title,
        theme: a.theme ?? "",
        dates: formatDateRange(a.startDate, a.endDate),
        startDate: formatDateWithWeekday(a.startDate),
        endDate: formatDateWithWeekday(end),
        startDay: formatDayOrdinal(a.startDate),
        endDay: formatDayOrdinal(end),
        location: a.location ?? "",
        startTime: formatTime(a.startTime),
        startPlace: a.startPlace ?? "",
        endTime: formatTime(a.endTime),
        // Almost always the same place; only say otherwise when it was entered.
        endPlace: a.endPlace ?? a.startPlace ?? "",
        fee: a.fee ?? "",
        whatToBring: a.whatToBring ?? "",

        unit: ctx.unit.name,
        members: MEMBERS_WORD[ctx.unit.unitType] ?? "Scouts",
        ...genderedWords(ctx.unit.unitType),

        group: ctx.group.name,
        city: ctx.group.city,
        motto: ctx.group.motto,
        scoutYear: scoutYearLabel(scoutYearOf(meta.issueDate, m), m),

        confirmBy: "",
        campfireDate: "",
        campfireTime: "",
    };
}

/** Auto values with the circular's overrides applied on top. */
export function buildTokens(ctx: CircularContext, meta: CircularMeta, content: CircularContent): Record<string, string> {
    const tokens = autoTokens(ctx, meta);
    for (const [key, value] of Object.entries(content.values)) {
        if (value.trim() !== "") tokens[key] = value;
    }
    return tokens;
}

const TOKEN_RE = /\{\{\s*([a-zA-Z][a-zA-Z0-9]*)\s*\}\}/g;

/** Token names appearing in a piece of text, in order, without duplicates. */
export function tokensIn(text: string): string[] {
    const found: string[] = [];
    for (const m of text.matchAll(TOKEN_RE)) if (!found.includes(m[1])) found.push(m[1]);
    return found;
}

/** Every piece of text in a circular that can hold tokens. */
export function allText(content: CircularContent): string[] {
    const out = [content.theme, content.dateline, content.footerLeft, content.footerRight];
    for (const b of content.blocks) {
        if (b.type === "text" || b.type === "heading" || b.type === "signature") out.push(b.text);
        else if (b.type === "list") out.push(b.items);
        else if (b.type === "contacts") out.push(b.custom);
    }
    return out;
}

/** Token names the circular actually uses. */
export function usedTokens(content: CircularContent): string[] {
    return tokensIn(allText(content).join("\n"));
}

/**
 * For the optional one-liners (theme, dateline, footers): if any token in the
 * line is empty the whole line is dropped, quietly. A group without a year
 * motto should get no footer text — not a "[year motto]" on every page.
 */
export function fillOptionalLine(text: string, tokens: Record<string, string>): string {
    const empty = tokensIn(text).some(key => !tokens[key] || tokens[key].trim() === "");
    return empty ? "" : text.replace(TOKEN_RE, (_, key: string) => tokens[key]);
}

/**
 * Replace tokens in `text`. Names that have no value are left visible as
 * `[name]` and added to `missing`.
 */
export function fillTokens(text: string, tokens: Record<string, string>, missing: string[]): string {
    return text.replace(TOKEN_RE, (match: string, key: string, offset: number) => {
        const value = tokens[key];
        if (value != null && value.trim() !== "") {
            // "…starting at {{campfireTime}}." with "5:00 p.m." must not end "p.m..".
            const sentenceEnds = text[offset + match.length] === ".";
            return sentenceEnds && value.endsWith(".") ? value.slice(0, -1) : value;
        }
        if (!missing.includes(key)) missing.push(key);
        // "Start day (22nd)" → "[start day]"
        const label = TOKEN_BY_KEY[key]?.label.replace(/\s*\(.*\)$/, "").toLowerCase() ?? key;
        return `[${label}]`;
    });
}
