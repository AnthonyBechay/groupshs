"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { ArrowDown, ArrowUp, Copy, Loader2, Plus, Save, Trash2 } from "lucide-react";
import type { ProgrammeItem } from "@/lib/activity-schedule";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";

const EMPTY: ProgrammeItem = { time: "", title: "", details: "", by: "" };

const fmt = (iso: string) =>
    new Date(`${iso.slice(0, 10)}T00:00:00Z`).toLocaleDateString("en-GB", { timeZone: "UTC", day: "numeric", month: "short" });

/**
 * The programme of one session: an ordered list of moments (time, what, who).
 * Weekly reunions are usually planned from the previous week's, so that one
 * can be copied in as a starting point.
 */
export function ProgrammeEditor({ activityId, sessionId, initial, initialNotes, previous, canEdit, onSaved }: {
    activityId: string;
    sessionId: string;
    initial: ProgrammeItem[];
    initialNotes: string | null;
    previous: { date: string; programme: ProgrammeItem[] } | null;
    canEdit: boolean;
    onSaved: () => void;
}) {
    const [rows, setRows] = useState<ProgrammeItem[]>(initial.length ? initial : canEdit ? [{ ...EMPTY }] : []);
    const [notes, setNotes] = useState(initialNotes ?? "");
    const [dirty, setDirty] = useState(false);
    const [saving, setSaving] = useState(false);
    const [savedAt, setSavedAt] = useState<Date | null>(null);
    useUnsavedChanges(dirty, "This programme has unsaved changes. Leave and discard them?");

    function change(next: ProgrammeItem[]) { setRows(next); setDirty(true); }
    const update = (i: number, patch: Partial<ProgrammeItem>) => change(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
    const move = (i: number, d: -1 | 1) => {
        const j = i + d;
        if (j < 0 || j >= rows.length) return;
        const next = [...rows];
        [next[i], next[j]] = [next[j], next[i]];
        change(next);
    };

    async function save() {
        setSaving(true);
        const res = await fetch(`/api/admin/activities/${activityId}/sessions/${sessionId}`, {
            method: "PATCH", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ programme: rows, notes }),
        });
        setSaving(false);
        if (!res.ok) { alert((await res.json().catch(() => ({}))).error || "Could not save the programme"); return; }
        setDirty(false);
        setSavedAt(new Date());
        onSaved();
    }

    const filled = rows.filter(r => r.title || r.details);
    const canCopy = canEdit && !!previous?.programme.length && filled.length === 0;

    if (!canEdit) {
        return (
            <div className="rounded-2xl border bg-card p-5 space-y-4">
                {filled.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">No programme yet.</p>
                ) : (
                    <ol className="space-y-3">
                        {filled.map((r, i) => (
                            <li key={i} className="flex gap-4">
                                <span className="w-16 shrink-0 text-sm font-bold text-primary">{r.time || "—"}</span>
                                <span>
                                    <span className="block text-sm font-semibold">{r.title}</span>
                                    {r.by && <span className="block text-xs text-muted-foreground">by {r.by}</span>}
                                    {r.details && <span className="block text-sm text-muted-foreground whitespace-pre-line mt-0.5">{r.details}</span>}
                                </span>
                            </li>
                        ))}
                    </ol>
                )}
                {initialNotes && <p className="text-sm whitespace-pre-line border-t pt-4">{initialNotes}</p>}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {canCopy && (
                <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 flex flex-wrap items-center gap-3">
                    <p className="text-sm flex-1 min-w-[200px]">Start from the programme of <strong>{fmt(previous!.date)}</strong> ({previous!.programme.length} items)?</p>
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={() => change(previous!.programme.map(r => ({ ...r })))}>
                        <Copy className="w-4 h-4" /> Copy it
                    </Button>
                </div>
            )}

            <div className="rounded-2xl border bg-card overflow-hidden">
                <div className="hidden md:grid grid-cols-[6rem_1fr_10rem_2.5rem] gap-2 px-4 py-2 border-b bg-muted/30 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    <span>Time</span><span>What</span><span>Led by</span><span />
                </div>
                <div className="divide-y">
                    {rows.map((r, i) => (
                        <div key={i} className="p-3 md:px-4 grid md:grid-cols-[6rem_1fr_10rem_2.5rem] gap-2 items-start">
                            <Input value={r.time} onChange={e => update(i, { time: e.target.value })} placeholder="14:00" className="h-9" aria-label="Time" />
                            <div className="space-y-1.5">
                                <Input value={r.title} onChange={e => update(i, { title: e.target.value })} placeholder="e.g. Opening, Grand jeu, Prayer…" className="h-9 font-medium" aria-label="What" />
                                <textarea
                                    value={r.details}
                                    onChange={e => update(i, { details: e.target.value })}
                                    placeholder="Details, material to bring… (optional)"
                                    rows={1}
                                    className="flex w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm min-h-[34px]"
                                />
                            </div>
                            <Input value={r.by} onChange={e => update(i, { by: e.target.value })} placeholder="Who" className="h-9" aria-label="Led by" />
                            <div className="flex md:flex-col gap-0.5">
                                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30" aria-label="Move up"><ArrowUp className="w-3.5 h-3.5" /></button>
                                <button type="button" onClick={() => move(i, 1)} disabled={i === rows.length - 1} className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30" aria-label="Move down"><ArrowDown className="w-3.5 h-3.5" /></button>
                                <button type="button" onClick={() => change(rows.filter((_, j) => j !== i))} className="p-1 text-muted-foreground hover:text-destructive" aria-label="Remove"><Trash2 className="w-3.5 h-3.5" /></button>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="p-3 border-t">
                    <Button type="button" variant="ghost" size="sm" className="gap-1.5" onClick={() => change([...rows, { ...EMPTY }])}>
                        <Plus className="w-4 h-4" /> Add a moment
                    </Button>
                </div>
            </div>

            <div className="rounded-2xl border bg-card p-4 space-y-2">
                <label htmlFor="session-notes" className="text-sm font-semibold">Notes for this session</label>
                <textarea
                    id="session-notes"
                    value={notes}
                    onChange={e => { setNotes(e.target.value); setDirty(true); }}
                    rows={3}
                    placeholder="Anything to remember: who is bringing what, what went well…"
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
            </div>

            <div className="sticky bottom-4 z-10 flex items-center gap-3 bg-card border rounded-xl px-3 py-2 shadow-lg">
                <Button onClick={save} disabled={saving || !dirty} className="gap-2">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {saving ? "Saving…" : "Save programme"}
                </Button>
                <span className="text-xs text-muted-foreground">
                    {dirty ? "Unsaved changes" : savedAt ? `Saved at ${savedAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}` : `${filled.length} item${filled.length !== 1 ? "s" : ""}`}
                </span>
            </div>
        </div>
    );
}
