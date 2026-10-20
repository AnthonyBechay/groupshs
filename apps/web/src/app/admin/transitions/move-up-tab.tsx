"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useState, useEffect, useCallback, useMemo } from "react";
import {
    ArrowRight, AlertTriangle, CheckCircle2, Calendar, Info, Loader2, ChevronDown, Settings2, Users,
} from "lucide-react";
import { unitTypeLabel, UNIT_CONTAINER_NAME, compareUnitsByBranch } from "@/lib/scout-config";
import { REASON_LABEL, TRANSITION_PATH, type EligibilityReason } from "@/lib/age-transition";
import { unitTheme } from "@/lib/unit-theme";
import { useUrlState } from "@/hooks/use-url-state";
import { BatchHistory } from "./batch-history";

type Unit = { id: string; name: string; unitType: string };

type Candidate = {
    id: string; firstName: string; lastName: string;
    dateOfBirth: string | null; gender: string | null;
    role: string | null; progressions: string[];
    subgroupId: string | null; subgroupName: string | null;
    photoUrl: string | null;
    eligible: boolean; reason: EligibilityReason;
    ageReached: number | null; ageNow: number | null;
    threshold: number | null; targetUnitType: string | null;
};

type Preview = {
    unit: Unit;
    fiscalYear: { label: string; start: string; end: string };
    targetUnitType: string | null;
    targetUnits: Unit[];
    candidates: Candidate[];
    others: Candidate[];
    counts: { total: number; eligible: number };
};

/** Units whose members can move up — the final branches leave instead. */
const canMoveUp = (u: Unit) => !!TRANSITION_PATH[u.unitType];

