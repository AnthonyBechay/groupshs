"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
    ArrowLeft, ArrowUp, ArrowDown, Trash2, Save, FileDown, AlertTriangle, Check, Plus, RotateCcw, Loader2,
} from "lucide-react";
import { useDirtyTracker, useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import type { Align, Block, BlockType, CircularContent, CircularContext } from "@/lib/circular/types";
import { newBlockId } from "@/lib/circular/types";
import { autoTokens, referenceOf, TOKEN_BY_KEY, TOKEN_DEFS, usedTokens } from "@/lib/circular/tokens";
import { resolveCircular } from "@/lib/circular/resolve";

type Loaded = {
    id: string;
    seq: number;
    referenceOverride: string | null;
    title: string;
    issueDate: string;
    content: CircularContent;
};

/** The editable state of a circular, as one value so it can be diffed and sent. */
type Draft = { title: string; issueDate: string; seq: number; referenceOverride: string; content: CircularContent };

const FIELD = "flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm";
const SELECT = "h-8 rounded-md border border-input bg-background px-2 text-xs";

const BLOCK_NAMES: Record<BlockType, string> = {
    text: "Paragraph",
    heading: "Boxed title",
    list: "List",
    contacts: "Contact persons",
    signature: "Signature",
    pageBreak: "Page break",
};

function emptyBlock(type: BlockType): Block {
    const id = newBlockId();
    switch (type) {
        case "text": return { id, type, text: "", align: "justify" };
        case "heading": return { id, type, text: "" };
        case "list": return { id, type, items: "", marker: "bullet", columns: 1 };
        case "contacts": return { id, type, source: "unit", custom: "" };
        case "signature": return { id, type, text: "Scoutly Yours,\nMaîtrise {{unit}}", stamp: true };
        case "pageBreak": return { id, type };
    }
}

/** Enough rows to show the text without scrolling inside the box. */
function rowsFor(text: string, min = 2): number {
    const lines = text.split("\n").reduce((n, line) => n + Math.max(1, Math.ceil(line.length / 88)), 0);
    return Math.min(22, Math.max(min, lines + 1));
}

export default function CircularEditorPage() {
    const { id: activityId, circularId } = useParams<{ id: string; circularId: string }>();
    const [ctx, setCtx] = useState<CircularContext | null>(null);
    const [draft, setDraft] = useState<Draft | null>(null);
    const [loadError, setLoadError] = useState("");
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

    const tracker = useDirtyTracker<Draft | { empty: true }>(draft ?? { empty: true });
    useUnsavedChanges(tracker.dirty && draft !== null, "This circular has unsaved changes. Leave and discard them?");

    function adopt(circular: Loaded): Draft {
        return {
            title: circular.title,
            issueDate: circular.issueDate.slice(0, 10),
            seq: circular.seq,
            referenceOverride: circular.referenceOverride ?? "",
            content: circular.content,
        };
    }

    useEffect(() => {
        let cancelled = false;
        fetch(`/api/admin/circulars/${circularId}`).then(async res => {
            const json = await res.json().catch(() => ({}));
            if (cancelled) return;
            if (!res.ok) { setLoadError(json.error || "Could not load the circular"); return; }
            setCtx(json.context);
            const loaded = adopt(json.circular);
            setDraft(loaded);
            tracker.markClean(loaded);
        });
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [circularId]);

    // ─── Live values ─────────────────────────────────────────────────────────

    const meta = useMemo(() => draft && ({
        seq: draft.seq || 1,
        issueDate: `${draft.issueDate || "1970-01-01"}T00:00:00.000Z`,
        referenceOverride: draft.referenceOverride.trim() || null,
    }), [draft]);

    const auto = useMemo(() => (ctx && meta ? autoTokens(ctx, meta) : {}), [ctx, meta]);
    const missing = useMemo(
        () => (ctx && meta && draft ? resolveCircular(draft.content, ctx, meta).missing : []),
        [ctx, meta, draft]
    );

    // ─── Preview: the real PDF, regenerated shortly after typing stops ───────

    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [previewBusy, setPreviewBusy] = useState(false);
    const [previewFailed, setPreviewFailed] = useState(false);
    const draftJson = draft ? JSON.stringify(draft) : null;

    useEffect(() => {
        if (!draftJson) return;
        const controller = new AbortController();
        const timer = setTimeout(async () => {
            setPreviewBusy(true);
            try {
                const res = await fetch(`/api/admin/circulars/${circularId}/file?format=pdf`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: draftJson,
                    signal: controller.signal,
                });
                if (!res.ok) throw new Error("preview failed");
                const url = URL.createObjectURL(await res.blob());
                setPreviewFailed(false);
                setPreviewUrl(old => { if (old) URL.revokeObjectURL(old); return url; });
            } catch (error) {
                if ((error as Error).name !== "AbortError") setPreviewFailed(true);
            } finally {
                if (!controller.signal.aborted) setPreviewBusy(false);
            }
        }, 700);
        return () => { clearTimeout(timer); controller.abort(); };
    }, [draftJson, circularId]);

    // ─── Inserting a token where the cursor last was ─────────────────────────

    const lastField = useRef<{ el: HTMLTextAreaElement | HTMLInputElement; apply: (value: string) => void } | null>(null);
    const remember = (apply: (value: string) => void) =>
        (e: React.FocusEvent<HTMLTextAreaElement | HTMLInputElement>) => { lastField.current = { el: e.currentTarget, apply }; };

    function insertToken(key: string) {
        const target = lastField.current;
        if (!target) { setMessage({ kind: "error", text: "Click in a text box first, then pick what to insert." }); return; }
        const { el, apply } = target;
        const start = el.selectionStart ?? el.value.length;
        const end = el.selectionEnd ?? start;
        const token = `{{${key}}}`;
        apply(el.value.slice(0, start) + token + el.value.slice(end));
        requestAnimationFrame(() => { el.focus(); el.setSelectionRange(start + token.length, start + token.length); });
    }

    if (loadError) {
        return (
            <div className="max-w-xl">
                <Link href={`/admin/activities/${activityId}/circulars`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary">
                    <ArrowLeft className="w-4 h-4" /> Circulars
                </Link>
                <p className="text-destructive mt-4">{loadError}</p>
            </div>
        );
    }
    if (!ctx || !draft || !meta) return <p className="text-muted-foreground">Loading...</p>;

    // ─── Editing helpers ─────────────────────────────────────────────────────

    const patch = (changes: Partial<Draft>) => setDraft(d => (d ? { ...d, ...changes } : d));
    const patchContent = (changes: Partial<CircularContent>) => setDraft(d => (d ? { ...d, content: { ...d.content, ...changes } } : d));
    const setBlocks = (fn: (blocks: Block[]) => Block[]) => setDraft(d => (d ? { ...d, content: { ...d.content, blocks: fn(d.content.blocks) } } : d));
    const patchBlock = (blockId: string, changes: Partial<Block>) =>
        setBlocks(blocks => blocks.map(b => (b.id === blockId ? ({ ...b, ...changes } as Block) : b)));
    const moveBlock = (index: number, by: -1 | 1) => setBlocks(blocks => {
        const to = index + by;
        if (to < 0 || to >= blocks.length) return blocks;
        const next = [...blocks];
        [next[index], next[to]] = [next[to], next[index]];
        return next;
    });
    const setValue = (key: string, value: string) => {
        const values = { ...draft.content.values };
        if (value.trim() === "") delete values[key]; else values[key] = value;
        patchContent({ values });
    };

    const reference = referenceOf(ctx, meta);
    const used = usedTokens(draft.content);
    // Reference and date have their own card; everything else used by the
    // letter is listed under "Details", unknown names included so a typo shows.
    const detailKeys = used.filter(k => k !== "reference" && k !== "issueDate");
    const usesUnitContacts = draft.content.blocks.some(b => b.type === "contacts" && b.source === "unit");

    async function save() {
        if (!draft) return;
        setSaving(true);
        setMessage(null);
        const res = await fetch(`/api/admin/circulars/${circularId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...draft, referenceOverride: draft.referenceOverride.trim() || null }),
        });
        const json = await res.json().catch(() => ({}));
        setSaving(false);
        if (!res.ok) { setMessage({ kind: "error", text: json.error || "Could not save the circular" }); return; }
        const saved = adopt(json.circular);
        setCtx(json.context);
        setDraft(saved);
        tracker.markClean(saved);
        setMessage({ kind: "ok", text: "Saved" });
        setTimeout(() => setMessage(m => (m?.kind === "ok" ? null : m)), 2500);
    }

    /** Download exactly what the preview shows, saved or not. */
    async function download(format: "pdf" | "docx") {
        const res = await fetch(`/api/admin/circulars/${circularId}/file?format=${format}&download=1`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(draft),
        });
        if (!res.ok) { setMessage({ kind: "error", text: "Could not generate the file" }); return; }
        const url = URL.createObjectURL(await res.blob());
        const link = document.createElement("a");
        link.href = url;
        link.download = `Circular-${reference.replace(/[^\p{L}\p{N}]+/gu, "-")}.${format}`;
        // Our own download must not look like "leaving the page" to the guard.
        link.dataset.skipUnsavedGuard = "true";
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
    }

    return (
        <div>
            {/* Top bar */}
            <div className="flex flex-wrap items-center gap-3 mb-6">
                <Link href={`/admin/activities/${activityId}/circulars`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary">
                    <ArrowLeft className="w-4 h-4" /> Circulars
                </Link>
                <div className="flex-1 min-w-[220px]">
                    <Input
                        value={draft.title}
                        onChange={e => patch({ title: e.target.value })}
                        className="text-lg font-semibold h-10"
                        aria-label="Circular name"
                    />
                </div>
                <div className="flex items-center gap-2">
                    {message && (
                        <span className={`text-sm font-medium ${message.kind === "ok" ? "text-emerald-600" : "text-destructive"}`}>{message.text}</span>
                    )}
                    <Button variant="outline" onClick={() => download("pdf")} className="gap-2"><FileDown className="w-4 h-4" /> PDF</Button>
                    <Button variant="outline" onClick={() => download("docx")} className="gap-2"><FileDown className="w-4 h-4" /> Word</Button>
                    <Button onClick={save} disabled={saving || !tracker.dirty} className="gap-2">
                        <Save className="w-4 h-4" /> {saving ? "Saving..." : tracker.dirty ? "Save" : "Saved"}
                    </Button>
                </div>
            </div>

            <div className="grid xl:grid-cols-[minmax(0,1fr)_minmax(0,34rem)] gap-6 items-start">
                <div className="space-y-5 min-w-0">
                    {/* 1 · Reference and date */}
                    <Section step="1" title="Reference and date">
                        <div className="grid sm:grid-cols-[7rem_11rem_1fr] gap-4 items-end">
                            <div className="space-y-1.5">
                                <Label htmlFor="seq">Number</Label>
                                <Input id="seq" type="number" min={1} value={draft.seq || ""} onChange={e => patch({ seq: parseInt(e.target.value) || 0 })} />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="issueDate">Letter date</Label>
                                <Input id="issueDate" type="date" value={draft.issueDate} onChange={e => patch({ issueDate: e.target.value })} />
                            </div>
                            <div className="rounded-xl bg-muted/40 border px-3 py-2">
                                <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Reference</div>
                                <div className="font-mono font-bold">Ref. {reference}</div>
                            </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            The number was taken automatically: it is the next one for the whole group this scout year, whichever unit writes the circular.
                        </p>
                        <details className="text-sm">
                            <summary className="cursor-pointer text-xs font-bold text-primary">Reference options</summary>
                            <div className="mt-3 space-y-3">
                                <div className="space-y-1.5">
                                    <Label htmlFor="referenceOverride">Write the reference by hand</Label>
                                    <Input
                                        id="referenceOverride"
                                        value={draft.referenceOverride}
                                        onChange={e => patch({ referenceOverride: e.target.value })}
                                        placeholder={referenceOf(ctx, { ...meta, referenceOverride: null })}
                                    />
                                    <p className="text-xs text-muted-foreground">Leave empty to keep the automatic one.</p>
                                </div>
                                <label className="flex items-center gap-2 text-sm">
                                    <input type="checkbox" className="accent-primary" checked={draft.content.showReference} onChange={e => patchContent({ showReference: e.target.checked })} />
                                    Print the reference on the letter
                                </label>
                            </div>
                        </details>
                    </Section>

                    {/* 2 · Details */}
                    <Section
                        step="2"
                        title="Details"
                        aside={missing.length
                            ? <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700"><AlertTriangle className="w-3.5 h-3.5" /> {missing.length} to fill in</span>
                            : <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600"><Check className="w-3.5 h-3.5" /> All filled</span>}
                    >
                        <p className="text-xs text-muted-foreground">
                            Everything the letter mentions. Values come from the activity, the unit and the settings; type in a box to use
                            something different on this circular only.
                        </p>
                        <div className="divide-y -my-1">
                            {detailKeys.map(key => {
                                const def = TOKEN_BY_KEY[key];
                                const override = draft.content.values[key] ?? "";
                                const automatic = auto[key] ?? "";
                                const isMissing = !override && !automatic;
                                return (
                                    <div key={key} className="py-2.5 grid sm:grid-cols-[10rem_1fr] gap-x-4 gap-y-1 items-start">
                                        <div className="pt-1.5">
                                            <div className="text-sm font-medium">{def?.label ?? key}</div>
                                            <div className="text-[11px] font-mono text-muted-foreground">{`{{${key}}}`}</div>
                                        </div>
                                        <div>
                                            {def?.multiline ? (
                                                <textarea
                                                    value={override}
                                                    onChange={e => setValue(key, e.target.value)}
                                                    placeholder={automatic || "Not set"}
                                                    rows={rowsFor(override || automatic, 2)}
                                                    className={`${FIELD} ${isMissing ? "border-amber-400 bg-amber-50/50" : ""}`}
                                                />
                                            ) : (
                                                <Input
                                                    value={override}
                                                    onChange={e => setValue(key, e.target.value)}
                                                    placeholder={automatic || (def ? "Type it here" : "Unknown name — check the spelling")}
                                                    className={isMissing ? "border-amber-400 bg-amber-50/50" : ""}
                                                />
                                            )}
                                            <div className="text-[11px] mt-1 flex items-center gap-2">
                                                {override ? (
                                                    <>
                                                        <span className="text-primary font-medium">Changed for this circular</span>
                                                        <button type="button" onClick={() => setValue(key, "")} className="inline-flex items-center gap-1 text-muted-foreground hover:text-primary">
                                                            <RotateCcw className="w-3 h-3" /> {automatic ? `use "${automatic.length > 40 ? automatic.slice(0, 40) + "…" : automatic}"` : "clear"}
                                                        </button>
                                                    </>
                                                ) : isMissing ? (
                                                    <span className="text-amber-700 font-medium">
                                                        {def?.from ? `Missing — type it here, or set it in ${def.from}` : def ? "Type it here" : "This name is not known"}
                                                    </span>
                                                ) : (
                                                    <span className="text-muted-foreground">From {def?.from}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            {usesUnitContacts && (
                                <div className="py-2.5 grid sm:grid-cols-[10rem_1fr] gap-x-4 gap-y-1 items-start">
                                    <div className="pt-1.5 text-sm font-medium">Contact persons</div>
                                    <div>
                                        {ctx.unit.contacts.length ? (
                                            <div className="text-sm rounded-md border bg-muted/30 px-3 py-2 space-y-0.5">
                                                {ctx.unit.contacts.map((c, i) => (
                                                    <div key={i} className="grid grid-cols-[3.5rem_1fr_auto] gap-2">
                                                        <span className="font-bold">{c.role}</span><span>{c.name}</span><span className="text-muted-foreground">{c.phone}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-sm rounded-md border border-amber-400 bg-amber-50/50 px-3 py-2 text-amber-800">
                                                {ctx.unit.name} has no contact persons yet.
                                            </div>
                                        )}
                                        <div className="text-[11px] mt-1 text-muted-foreground">
                                            From <Link href="/admin/units" className="text-primary font-medium hover:underline">Unit → Contact persons</Link>.
                                            To list other people on this circular, switch its contacts block to &quot;Typed here&quot;.
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </Section>

                    {/* 3 · Letter */}
                    <Section step="3" title="Letter">
                        <div className="rounded-xl border bg-muted/30 p-3 space-y-2">
                            <div className="text-xs text-muted-foreground">
                                <strong className="text-foreground">Formatting:</strong>{" "}
                                <code>**bold**</code> · <code>*italic*</code> · <code>__underline__</code> · start a line with <code>- </code> for a bullet
                                or <code>&gt; </code> to indent it · leave an empty line between paragraphs.
                            </div>
                            <div className="flex flex-wrap gap-1.5 items-center">
                                <span className="text-xs font-bold text-foreground mr-1">Insert:</span>
                                {TOKEN_DEFS.map(t => (
                                    <button
                                        key={t.key}
                                        type="button"
                                        // Keep the caret in the text box being edited.
                                        onMouseDown={e => e.preventDefault()}
                                        onClick={() => insertToken(t.key)}
                                        title={auto[t.key] ? `Now: ${auto[t.key]}` : "No value yet"}
                                        className="px-2 py-0.5 rounded-full border bg-background text-[11px] font-medium hover:border-primary hover:text-primary"
                                    >
                                        {t.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-3">
                            {draft.content.blocks.map((block, index) => (
                                <div key={block.id} className={`rounded-xl border ${block.type === "pageBreak" ? "border-dashed bg-muted/20" : "bg-background"}`}>
                                    <div className="flex items-center gap-2 px-3 pt-2">
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                            {block.label ? `${block.label}` : BLOCK_NAMES[block.type]}
                                        </span>
                                        {block.label && block.type !== "text" && (
                                            <span className="text-[10px] text-muted-foreground/70">· {BLOCK_NAMES[block.type]}</span>
                                        )}
                                        <div className="ml-auto flex items-center gap-1">
                                            {block.type === "text" && (
                                                <select value={block.align} onChange={e => patchBlock(block.id, { align: e.target.value as Align })} className={SELECT} aria-label="Alignment">
                                                    <option value="justify">Justified</option>
                                                    <option value="left">Left</option>
                                                    <option value="center">Centered</option>
                                                    <option value="right">Right</option>
                                                </select>
                                            )}
                                            {block.type === "list" && (
                                                <>
                                                    <select value={block.marker} onChange={e => patchBlock(block.id, { marker: e.target.value as "none" | "dash" | "bullet" })} className={SELECT} aria-label="Marker">
                                                        <option value="bullet">• Bullets</option>
                                                        <option value="dash">- Dashes</option>
                                                        <option value="none">No marker</option>
                                                    </select>
                                                    <select value={block.columns} onChange={e => patchBlock(block.id, { columns: e.target.value === "2" ? 2 : 1 })} className={SELECT} aria-label="Columns">
                                                        <option value="1">1 column</option>
                                                        <option value="2">2 columns</option>
                                                    </select>
                                                </>
                                            )}
                                            {block.type === "contacts" && (
                                                <select value={block.source} onChange={e => patchBlock(block.id, { source: e.target.value as "unit" | "custom" })} className={SELECT} aria-label="Contacts source">
                                                    <option value="unit">Unit contact persons</option>
                                                    <option value="custom">Typed here</option>
                                                </select>
                                            )}
                                            <button type="button" onClick={() => moveBlock(index, -1)} disabled={index === 0} className="p-1 rounded hover:bg-muted disabled:opacity-30" title="Move up"><ArrowUp className="w-3.5 h-3.5" /></button>
                                            <button type="button" onClick={() => moveBlock(index, 1)} disabled={index === draft.content.blocks.length - 1} className="p-1 rounded hover:bg-muted disabled:opacity-30" title="Move down"><ArrowDown className="w-3.5 h-3.5" /></button>
                                            <button type="button" onClick={() => setBlocks(blocks => blocks.filter(b => b.id !== block.id))} className="p-1 rounded text-destructive hover:bg-destructive/10" title="Remove"><Trash2 className="w-3.5 h-3.5" /></button>
                                        </div>
                                    </div>

                                    <div className="p-3 pt-2">
                                        {block.type === "text" && (
                                            <textarea
                                                value={block.text}
                                                onChange={e => patchBlock(block.id, { text: e.target.value })}
                                                onFocus={remember(value => patchBlock(block.id, { text: value }))}
                                                rows={rowsFor(block.text)}
                                                className={FIELD}
                                            />
                                        )}
                                        {block.type === "heading" && (
                                            <Input
                                                value={block.text}
                                                onChange={e => patchBlock(block.id, { text: e.target.value })}
                                                onFocus={remember(value => patchBlock(block.id, { text: value }))}
                                                className="text-center"
                                            />
                                        )}
                                        {block.type === "list" && (
                                            <>
                                                <textarea
                                                    value={block.items}
                                                    onChange={e => patchBlock(block.id, { items: e.target.value })}
                                                    onFocus={remember(value => patchBlock(block.id, { items: value }))}
                                                    rows={rowsFor(block.items, 3)}
                                                    className={FIELD}
                                                />
                                                <p className="text-[11px] text-muted-foreground mt-1">One item per line.</p>
                                            </>
                                        )}
                                        {block.type === "contacts" && (block.source === "custom" ? (
                                            <>
                                                <textarea
                                                    value={block.custom}
                                                    onChange={e => patchBlock(block.id, { custom: e.target.value })}
                                                    onFocus={remember(value => patchBlock(block.id, { custom: value }))}
                                                    rows={rowsFor(block.custom, 3)}
                                                    placeholder={"CM | Jane Eid | 71 904 834\nACM | Julie Jallad | 76 304 420"}
                                                    className={`${FIELD} font-mono`}
                                                />
                                                <p className="text-[11px] text-muted-foreground mt-1">One person per line: role | name | phone.</p>
                                            </>
                                        ) : (
                                            <p className="text-xs text-muted-foreground">
                                                Prints the contact persons of {ctx.unit.name} ({ctx.unit.contacts.length || "none yet"}), always up to date.
                                            </p>
                                        ))}
                                        {block.type === "signature" && (
                                            <>
                                                <textarea
                                                    value={block.text}
                                                    onChange={e => patchBlock(block.id, { text: e.target.value })}
                                                    onFocus={remember(value => patchBlock(block.id, { text: value }))}
                                                    rows={rowsFor(block.text)}
                                                    className={`${FIELD} text-right`}
                                                />
                                                <label className="flex items-center gap-2 text-xs mt-2">
                                                    <input type="checkbox" className="accent-primary" checked={block.stamp} onChange={e => patchBlock(block.id, { stamp: e.target.checked })} />
                                                    Print the group stamp underneath
                                                    {block.stamp && !ctx.group.stampUrl && (
                                                        <span className="text-muted-foreground">
                                                            — none uploaded yet (<Link href="/admin/settings" className="text-primary hover:underline">Settings</Link>)
                                                        </span>
                                                    )}
                                                </label>
                                            </>
                                        )}
                                        {block.type === "pageBreak" && (
                                            <p className="text-xs text-muted-foreground text-center">What follows starts on a new page.</p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 pt-1">
                            <span className="text-xs font-bold text-muted-foreground mr-1">Add at the end:</span>
                            {(Object.keys(BLOCK_NAMES) as BlockType[]).map(type => (
                                <Button key={type} type="button" variant="outline" size="sm" onClick={() => setBlocks(blocks => [...blocks, emptyBlock(type)])} className="gap-1.5 h-8 text-xs">
                                    <Plus className="w-3 h-3" /> {BLOCK_NAMES[type]}
                                </Button>
                            ))}
                        </div>
                    </Section>

                    {/* 4 · Header and footer lines */}
                    <Section step="4" title="Top and bottom lines">
                        <p className="text-xs text-muted-foreground">
                            The lines under the letterhead on the first page, and the footer of every page. A line whose value is empty is simply not printed.
                        </p>
                        <div className="grid sm:grid-cols-2 gap-4">
                            <LineField label="Theme line (centered, italic)" value={draft.content.theme} onChange={theme => patchContent({ theme })} onFocus={remember(theme => patchContent({ theme }))} />
                            <LineField label="Date line (right)" value={draft.content.dateline} onChange={dateline => patchContent({ dateline })} onFocus={remember(dateline => patchContent({ dateline }))} />
                            <LineField label="Footer, left" value={draft.content.footerLeft} onChange={footerLeft => patchContent({ footerLeft })} onFocus={remember(footerLeft => patchContent({ footerLeft }))} />
                            <LineField label="Footer, right" value={draft.content.footerRight} onChange={footerRight => patchContent({ footerRight })} onFocus={remember(footerRight => patchContent({ footerRight }))} />
                        </div>
                    </Section>
                </div>

                {/* Preview */}
                <aside className="xl:sticky xl:top-20 space-y-2 min-w-0">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Preview</h2>
                        <span className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
                            {previewBusy ? <><Loader2 className="w-3 h-3 animate-spin" /> Updating</> : previewFailed ? "Preview unavailable" : "Up to date"}
                        </span>
                    </div>
                    {missing.length > 0 && (
                        <div className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 flex items-start gap-2">
                            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                            <span>
                                Still to fill in: <strong>{missing.map(k => (k === "contacts" ? "contact persons" : TOKEN_BY_KEY[k]?.label ?? k)).join(", ")}</strong>.
                                They print as [brackets] until then.
                            </span>
                        </div>
                    )}
                    <div className="rounded-xl border bg-muted/30 overflow-hidden h-[calc(100vh-11rem)] min-h-[32rem]">
                        {previewUrl ? (
                            <iframe title="Circular preview" src={`${previewUrl}#toolbar=0&navpanes=0&view=FitH`} className="w-full h-full bg-white" />
                        ) : (
                            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                                {previewFailed ? "The preview could not be generated." : "Preparing the preview..."}
                            </div>
                        )}
                    </div>
                </aside>
            </div>
        </div>
    );
}

function Section({ step, title, aside, children }: { step: string; title: string; aside?: React.ReactNode; children: React.ReactNode }) {
    return (
        <section className="border rounded-2xl bg-card p-5 space-y-4">
            <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">{step}</span>
                <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">{title}</h2>
                <div className="ml-auto">{aside}</div>
            </div>
            {children}
        </section>
    );
}

function LineField({ label, value, onChange, onFocus }: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    onFocus: (e: React.FocusEvent<HTMLInputElement>) => void;
}) {
    return (
        <div className="space-y-1.5">
            <Label>{label}</Label>
            <Input value={value} onChange={e => onChange(e.target.value)} onFocus={onFocus} className="font-mono text-xs" />
        </div>
    );
}
