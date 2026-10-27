"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMemo, useState } from "react";
import { AlertTriangle, CalendarPlus, Copy, FileDown, Loader2, Plus, Save, Trash2, Utensils } from "lucide-react";
import {
    MEALS, PROGRAMME_PRESETS, addDayKey, compareProgramme, outsideHours, programmeDays, type ProgrammeItem,
} from "@/lib/activity-schedule";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";

const fmtDay = (day: string) =>
    new Date(`${day}T00:00:00Z`).toLocaleDateString("en-GB", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" });
const newId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `n-${Date.now()}-${Math.random()}`);

const blank = (day: string, patch: Partial<ProgrammeItem> = {}): ProgrammeItem => ({
    id: newId(), day, time: "", endTime: "", title: "", details: "", by: "", kind: "ACTIVITY", meal: "", ...patch,
});

/**
 * The programme of one session, day by day. A weekly reunion is one day; a
 * camp has one section per day and can be given another one. Each moment has a
 * start and an end, checked against the activity's own hours (drop-off on the
 * first day, pick-up on the last). Meals are typed, so a later food module can
 * plan and cost them.
 */
export function ProgrammeEditor({ activity, sessionId, sessionDate, initial, initialNotes, previous, canEdit, onSaved }: {
    activity: {
        id: string; recurrence: string | null; startDate: string; endDate: string | null;
        dropoffTime: string | null; pickupTime: string | null;
    };
    sessionId: string;
    sessionDate: string;
    initial: ProgrammeItem[];
    initialNotes: string | null;
    previous: { date: string; programme: ProgrammeItem[] } | null;
    canEdit: boolean;
    onSaved: () => void;
}) {
    const firstDay = sessionDate.slice(0, 10);
    const isSeries = !!activity.recurrence;
    const [endDay, setEndDay] = useState<string | null>(isSeries ? null : activity.endDate?.slice(0, 10) ?? null);
    const [rows, setRows] = useState<ProgrammeItem[]>(initial);
    const [notes, setNotes] = useState(initialNotes ?? "");
    const [dirty, setDirty] = useState(false);
    const [saving, setSaving] = useState(false);
    const [addingDay, setAddingDay] = useState(false);
    const [savedAt, setSavedAt] = useState<Date | null>(null);
    useUnsavedChanges(dirty, "This programme has unsaved changes. Leave and discard them?");

    const days = useMemo(() => programmeDays(firstDay, endDay, rows), [firstDay, endDay, rows]);
    const lastDay = days[days.length - 1];
    const start = activity.dropoffTime, end = activity.pickupTime;

    function change(next: ProgrammeItem[]) { setRows(next); setDirty(true); }
    const update = (id: string, patch: Partial<ProgrammeItem>) => change(rows.map(r => (r.id === id ? { ...r, ...patch } : r)));
    const add = (item: ProgrammeItem) => change([...rows, item].sort(compareProgramme));

    function addPreset(day: string, p: (typeof PROGRAMME_PRESETS)[number]) {
        add(blank(day, { title: p.title, time: p.time, endTime: p.endTime, kind: p.meal ? "MEAL" : "ACTIVITY", meal: p.meal ?? "" }));
    }

    /** A camp gets one more day: the activity's end date moves with it. */
    async function addDay() {
        const next = addDayKey(lastDay, 1);
        if (!confirm(`Add ${fmtDay(next)}? The activity will then end on that day.`)) return;
        setAddingDay(true);
        const res = await fetch(`/api/activities/${activity.id}`, {
            method: "PUT", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ endDate: next }),
        });
        setAddingDay(false);
        if (!res.ok) { alert((await res.json().catch(() => ({}))).error || "Could not add the day"); return; }
        setEndDay(next);
    }

    async function save() {
        setSaving(true);
        const res = await fetch(`/api/admin/activities/${activity.id}/sessions/${sessionId}`, {
            method: "PATCH", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ programme: [...rows].sort(compareProgramme), notes }),
        });
        setSaving(false);
        if (!res.ok) { alert((await res.json().catch(() => ({}))).error || "Could not save the programme"); return; }
        const saved = await res.json();
        setRows(saved.programme);
        setDirty(false);
        setSavedAt(new Date());
        onSaved();
    }

    const pdfHref = `/api/admin/activities/${activity.id}/sessions/${sessionId}/programme-pdf`;
    const filled = rows.filter(r => r.title || r.details);
    const canCopy = canEdit && isSeries && !!previous?.programme.length && filled.length === 0;

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm text-muted-foreground flex-1 min-w-[200px]">
                    {start || end ? <>Starts <strong className="text-foreground">{start ?? "—"}</strong> (drop-off) · ends <strong className="text-foreground">{end ?? "—"}</strong> (pick-up)</> : "No start or end time set on the activity."}
                </p>
                {dirty ? (
                    <Button variant="outline" size="sm" className="gap-1.5" disabled title="Save first">
                        <FileDown className="w-4 h-4" /> PDF (save first)
                    </Button>
                ) : (
                    <a href={pdfHref} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm" className="gap-1.5"><FileDown className="w-4 h-4" /> Export PDF</Button>
                    </a>
                )}
            </div>

            {canCopy && (
                <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 flex flex-wrap items-center gap-3">
                    <p className="text-sm flex-1 min-w-[200px]">Start from last session&apos;s programme ({previous!.programme.length} moments)?</p>
                    <Button size="sm" variant="outline" className="gap-1.5"
                        onClick={() => change(previous!.programme.map(r => ({ ...r, id: newId(), day: firstDay })))}>
                        <Copy className="w-4 h-4" /> Copy it
                    </Button>
                </div>
            )}

            {days.map((day, n) => {
                const items = rows.filter(r => r.day === day);
                return (
                    <section key={day} className="rounded-2xl border bg-card overflow-hidden">
                        <div className="px-4 py-3 border-b bg-muted/30 flex flex-wrap items-baseline justify-between gap-2">
                            <h3 className="font-bold">
                                {days.length > 1 && <span className="text-primary mr-2">Day {n + 1}</span>}
                                {fmtDay(day)}
                            </h3>
                            <span className="text-xs text-muted-foreground">
                                {day === firstDay && start && `from ${start}`}
                                {day === firstDay && start && day === lastDay && end && " · "}
                                {day === lastDay && end && `until ${end}`}
                            </span>
                        </div>

                        {items.length === 0 && !canEdit && <p className="px-4 py-6 text-sm text-muted-foreground text-center">Nothing planned.</p>}

                        <div className="divide-y">
                            {items.map(r => {
                                const warn = outsideHours(r, firstDay, lastDay, start, end);
                                if (!canEdit) {
                                    return (
                                        <div key={r.id} className="px-4 py-2.5 flex gap-4">
                                            <span className="w-24 shrink-0 text-sm font-bold text-primary">{r.time || "—"}{r.endTime && `–${r.endTime}`}</span>
                                            <span className="min-w-0">
                                                <span className="text-sm font-semibold flex items-center gap-1.5">{r.kind === "MEAL" && <Utensils className="w-3.5 h-3.5 text-amber-600" />}{r.title}</span>
                                                {r.by && <span className="block text-xs text-muted-foreground">by {r.by}</span>}
                                                {r.details && <span className="block text-sm text-muted-foreground whitespace-pre-line">{r.details}</span>}
                                            </span>
                                        </div>
                                    );
                                }
                                return (
                                    <div key={r.id} className={`p-3 md:px-4 grid md:grid-cols-[11rem_1fr_9rem_2rem] gap-2 items-start ${r.kind === "MEAL" ? "bg-amber-50/50 dark:bg-amber-950/10" : ""}`}>
                                        <div className="flex items-center gap-1">
                                            <Input type="time" value={r.time} onChange={e => update(r.id, { time: e.target.value })} className="h-9 px-2" aria-label="Starts" />
                                            <span className="text-muted-foreground">–</span>
                                            <Input type="time" value={r.endTime} onChange={e => update(r.id, { endTime: e.target.value })} className="h-9 px-2" aria-label="Ends" />
                                        </div>
                                        <div className="space-y-1.5 min-w-0">
                                            <div className="flex gap-1.5">
                                                <Input value={r.title} onChange={e => update(r.id, { title: e.target.value })} placeholder="What happens" className="h-9 font-medium" aria-label="What" />
                                                <select
                                                    value={r.meal}
                                                    onChange={e => update(r.id, { meal: e.target.value as ProgrammeItem["meal"], kind: e.target.value ? "MEAL" : "ACTIVITY" })}
                                                    className="h-9 rounded-md border border-input bg-background px-1.5 text-xs w-28 shrink-0"
                                                    aria-label="Meal"
                                                    title="Mark as a meal"
                                                >
                                                    <option value="">Not a meal</option>
                                                    {MEALS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                                                </select>
                                            </div>
                                            <textarea
                                                value={r.details}
                                                onChange={e => update(r.id, { details: e.target.value })}
                                                placeholder="Details, material… (optional)"
                                                rows={1}
                                                className="flex w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm min-h-[34px]"
                                            />
                                            {warn && <p className="text-[11px] text-amber-700 dark:text-amber-400 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> {warn}</p>}
                                        </div>
                                        <Input value={r.by} onChange={e => update(r.id, { by: e.target.value })} placeholder="Led by" className="h-9" aria-label="Led by" />
                                        <button type="button" onClick={() => change(rows.filter(x => x.id !== r.id))} className="h-9 text-muted-foreground hover:text-destructive" aria-label="Remove">
                                            <Trash2 className="w-4 h-4 mx-auto" />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>

                        {canEdit && (
                            <div className="px-4 py-3 border-t flex flex-wrap items-center gap-1.5">
                                <Button type="button" variant="ghost" size="sm" className="gap-1" onClick={() => add(blank(day))}>
                                    <Plus className="w-4 h-4" /> Moment
                                </Button>
                                <span className="text-xs text-muted-foreground ml-1">Quick add:</span>
                                {PROGRAMME_PRESETS.map(p => (
                                    <button
                                        key={p.title}
                                        type="button"
                                        onClick={() => addPreset(day, p)}
                                        className={`text-xs px-2 py-1 rounded-full border transition-colors ${p.meal ? "border-amber-300 text-amber-800 hover:bg-amber-50 dark:text-amber-300 dark:hover:bg-amber-950/20" : "hover:bg-muted"}`}
                                    >
                                        + {p.title}
                                    </button>
                                ))}
                            </div>
                        )}
                    </section>
                );
            })}

            {canEdit && !isSeries && (
                <Button type="button" variant="outline" className="gap-1.5" onClick={addDay} disabled={addingDay}>
                    {addingDay ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarPlus className="w-4 h-4" />} Add a day
                </Button>
            )}

            {(canEdit || initialNotes) && (
                <div className="rounded-2xl border bg-card p-4 space-y-2">
                    <label htmlFor="session-notes" className="text-sm font-semibold">Notes</label>
                    {canEdit ? (
                        <textarea
                            id="session-notes"
                            value={notes}
                            onChange={e => { setNotes(e.target.value); setDirty(true); }}
                            rows={3}
                            placeholder="Anything to remember: who brings what, what went well…"
                            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        />
                    ) : <p className="text-sm whitespace-pre-line">{initialNotes}</p>}
                </div>
            )}

            {canEdit && (
                <div className="sticky bottom-4 z-10 flex items-center gap-3 bg-card border rounded-xl px-3 py-2 shadow-lg">
                    <Button onClick={save} disabled={saving || !dirty} className="gap-2">
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {saving ? "Saving…" : "Save programme"}
                    </Button>
                    <span className="text-xs text-muted-foreground">
                        {dirty ? "Unsaved changes" : savedAt ? `Saved at ${savedAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}` : `${filled.length} moment${filled.length !== 1 ? "s" : ""} over ${days.length} day${days.length !== 1 ? "s" : ""}`}
                    </span>
                </div>
            )}
        </div>
    );
}