export function MoveUpTab() {
    // Which unit is being reviewed survives a refresh via the URL.
    const { params, setParams } = useUrlState();
    const unitId = params.get("unit") ?? "";
    const setUnitId = (id: string) => setParams({ unit: id || null });

    const [units, setUnits] = useState<Unit[]>([]);
    const [previews, setPreviews] = useState<Record<string, Preview>>({});
    const [loading, setLoading] = useState(true);

    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [destinations, setDestinations] = useState<Record<string, string>>({});

    const [clearRole, setClearRole] = useState(true);
    const [clearSubgroup, setClearSubgroup] = useState(true);
    const [resetProgressions, setResetProgressions] = useState(true);
    const [showOptions, setShowOptions] = useState(false);
    const [notes, setNotes] = useState("");

    const [confirming, setConfirming] = useState(false);
    const [executing, setExecuting] = useState(false);
    const [result, setResult] = useState<{ movedCount: number; batchLabel: string } | null>(null);
    const [error, setError] = useState("");
    const [historyKey, setHistoryKey] = useState(0);

    const movable = useMemo(() => units.filter(canMoveUp).sort(compareUnitsByBranch), [units]);

    // Every movable unit is previewed up front, so the overview can say how many
    // are due in each before anyone clicks.
    const loadAll = useCallback(async () => {
        const res = await fetch("/api/admin/units");
        const list: Unit[] = res.ok ? await res.json() : [];
        setUnits(list);
        const entries = await Promise.all(list.filter(canMoveUp).map(async u => {
            const r = await fetch(`/api/admin/transitions/preview?unitId=${u.id}`);
            return r.ok ? [u.id, await r.json() as Preview] as const : null;
        }));
        setPreviews(Object.fromEntries(entries.filter((e): e is readonly [string, Preview] => !!e)));
        setLoading(false);
    }, []);

     
    useEffect(() => { loadAll(); }, [loadAll]);

    const preview = unitId ? previews[unitId] ?? null : null;

    // Selecting a unit pre-ticks everyone due and sends them to the first
    // destination; most branches have exactly one.
    useEffect(() => {
        if (!preview) return;
        const defaultTarget = preview.targetUnits[0]?.id ?? "";
         
        setSelected(new Set(preview.candidates.map(c => c.id)));
        setDestinations(Object.fromEntries(preview.candidates.map(c => [c.id, defaultTarget])));
        setConfirming(false);
    }, [preview]);

    const selectedList = useMemo(
        () => (preview?.candidates ?? []).filter(c => selected.has(c.id)),
        [preview, selected]
    );
    const missingDestination = selectedList.some(c => !destinations[c.id]);
    const canExecute = selectedList.length > 0 && !missingDestination && !executing;

    const destinationSummary = useMemo(() => {
        if (!preview) return "";
        const names = [...new Set(selectedList.map(c => destinations[c.id]))]
            .map(id => preview.targetUnits.find(t => t.id === id)?.name)
            .filter(Boolean);
        return names.join(" & ");
    }, [preview, selectedList, destinations]);

    function toggle(id: string) {
        setSelected(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    }

    function toggleAll() {
        if (!preview) return;
        setSelected(prev =>
            prev.size === preview.candidates.length ? new Set() : new Set(preview.candidates.map(c => c.id))
        );
    }

    function pick(id: string) {
        setResult(null);
        setError("");
        setUnitId(id === unitId ? "" : id);
    }

    async function execute() {
        if (!preview || !canExecute) return;
        setExecuting(true);
        setError("");
        try {
            const res = await fetch("/api/admin/transitions/execute", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    fromUnitId: preview.unit.id,
                    moves: selectedList.map(c => ({ memberId: c.id, toUnitId: destinations[c.id] })),
                    notes: notes || null,
                    clearRole, clearSubgroup, resetProgressions,
                }),
            });
            const data = await res.json();
            if (!res.ok) { setError(data.error || "The promotion failed"); return; }
            setResult({ movedCount: data.movedCount, batchLabel: data.batchLabel });
            setConfirming(false);
            setNotes("");
            setHistoryKey(k => k + 1);
            await loadAll();
        } catch {
            setError("The promotion failed");
        } finally {
            setExecuting(false);
        }
    }

    if (loading) {
        return (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Checking every unit…
            </p>
        );
    }

    const fiscalYear = Object.values(previews)[0]?.fiscalYear.label;
    const totalDue = Object.values(previews).reduce((n, p) => n + p.counts.eligible, 0);

    return (
        <div className="space-y-5 pb-24">
            {/* ── Step 1: the whole group at a glance ── */}
            <div className="rounded-2xl border bg-card p-5 space-y-4">
                <div className="flex flex-wrap items-end justify-between gap-2">
                    <div>
                        <h2 className="text-base font-bold">Who moves up this year?</h2>
                        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5" />
                            Fiscal year <strong className="text-foreground">{fiscalYear ?? "—"}</strong>
                            {" · "}{totalDue} member{totalDue !== 1 ? "s" : ""} due across the group
                        </p>
                    </div>
                    <Link href="/admin/settings" className="text-xs text-primary underline underline-offset-4">
                        Change the age rules →
                    </Link>
                </div>

                {movable.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No unit can move up yet — create a Meute or a Troupe in Units.</p>
                ) : (
                    <div className="grid sm:grid-cols-2 gap-3">
                        {movable.map(u => {
                            const p = previews[u.id];
                            const theme = unitTheme(u.unitType);
                            const noDob = p?.others.filter(o => o.reason === "NO_DOB").length ?? 0;
                            const target = p?.targetUnits.map(t => t.name).join(" / ")
                                || unitTypeLabel(TRANSITION_PATH[u.unitType] ?? "");
                            const active = u.id === unitId;
                            return (
                                <button
                                    key={u.id}
                                    type="button"
                                    onClick={() => pick(u.id)}
                                    aria-pressed={active}
                                    className={`text-left rounded-xl border overflow-hidden transition-all ${
                                        active ? "ring-2 ring-primary border-primary shadow-md" : "hover:shadow-sm hover:border-foreground/20"
                                    }`}
                                >
                                    <div className={`${theme.headerBg} px-4 py-3 flex items-center gap-3`}>
                                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${theme.dot}`} />
                                        <span className="font-bold text-sm truncate">{u.name}</span>
                                        <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                        <span className="text-sm text-muted-foreground truncate">{target}</span>
                                    </div>
                                    <div className="px-4 py-3 flex items-end justify-between gap-3">
                                        <div>
                                            <span className="text-2xl font-black">{p?.counts.eligible ?? "–"}</span>
                                            <span className="text-xs text-muted-foreground ml-1.5">due of {p?.counts.total ?? 0}</span>
                                        </div>
                                        {noDob > 0 && (
                                            <span className="text-[11px] font-medium text-amber-700 dark:text-amber-400 flex items-center gap-1">
                                                <AlertTriangle className="w-3.5 h-3.5" /> {noDob} without a birth date
                                            </span>
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}
                <p className="text-xs text-muted-foreground flex items-start gap-1.5">
                    <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    Routiers and Pionnières are the last branches: they leave through the Leaving tab. Leaders move through the Maîtrise tab.
                </p>
            </div>

            {error && (
                <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                    <p className="text-sm text-destructive font-medium">{error}</p>
                </div>
            )}

            {result && (
                <div className="rounded-xl border border-emerald-300 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-800/50 p-4 flex items-start gap-2.5">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-bold text-emerald-900 dark:text-emerald-300">
                            Moved {result.movedCount} member{result.movedCount !== 1 ? "s" : ""}.
                        </p>
                        <p className="text-xs text-emerald-800/80 dark:text-emerald-400/80 mt-0.5">
                            {result.batchLabel} — you can undo it from History below.
                        </p>
                    </div>
                </div>
            )}

            {/* ── Step 2: the selected unit ── */}
            {preview && <UnitReview
                preview={preview}
                selected={selected}
                destinations={destinations}
                onToggle={toggle}
                onToggleAll={toggleAll}
                onDestination={(id, to) => setDestinations(d => ({ ...d, [id]: to }))}
                onDestinationAll={to => setDestinations(Object.fromEntries(preview.candidates.map(c => [c.id, to])))}
            />}

            <BatchHistory
                refreshKey={historyKey}
                filter={label => !label.startsWith("Maîtrise")}
                onReverted={loadAll}
            />

            {/* ── Step 3: one action bar, always in reach ── */}
            {preview && preview.candidates.length > 0 && (
                <div className="fixed bottom-0 inset-x-0 z-30 border-t bg-background/95 backdrop-blur shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
                    <div className="container mx-auto px-4 py-3 space-y-3">
                        {showOptions && (
                            <div className="grid sm:grid-cols-3 gap-3 pb-3 border-b">
                                <Check label="Clear their role" hint="A Sizenier is not a Sizenier in the Troupe." checked={clearRole} onChange={setClearRole} />
                                <Check label={`Leave their ${UNIT_CONTAINER_NAME[preview.unit.unitType] ?? "unit"} group`} hint="Sub-groups belong to one unit." checked={clearSubgroup} onChange={setClearSubgroup} />
                                <Check label="Reset progressions" hint="Badges restart in the new branch." checked={resetProgressions} onChange={setResetProgressions} />
                                <input
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                    placeholder="Note (optional) — e.g. End-of-year promotion"
                                    className="sm:col-span-3 h-9 rounded-md border border-input bg-background px-3 text-sm"
                                />
                            </div>
                        )}
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="flex-1 min-w-[200px] text-sm">
                                {selectedList.length === 0 ? (
                                    <span className="text-muted-foreground">Tick the members to move.</span>
                                ) : missingDestination ? (
                                    <span className="text-destructive font-medium">Choose a destination for everyone ticked.</span>
                                ) : confirming ? (
                                    <span className="font-semibold">
                                        Move {selectedList.length} from {preview.unit.name} to {destinationSummary}? You can undo it afterwards.
                                    </span>
                                ) : (
                                    <span>
                                        <strong>{selectedList.length}</strong> selected
                                        <ArrowRight className="w-3.5 h-3.5 inline mx-1.5 text-muted-foreground" />
                                        <strong>{destinationSummary}</strong>
                                    </span>
                                )}
                            </div>
                            {!confirming && (
                                <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => setShowOptions(o => !o)}>
                                    <Settings2 className="w-4 h-4" /> Options
                                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showOptions ? "rotate-180" : ""}`} />
                                </Button>
                            )}
                            {confirming ? (
                                <>
                                    <Button variant="outline" onClick={() => setConfirming(false)} disabled={executing}>Cancel</Button>
                                    <Button onClick={execute} disabled={executing} className="gap-2">
                                        {executing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                        {executing ? "Moving…" : "Yes, move them"}
                                    </Button>
                                </>
                            ) : (
                                <Button disabled={!canExecute} onClick={() => setConfirming(true)} className="gap-2">
                                    <ArrowRight className="w-4 h-4" />
                                    Move {selectedList.length} up
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function UnitReview({
    preview, selected, destinations, onToggle, onToggleAll, onDestination, onDestinationAll,
}: {
    preview: Preview;
    selected: Set<string>;
    destinations: Record<string, string>;
    onToggle: (id: string) => void;
    onToggleAll: () => void;
    onDestination: (memberId: string, unitId: string) => void;
    onDestinationAll: (unitId: string) => void;
}) {
    const theme = unitTheme(preview.unit.unitType);
    const threshold = preview.candidates[0]?.threshold ?? preview.others.find(o => o.threshold != null)?.threshold;
    const noDob = preview.others.filter(o => o.reason === "NO_DOB");
    const staying = preview.others.filter(o => o.reason !== "NO_DOB");
    const multipleTargets = preview.targetUnits.length > 1;
    const allTicked = selected.size === preview.candidates.length;

    return (
        <div className="space-y-4">
            <div className={`rounded-2xl ${theme.pageAccent} text-white p-5`}>
                <p className="text-xs font-bold uppercase tracking-widest text-white/70">Moving up from</p>
                <h2 className="text-2xl font-black">{preview.unit.name}</h2>
                <p className="text-sm text-white/85 mt-1">
                    {threshold != null ? <>Members who turn <strong>{threshold}</strong> during {preview.fiscalYear.label} move to </> : "Members move to "}
                    <strong>{preview.targetUnits.map(t => t.name).join(" or ") || unitTypeLabel(preview.targetUnitType ?? "")}</strong>.
                </p>
            </div>

            {preview.targetUnits.length === 0 ? (
                <div className="rounded-2xl border border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800/50 p-6 text-center">
                    <AlertTriangle className="w-7 h-7 text-amber-600 mx-auto mb-2" />
                    <p className="text-sm font-medium text-amber-900 dark:text-amber-300">
                        No {unitTypeLabel(preview.targetUnitType ?? "")} unit exists yet.
                    </p>
                    <p className="text-xs text-amber-800/80 dark:text-amber-400/80 mt-1">
                        Create one in <Link href="/admin/units" className="underline underline-offset-2">Units</Link> before moving anyone up.
                    </p>
                </div>
            ) : null}

            {noDob.length > 0 && (
                <div className="rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800/50 p-4">
                    <p className="text-sm font-semibold text-amber-900 dark:text-amber-300 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        {noDob.length} member{noDob.length !== 1 ? "s have" : " has"} no date of birth, so nobody can tell if they are due
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                        {noDob.map(m => (
                            <Link
                                key={m.id}
                                href={`/admin/members/${m.id}`}
                                className="text-xs px-2 py-1 rounded-md bg-white/70 dark:bg-black/20 border border-amber-200 dark:border-amber-800/50 hover:underline"
                            >
                                {m.firstName} {m.lastName}
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            <div className="rounded-2xl border bg-card overflow-hidden">
                <div className="px-4 py-3 border-b bg-muted/30 flex flex-wrap items-center justify-between gap-3">
                    <label className="flex items-center gap-2.5 text-sm font-bold cursor-pointer">
                        {preview.candidates.length > 0 && (
                            <input type="checkbox" checked={allTicked} onChange={onToggleAll} className="w-4 h-4 accent-primary" />
                        )}
                        Due to move up ({preview.candidates.length})
                    </label>
                    {multipleTargets && preview.candidates.length > 0 && (
                        <select
                            onChange={e => { if (e.target.value) onDestinationAll(e.target.value); }}
                            defaultValue=""
                            className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                        >
                            <option value="">Send everyone to…</option>
                            {preview.targetUnits.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                    )}
                </div>

                {preview.candidates.length === 0 ? (
                    <p className="p-8 text-sm text-muted-foreground text-center">
                        Nobody in {preview.unit.name} is due to move up this year.
                    </p>
                ) : (
                    <div className="divide-y">
                        {preview.candidates.map(c => (
                            <label key={c.id} className={`px-4 py-3 flex flex-wrap items-center gap-3 cursor-pointer hover:bg-muted/30 ${selected.has(c.id) ? "" : "opacity-60"}`}>
                                <input
                                    type="checkbox"
                                    checked={selected.has(c.id)}
                                    onChange={() => onToggle(c.id)}
                                    className="w-4 h-4 accent-primary shrink-0"
                                />
                                <span className={`w-9 h-9 rounded-full ${theme.iconBg} flex items-center justify-center text-xs font-bold shrink-0 overflow-hidden`}>
                                    {c.photoUrl ? (
                                        /* eslint-disable-next-line @next/next/no-img-element */
                                        <img src={c.photoUrl} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        `${c.firstName[0] ?? ""}${c.lastName[0] ?? ""}`.toUpperCase()
                                    )}
                                </span>
                                <span className="flex-1 min-w-[160px]">
                                    <span className="block text-sm font-semibold">{c.firstName} {c.lastName}</span>
                                    <span className="block text-xs text-muted-foreground">
                                        Turns {c.ageReached} this year
                                        {c.role && ` · ${c.role}`}
                                        {c.subgroupName && ` · ${c.subgroupName}`}
                                    </span>
                                </span>
                                {multipleTargets && (
                                    <select
                                        value={destinations[c.id] ?? ""}
                                        onChange={e => onDestination(c.id, e.target.value)}
                                        className="h-9 rounded-md border border-input bg-background px-2 text-sm min-w-[160px]"
                                    >
                                        <option value="">Choose a unit…</option>
                                        {preview.targetUnits.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                    </select>
                                )}
                            </label>
                        ))}
                    </div>
                )}
            </div>

            {staying.length > 0 && (
                <details className="rounded-2xl border bg-card overflow-hidden group">
                    <summary className="px-4 py-3 bg-muted/30 cursor-pointer text-sm font-bold select-none flex items-center gap-2">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        Staying in {preview.unit.name} ({staying.length})
                        <ChevronDown className="w-4 h-4 ml-auto text-muted-foreground transition-transform group-open:rotate-180" />
                    </summary>
                    <div className="divide-y">
                        {staying.map(o => (
                            <div key={o.id} className="px-4 py-2.5 flex items-center justify-between gap-3">
                                <span className="text-sm">
                                    {o.firstName} {o.lastName}
                                    {o.role && <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{o.role}</span>}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                    {o.ageNow != null && `${o.ageNow} y · `}{REASON_LABEL[o.reason]}
                                </span>
                            </div>
                        ))}
                    </div>
                </details>
            )}
        </div>
    );
}

function Check({ label, hint, checked, onChange }: {
    label: string; hint: string; checked: boolean; onChange: (v: boolean) => void;
}) {
    return (
        <label className="flex items-start gap-2.5 cursor-pointer">
            <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="w-4 h-4 accent-primary mt-0.5 shrink-0" />
            <span>
                <span className="text-sm font-medium">{label}</span>
                <span className="block text-xs text-muted-foreground">{hint}</span>
            </span>
        </label>
    );
}
