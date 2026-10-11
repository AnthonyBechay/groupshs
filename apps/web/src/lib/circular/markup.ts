/**
 * The tiny inline markup used in circular text:
 *
 *     **bold**   *italic*   __underline__
 *
 * Deliberately not Markdown. Leaders type these letters, not developers, so a
 * stray `*` (as in "5 * 3", or a footnote star) must print as a star instead of
 * turning the rest of the paragraph italic: a marker only counts when it has a
 * partner later in the same line.
 */

import type { Run } from "./types";

type Marker = "**" | "__" | "*";
const STYLE: Record<Marker, "bold" | "underline" | "italic"> = { "**": "bold", "__": "underline", "*": "italic" };

function tokenize(line: string): string[] {
    // `**` before `*`, so bold is not read as two italics.
    return line.split(/(\*\*|__|\*)/).filter(part => part !== "");
}

export function parseInline(line: string): Run[] {
    const parts = tokenize(line);

    // A marker type with an odd count has one orphan; the LAST one is literal.
    const literal = new Set<number>();
    for (const marker of ["**", "__", "*"] as Marker[]) {
        const at = parts.flatMap((p, i) => (p === marker ? [i] : []));
        if (at.length % 2 === 1) literal.add(at[at.length - 1]);
    }

    const runs: Run[] = [];
    const on = { bold: false, italic: false, underline: false };
    const push = (text: string) => {
        const last = runs[runs.length - 1];
        if (last && !!last.bold === on.bold && !!last.italic === on.italic && !!last.underline === on.underline) {
            last.text += text;
            return;
        }
        runs.push({
            text,
            ...(on.bold ? { bold: true } : {}),
            ...(on.italic ? { italic: true } : {}),
            ...(on.underline ? { underline: true } : {}),
        });
    };

    parts.forEach((part, i) => {
        if ((part === "**" || part === "__" || part === "*") && !literal.has(i)) {
            const style = STYLE[part];
            on[style] = !on[style];
        } else {
            push(part);
        }
    });
    return runs;
}

/** The text of some runs with the styling dropped. */
export function plainText(runs: Run[]): string {
    return runs.map(r => r.text).join("");
}
