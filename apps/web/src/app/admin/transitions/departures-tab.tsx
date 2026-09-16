"use client";

import { Button } from "@/components/ui/button";
import { useState, useEffect, useCallback, useMemo } from "react";
import {
    LogOut, Loader2, AlertTriangle, CheckCircle2, Info, Search, Undo2, Users, X,
} from "lucide-react";
import { unitTypeLabel } from "@/lib/scout-config";

/** Cap rendered rows; the group can have several hundred members. */
const RESULT_LIMIT = 50;

type Candidate = {
    id: string; firstName: string; lastName: string; role: string | null;
    photoUrl: string | null; dateOfBirth: string | null; joinedAt: string;
    progressions: string[];
    unit: { id: string; name: string; unitType: string };
};

// From /api/admin/members?status=LEFT — that endpoint returns the unit as
// { name, unitType } only (no id).
type Departed = {
    id: string; firstName: string; lastName: string; role: string | null;
    leftAt: string | null; hiddenFromAnciens: boolean;
    unit: { name: string; unitType: string };
};

export function DeparturesTab() {
    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [departed, setDeparted] = useState<Departed[]>([]);
    const [loading, setLoading] = useState(true);

    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [search, setSearch] = useState("");
    const [unitFilter, setUnitFilter] = useState("");
    const [leftYear, setLeftYear] = useState(String(new Date().getFullYear()));
    const [note, setNote] = useState("");
    const [createAncien, setCreateAncien] = useState(true);

    const [confirming, setConfirming] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [done, setDone] = useState<number | null>(null);

    const load = useCallback(async () => {
        const [cRes, dRes] = await Promise.all([
            fetch("/api/admin/transitions/departures"),
            fetch("/api/admin/members?status=LEFT"),
        ]);
        if (cRes.ok) setCandidates(await cRes.json());
        if (dRes.ok) setDeparted(await dRes.json());
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    const units = useMemo(() => {
        const map = new Map<string, { id: string; name: string }>();
        for (const c of candidates) map.set(c.unit.id, { id: c.unit.id, name: c.unit.name });
        return [...map.values()];
    }, [candidates]);

    // Search-first: with a few hundred members, dumping the whole roster is
    // unusable, so nothing is listed until a search or unit filter narrows it.
    const hasQuery = search.trim().length > 0 || unitFilter !== "";

    const matches = useMemo(() => {
        if (!hasQuery) return [];
        const q = search.trim().toLowerCase();
        return candidates.filter(c => {
            if (unitFilter && c.unit.id !== unitFilter) return false;
            if (!q) return true;
            return `${c.firstName} ${c.lastName}`.toLowerCase().includes(q);
        });
    }, [candidates, search, unitFilter, hasQuery]);

    const shown = matches.slice(0, RESULT_LIMIT);
    const truncated = matches.length > RESULT_LIMIT;

    const selectedList = useMemo(
        () => candidates.filter(c => selected.has(c.id)),
        [candidates, selected]
    );

    function toggle(id: string) {
        setDone(null);
        setSelected(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    }

    async function submit() {
        if (selectedList.length === 0) return;
        setSaving(true);
        setError("");
        try {
            const res = await fetch("/api/admin/transitions/departures", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    memberIds: selectedList.map(c => c.id),
                    leftYear: Number(leftYear) || new Date().getFullYear(),
                    note: note || null,
                    createAncien,
                }),
            });
            const data = await res.json();
            if (!res.ok) { setError(data.error || "The departure failed"); return; }
            setDone(data.departed);
            setSelected(new Set());
            setConfirming(false);
            setNote("");
            await load();
        } catch {
            setError("The departure failed");
        } finally {
            setSaving(false);
        }
    }

    async function undo(m: Departed) {
        if (!confirm(
            `Bring ${m.firstName} ${m.lastName} back into ${m.unit.name}?\n\n` +
            `They will come off the Anciens list and appear on the roster again. ` +
            `Their bio and professions are kept.`
        )) return;
        const res = await fetch(`/api/admin/transitions/departures?memberId=${m.id}`, { method: "DELETE" });
        const data = await res.json();
        if (!res.ok) { alert(data.error || "Undo failed"); return; }
        await load();
    }

    if (loading) return <p className="text-muted-foreground">Loading…</p>;

    return (
        <div className="space-y-5">
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <p className="text-sm text-muted-foreground">
                    Anyone can leave the group — an Eclaireur who stops scouting, a CT stepping down, a Routier
                    finishing their Départ. The member record is <strong className="text-foreground">never deleted</strong>:
                    it is marked as left, keeping their file, attendance and move history intact.
                    A former member <strong className="text-foreground">is</strong> an ancien — the same record appears
                    on the Anciens list, with their role history filled in automatically. This can be undone.
                </p>
            </div>

            {error && (
                <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                    <p className="text-sm text-destructive font-medium">{error}</p>
                </div>
            )}

            {done !== null && (
                <div className="rounded-xl border border-emerald-300 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-800/50 p-4 flex items-center gap-2.5">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <p className="text-sm font-bold text-emerald-900 dark:text-emerald-300">
                        {done} member{done !== 1 ? "s" : ""} recorded as having left the group.
                    </p>
                </div>
            )}

            {/* Picker */}
            <div className="rounded-2xl border bg-card overflow-hidden">
                <div className="px-4 py-3 border-b bg-muted/30 space-y-3">
                    <h2 className="text-sm font-bold flex items-center gap-2">
                        <Users className="w-4 h-4 text-primary" /> Who is leaving?
                        <span className="font-normal text-muted-foreground">
                            ({candidates.length} active members)
                        </span>
                    </h2>
                    <div className="flex flex-wrap gap-2">
                        <div className="relative flex-1 min-w-[200px]">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                            <input
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Search by name…"
                                className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm"
                            />
                        </div>
                        <select
                            value={unitFilter}
                            onChange={e => setUnitFilter(e.target.value)}
                            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                        >
                            <option value="">Filter by unit…</option>
                            {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                        </select>
                    </div>
                </div>

                {/* Selected people stay visible even when filtered out of the results. */}
                {selectedList.length > 0 && (
                    <div className="px-4 py-3 border-b bg-primary/5 flex flex-wrap gap-1.5 items-center">
                        <span className="text-xs font-semibold text-muted-foreground mr-1">
                            Selected ({selectedList.length}):
                        </span>
                        {selectedList.map(c => (
                            <button
                                key={c.id}
                                onClick={() => toggle(c.id)}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20"
                            >
                                {c.firstName} {c.lastName}
                                <X className="w-3 h-3" />
                            </button>
                        ))}
                        <button
                            onClick={() => setSelected(new Set())}
                            className="text-xs text-muted-foreground underline underline-offset-2 ml-1"
                        >
                            clear
                        </button>
                    </div>
                )}

                {!hasQuery ? (
                    <p className="p-8 text-sm text-muted-foreground text-center">
                        Search for a member by name, or pick a unit, to get started.
                    </p>
                ) : matches.length === 0 ? (
                    <p className="p-8 text-sm text-muted-foreground text-center">No members match.</p>
                ) : (
                    <>
                        <div className="max-h-96 overflow-y-auto divide-y">
                            {shown.map(c => (
                                <label key={c.id} className="px-4 py-2.5 flex items-center gap-3 cursor-pointer hover:bg-muted/40">
                                    <input
                                        type="checkbox"
                                        checked={selected.has(c.id)}
                                        onChange={() => toggle(c.id)}
                                        className="w-4 h-4 accent-primary shrink-0"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium">{c.firstName} {c.lastName}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {c.unit.name} · {unitTypeLabel(c.unit.unitType)}
                                            {c.role && ` · ${c.role}`}
                                        </p>
                                    </div>
                                </label>
                            ))}
                        </div>
                        {truncated && (
                            <p className="px-4 py-2 text-xs text-muted-foreground bg-muted/30 border-t">
                                Showing {RESULT_LIMIT} of {matches.length} — narrow your search to see the rest.
                            </p>
                        )}
                    </>
                )}
            </div>

            {/* Options + submit */}
            {selectedList.length > 0 && (
                <div className="rounded-2xl border bg-card p-5 space-y-4">
                    <h2 className="text-sm font-bold">
                        {selectedList.length} member{selectedList.length !== 1 ? "s" : ""} leaving
                    </h2>

                    <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">Year they left</label>
                            <input
                                type="number" min="1980" max="2100"
                                value={leftYear}
                                onChange={e => setLeftYear(e.target.value)}
                                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">Reason / note (optional)</label>
                            <input
                                value={note}
                                onChange={e => setNote(e.target.value)}
                                placeholder="e.g. Moved abroad"
                                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                            />
                        </div>
                    </div>

                    <label className="flex items-start gap-2.5 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={createAncien}
                            onChange={e => setCreateAncien(e.target.checked)}
                            className="w-4 h-4 accent-primary mt-0.5 shrink-0"
                        />
                        <span>
                            <span className="text-sm font-medium">Show them on the public Anciens list</span>
                            <span className="block text-xs text-muted-foreground">
                                Their joined/left years, progressions and role history come across automatically.
                                Add a bio and their professions afterwards in Milestones → Anciens.
                            </span>
                        </span>
                    </label>

                    {!confirming ? (
                        <Button onClick={() => setConfirming(true)} className="gap-2">
                            <LogOut className="w-4 h-4" /> Record departure
                        </Button>
                    ) : (
                        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
                            <p className="text-sm font-semibold">
                                Record {selectedList.length} departure{selectedList.length !== 1 ? "s" : ""}?
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {selectedList.slice(0, 6).map(c => `${c.firstName} ${c.lastName}`).join(", ")}
                                {selectedList.length > 6 && ` and ${selectedList.length - 6} more`}.
                                {" "}They will be removed from rosters but their records are kept.
                            </p>
                            <div className="flex gap-2">
                                <Button onClick={submit} disabled={saving} className="gap-2">
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                    {saving ? "Saving…" : "Yes, record it"}
                                </Button>
                                <Button variant="outline" onClick={() => setConfirming(false)} disabled={saving}>Cancel</Button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Already departed */}
            <details className="rounded-2xl border bg-card overflow-hidden">
                <summary className="px-4 py-3 bg-muted/30 cursor-pointer text-sm font-bold select-none flex items-center gap-2">
                    <LogOut className="w-4 h-4 text-muted-foreground" />
                    Former members ({departed.length})
                </summary>
                {departed.length === 0 ? (
                    <p className="p-6 text-sm text-muted-foreground text-center">Nobody has left yet.</p>
                ) : (
                    <div className="divide-y max-h-96 overflow-y-auto">
                        {departed.map(m => (
                            <div key={m.id} className="px-4 py-2.5 flex flex-wrap items-center gap-3">
                                <div className="flex-1 min-w-[180px]">
                                    <p className="text-sm font-medium">{m.firstName} {m.lastName}</p>
                                    <p className="text-xs text-muted-foreground">
                                        was {m.unit.name}{m.role ? ` · ${m.role}` : ""}
                                        {m.leftAt && ` · left ${new Date(m.leftAt).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}`}
                                    </p>
                                </div>
                                {!m.hiddenFromAnciens && (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">ON ANCIENS LIST</span>
                                )}
                                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => undo(m)}>
                                    <Undo2 className="w-3.5 h-3.5" /> Bring back
                                </Button>
                            </div>
                        ))}
                    </div>
                )}
            </details>
        </div>
    );
}
