/**
 * Turn a stored circular into exactly what gets drawn: tokens filled, markup
 * parsed, lists split into columns. The PDF and Word renderers both consume
 * this, so the two files cannot disagree about the content — only about how a
 * paragraph is painted.
 */

import type {
    Align, CircularContent, CircularContext, CircularMeta, ContactRow, Para, ResolvedBlock, ResolvedCircular, Run,
} from "./types";
import { buildTokens, fillOptionalLine, fillTokens } from "./tokens";
import { parseInline } from "./markup";

/** Characters the editor (or a paste from Word) may add that should not print. */
function clean(text: string): string {
    return text.replace(/\r\n?/g, "\n").replace(/[​-‍﻿]/g, "").replace(/ /g, " ");
}

function textToParas(text: string, align: Align): Para[] {
    const paras: Para[] = [];
    let gap = false;
    for (const raw of clean(text).split("\n")) {
        const line = raw.trimEnd();
        if (line.trim() === "") { gap = paras.length > 0; continue; }

        let rest = line.trimStart();
        let indent = false;
        let bullet: Para["bullet"] = "";
        if (rest.startsWith("> ") || rest === ">") { indent = true; rest = rest.slice(1).trimStart(); }
        if (rest.startsWith("- ")) { bullet = "-"; rest = rest.slice(2).trimStart(); }
        else if (rest.startsWith("• ")) { bullet = "•"; rest = rest.slice(2).trimStart(); }

        paras.push({ runs: parseInline(rest), align, indent, bullet, gapBefore: gap });
        gap = false;
    }
    return paras;
}

function listItems(text: string, marker: "none" | "dash" | "bullet"): Para[] {
    const bullet: Para["bullet"] = marker === "dash" ? "-" : marker === "bullet" ? "•" : "";
    return clean(text)
        .split("\n")
        // People paste lists that already carry their own dashes or bullets.
        .map(line => line.trim().replace(/^[-•*]\s+/, ""))
        .filter(line => line !== "")
        .map(line => ({ runs: parseInline(line), align: "left" as Align, indent: false, bullet, gapBefore: false }));
}

/** `CM | Jane Eid | 71 904 834`, one per line. Tabs and 2+ spaces also separate. */
export function parseContacts(text: string): ContactRow[] {
    return clean(text)
        .split("\n")
        .map(line => line.trim())
        .filter(Boolean)
        .map(line => {
            const cells = (line.includes("|") ? line.split("|") : line.split(/\t+| {2,}/)).map(c => c.trim());
            if (cells.length === 1) return { role: "", name: cells[0], phone: "" };
            if (cells.length === 2) return { role: "", name: cells[0], phone: cells[1] };
            return { role: cells[0], name: cells[1], phone: cells.slice(2).join(" ") };
        });
}

export function resolveCircular(content: CircularContent, ctx: CircularContext, meta: CircularMeta): ResolvedCircular {
    const tokens = buildTokens(ctx, meta, content);
    const missing: string[] = [];
    const fill = (text: string) => fillTokens(text, tokens, missing);
    const oneLine = (text: string) => clean(text).replace(/\n+/g, " ").trim();
    const line = (text: string): Run[] => parseInline(oneLine(fill(text)));
    const optional = (text: string) => oneLine(fillOptionalLine(text, tokens));

    const blocks: ResolvedBlock[] = [];
    for (const b of content.blocks) {
        switch (b.type) {
            case "text": {
                const paras = textToParas(fill(b.text), b.align);
                if (paras.length) blocks.push({ type: "paras", paras });
                break;
            }
            case "heading": {
                const runs = line(b.text);
                if (runs.length) blocks.push({ type: "heading", runs });
                break;
            }
            case "list": {
                const items = listItems(fill(b.items), b.marker);
                if (!items.length) break;
                if (b.columns === 2 && items.length > 1) {
                    const half = Math.ceil(items.length / 2);
                    blocks.push({ type: "columns", left: items.slice(0, half), right: items.slice(half) });
                } else {
                    blocks.push({ type: "paras", paras: items.map((p, i) => ({ ...p, indent: true, gapBefore: i === 0 })) });
                }
                break;
            }
            case "contacts": {
                const rows = b.source === "custom" ? parseContacts(fill(b.custom)) : ctx.unit.contacts;
                if (rows.length) blocks.push({ type: "contacts", rows });
                else if (!missing.includes("contacts")) missing.push("contacts");
                break;
            }
            case "signature": {
                const lines = clean(fill(b.text)).split("\n").map(l => l.trim()).filter(Boolean).map(l => parseInline(l));
                if (lines.length || b.stamp) blocks.push({ type: "signature", lines, stamp: b.stamp });
                break;
            }
            case "pageBreak":
                // A break with nothing before it would only produce a blank page.
                if (blocks.length && blocks[blocks.length - 1].type !== "pageBreak") blocks.push({ type: "pageBreak" });
                break;
        }
    }
    while (blocks.length && blocks[blocks.length - 1].type === "pageBreak") blocks.pop();

    return {
        reference: content.showReference ? tokens.reference : "",
        theme: parseInline(optional(content.theme)),
        dateline: parseInline(optional(content.dateline)),
        footerLeft: optional(content.footerLeft),
        footerRight: optional(content.footerRight),
        groupName: ctx.group.name,
        blocks,
        missing,
    };
}
