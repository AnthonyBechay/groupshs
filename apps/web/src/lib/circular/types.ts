/**
 * The circular document model.
 *
 * A circular is a short list of BLOCKS. Text inside a block may contain
 * `{{tokens}}` that are filled from the activity, the unit and the group
 * settings each time the circular is rendered — so correcting the camp dates on
 * the activity corrects every circular that mentions them. Anything can still
 * be overridden per circular (`values`) or simply typed over.
 *
 * This file is pure data: no React, no database, no rendering. It is imported
 * by the browser editor and by the server renderers alike.
 */

export type Align = "left" | "justify" | "center" | "right";

type BlockBase = {
    id: string;
    /** Shown above the block in the editor so it is obvious what to write there. */
    label?: string;
};

/**
 * Free text. One block is one visual paragraph group; inside it:
 *   a new line          → a new line, no gap
 *   an empty line       → a paragraph gap
 *   a line starting "- " → a dash bullet        ("• " → a round bullet)
 *   a line starting "> " → an indented line
 *   **bold**  *italic*  __underline__
 */
export type TextBlock = BlockBase & { type: "text"; text: string; align: Align };

/** A boxed, centered title — "Campfire Invitation". */
export type HeadingBlock = BlockBase & { type: "heading"; text: string };

/** One item per line, optionally flowed into two columns (packing lists). */
export type ListBlock = BlockBase & {
    type: "list";
    items: string;
    marker: "none" | "dash" | "bullet";
    columns: 1 | 2;
};

/**
 * Who to confirm with. `unit` reads the unit's contact persons live, so a
 * change of maîtrise shows up without touching the circular. `custom` is one
 * person per line: `CM | Jane Eid | 71 904 834`.
 */
export type ContactsBlock = BlockBase & { type: "contacts"; source: "unit" | "custom"; custom: string };

/** Right-aligned closing, with the group stamp underneath when asked. */
export type SignatureBlock = BlockBase & { type: "signature"; text: string; stamp: boolean };

export type PageBreakBlock = BlockBase & { type: "pageBreak" };

export type Block = TextBlock | HeadingBlock | ListBlock | ContactsBlock | SignatureBlock | PageBreakBlock;
export type BlockType = Block["type"];

export type CircularContent = {
    version: 1;
    /** The three lines under the letterhead on the first page. Empty = omitted. */
    showReference: boolean;
    theme: string;
    dateline: string;
    /** Page footer, every page. */
    footerLeft: string;
    footerRight: string;
    /** Per-circular overrides of token values, keyed by token name. */
    values: Record<string, string>;
    blocks: Block[];
};

/** Everything a circular reads from the rest of the system. Plain JSON. */
export type CircularContext = {
    activity: {
        id: string;
        title: string;
        activityType: string;
        startDate: string;          // ISO
        endDate: string | null;     // ISO
        location: string | null;
        /** Families bring the children here… (the form's "Dropoff (start)") */
        startTime: string | null;   // "08:30"
        startPlace: string | null;
        /** …and collect them here (the form's "Pickup (end)"). */
        endTime: string | null;
        endPlace: string | null;
        theme: string | null;
        fee: string | null;
        whatToBring: string | null;
    };
    unit: {
        id: string;
        name: string;
        unitType: string;
        logoUrl: string | null;
        contacts: ContactRow[];
    };
    group: {
        name: string;
        city: string;
        motto: string;
        logoUrl: string | null;
        associationLogoUrl: string | null;
        stampUrl: string | null;
        fiscalYearStartMonth: number;
    };
};

export type ContactRow = { role: string; name: string; phone: string };

/** The circular's own identity, which also feeds tokens. */
export type CircularMeta = {
    seq: number;
    issueDate: string;              // ISO
    referenceOverride: string | null;
};

// ─── Resolved form: what the renderers draw ───────────────────────────────────

export type Run = { text: string; bold?: boolean; italic?: boolean; underline?: boolean };

export type Para = {
    runs: Run[];
    align: Align;
    indent: boolean;
    bullet: "" | "-" | "•";
    /** Leave a paragraph gap above this line. */
    gapBefore: boolean;
};

export type ResolvedBlock =
    | { type: "paras"; paras: Para[] }
    | { type: "heading"; runs: Run[] }
    | { type: "columns"; left: Para[]; right: Para[] }
    | { type: "contacts"; rows: ContactRow[] }
    | { type: "signature"; lines: Run[][]; stamp: boolean }
    | { type: "pageBreak" };

export type ResolvedCircular = {
    reference: string;              // "" when hidden
    theme: Run[];
    dateline: Run[];
    footerLeft: string;
    footerRight: string;
    groupName: string;
    blocks: ResolvedBlock[];
    /** Token names that are used but have no value — shown as [name] in the output. */
    missing: string[];
};

// ─── Normalization ────────────────────────────────────────────────────────────

const ALIGNS: Align[] = ["left", "justify", "center", "right"];
const MAX_BLOCKS = 80;
const MAX_TEXT = 20_000;

const str = (v: unknown, max = MAX_TEXT) => (typeof v === "string" ? v.slice(0, max) : "");

export function newBlockId(): string {
    return Math.random().toString(36).slice(2, 10);
}

/**
 * Coerce untrusted JSON (a request body, or an old row) into a valid
 * CircularContent. Unknown block types are dropped rather than rejected, so a
 * circular saved by a newer version of the app still opens.
 */
export function normalizeContent(input: unknown): CircularContent {
    const src = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
    const rawBlocks = Array.isArray(src.blocks) ? src.blocks.slice(0, MAX_BLOCKS) : [];

    const blocks: Block[] = [];
    for (const raw of rawBlocks) {
        if (!raw || typeof raw !== "object") continue;
        const b = raw as Record<string, unknown>;
        const base = { id: str(b.id, 40) || newBlockId(), ...(b.label ? { label: str(b.label, 120) } : {}) };
        switch (b.type) {
            case "text":
                blocks.push({ ...base, type: "text", text: str(b.text), align: ALIGNS.includes(b.align as Align) ? (b.align as Align) : "justify" });
                break;
            case "heading":
                blocks.push({ ...base, type: "heading", text: str(b.text, 500) });
                break;
            case "list":
                blocks.push({
                    ...base, type: "list", items: str(b.items),
                    marker: b.marker === "dash" || b.marker === "bullet" ? b.marker : "none",
                    columns: b.columns === 2 ? 2 : 1,
                });
                break;
            case "contacts":
                blocks.push({ ...base, type: "contacts", source: b.source === "custom" ? "custom" : "unit", custom: str(b.custom, 4000) });
                break;
            case "signature":
                blocks.push({ ...base, type: "signature", text: str(b.text, 1000), stamp: b.stamp !== false });
                break;
            case "pageBreak":
                blocks.push({ ...base, type: "pageBreak" });
                break;
        }
    }

    const values: Record<string, string> = {};
    if (src.values && typeof src.values === "object") {
        for (const [k, v] of Object.entries(src.values as Record<string, unknown>).slice(0, 60)) {
            if (/^[a-zA-Z][a-zA-Z0-9]{0,39}$/.test(k) && typeof v === "string" && v.trim() !== "") values[k] = v.slice(0, MAX_TEXT);
        }
    }

    return {
        version: 1,
        showReference: src.showReference !== false,
        theme: str(src.theme, 500),
        dateline: str(src.dateline, 500),
        footerLeft: str(src.footerLeft, 300),
        footerRight: str(src.footerRight, 300),
        values,
        blocks,
    };
}
