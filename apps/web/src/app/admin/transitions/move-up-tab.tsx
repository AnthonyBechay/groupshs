"use client";

import { Button } from "@/components/ui/button";
import { useState, useEffect, useCallback, useMemo } from "react";
import {
    ArrowRight, Users, AlertTriangle, CheckCircle2, Undo2, Calendar,
    Info, RefreshCw, History, ChevronRight, Loader2, ShieldCheck,
} from "lucide-react";
import { unitTypeLabel, UNIT_CONTAINER_NAME } from "@/lib/scout-config";
import { REASON_LABEL, type EligibilityReason } from "@/lib/age-transition";

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

type Batch = {
    batchId: string; batchLabel: string | null; moveDate: string; notes: string | null;
    memberCount: number; revertedCount: number; members: string[];
    fullyReverted: boolean; partiallyReverted: boolean;
};

export function MoveUpTab() {
    const [units, setUnits] = useState<Unit[]>([]);
    const [unitId, setUnitId] = useState("");
    const [preview, setPreview] = useState<Preview | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadingPreview, setLoadingPreview] = useState(false);

    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [destinations, setDestinations] = useState<Record<string, string>>({});

    const [clearRole, setClearRole] = useState(true);
    const [clearSubgroup, setClearSubgroup] = useState(true);
    const [resetProgressions, setResetProgressions] = useState(true);
    const [notes, setNotes] = useState("");

    const [confirming, setConfirming] = useState(false);
    const [executing, setExecuting] = useState(false);
    const [result, setResult] = useState<{ movedCount: number; batchLabel: string } | null>(null);
    const [error, setError] = useState("");

    const [batches, setBatches] = useState<Batch[]>([]);
    const [showHistory, setShowHistory] = useState(false);

    useEffect(() => {
        (async () => {
            const res = await fetch("/api/admin/units");
            if (res.ok) setUnits(await res.json());
            setLoading(false);
        })();
    }, []);

    const loadBatches = useCallback(async () => {
        const res = await fetch("/api/admin/transitions/batches");
        if (res.ok) setBatches(await res.json());
    }, []);

    useEffect(() => { loadBatches(); }, [loadBatches]);

    const loadPreview = useCallback(async (id: string) => {
        if (!id) { setPreview(null); return; }
        setLoadingPreview(true);
        setError("");
        setResult(null);
        try {
            const res = await fetch(`/api/admin/transitions/preview?unitId=${id}`);
            if (!res.ok) {
                const e = await res.json().catch(() => ({}));
                setError(e.error || "Could not load the preview");
                setPreview(null);
                return;
            }
            const data: Preview = await res.json();
            setPreview(data);
            const defaultTarget = data.targetUnits[0]?.id ?? "";
            setSelected(new Set(data.candidates.map(c => c.id)));
            setDestinations(Object.fromEntries(data.candidates.map(c => [c.id, defaultTarget])));
        } finally {
            setLoadingPreview(false);
        }
    }, []);

    useEffect(() => { loadPreview(unitId); }, [unitId, loadPreview]);

    const selectedList = useMemo(
        () => (preview?.candidates ?? []).filter(c => selected.has(c.id)),
        [preview, selected]
    );
    const missingDestination = selectedList.some(c => !destinations[c.id]);
    const canExecute = selectedList.length > 0 && !missingDestination && !executing;

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
            await Promise.all([loadPreview(preview.unit.id), loadBatches()]);
        } catch {
            setError("The promotion failed");
        } finally {
            setExecuting(false);
        }
    }

    async function revert(batch: Batch) {
        const dry = await fetch(`/api/admin/transitions/batches/${batch.batchId}/revert`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ dryRun: true }),
        });
        const plan = await dry.json();
        if (!plan.willRevert) { alert(plan.error || "This batch cannot be reverted."); return; }

        const lines = [
            `Revert "${batch.batchLabel ?? "promotion"}"?`,
            "",
            `${plan.willRevert.length} member(s) will be moved back to their previous unit, role, sub-group and progressions.`,
        ];
        if (plan.skipped?.length) {
            lines.push("", `${plan.skipped.length} will be SKIPPED:`);
            for (const s of plan.skipped.slice(0, 8)) lines.push(`  • ${s.name} — ${s.reason}`);
        }
        if (!confirm(lines.join("\n"))) return;

        const res = await fetch(`/api/admin/transitions/batches/${batch.batchId}/revert`, { method: "POST" });
        const data = await res.json();
        if (!res.ok) { alert(data.error || "Revert failed"); return; }
        await Promise.all([loadBatches(), unitId ? loadPreview(unitId) : Promise.resolve()]);
        alert(`Reverted ${data.reverted} member(s).`);
    }

    if (loading) return <p className="text-muted-foreground">Loading…</p>;

    return (
        <div className="space-y-5">
            <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={() => setShowHistory(h => !h)} className="gap-2">
                    <History className="w-4 h-4" /> History ({batches.length})
                </Button>
            </div>

            {showHistory && (
                <div className="rounded-2xl border bg-card overflow-hidden">
                    <div className="px-4 py-3 border-b bg-muted/30">
                        <h2 className="text-sm font-bold flex items-center gap-2">
                            <History className="w-4 h-4 text-primary" /> Past transitions
                        </h2>
                    </div>
                    {batches.length === 0 ? (
                        <p className="p-6 text-sm text-muted-foreground text-center">Nothing has been run yet.</p>
                    ) : (
                        <div className="divide-y">
                            {batches.map(b => (
                                <div key={b.batchId} className="p-4 flex flex-wrap items-center gap-3">
                                    <div className="flex-1 min-w-[240px]">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-semibold text-sm">{b.batchLabel ?? "Transition"}</span>
                                            {b.fullyReverted && (
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">REVERTED</span>
                                            )}
                                            {b.partiallyReverted && (
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">PARTLY REVERTED</span>
                                            )}
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                            {new Date(b.moveDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                                            {" · "}{b.memberCount} member{b.memberCount !== 1 ? "s" : ""}
                                            {b.revertedCount > 0 && ` · ${b.revertedCount} reverted`}
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-1 truncate">
                                            {b.members.join(", ")}{b.memberCount > b.members.length ? " …" : ""}
                                        </p>
                                    </div>
                                    {!b.fullyReverted && (
                                        <Button variant="outline" size="sm" className="gap-1.5 text-destructive" onClick={() => revert(b)}>
                                            <Undo2 className="w-3.5 h-3.5" /> Revert
                                        </Button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            <div className="rounded-2xl border bg-card p-5 space-y-3">
                <label className="text-sm font-semibold">Which unit are you moving up from?</label>
                <div className="flex flex-wrap gap-2">
                    {units.map(u => (
                        <button
                            key={u.id}
                            onClick={() => setUnitId(u.id)}
                            className={`px-3.5 py-2 rounded-xl border text-sm font-medium transition-colors ${
                                unitId === u.id ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted"
                            }`}
                        >
                            {u.name}
                            <span className={`ml-2 text-[10px] ${unitId === u.id ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                                {unitTypeLabel(u.unitType)}
                            </span>
                        </button>
                    ))}
                </div>
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
                            {result.batchLabel} — you can undo this from History.
                        </p>
                    </div>
                </div>
            )}

            {loadingPreview && (
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Checking who is due to move…
                </p>
            )}

            {preview && !loadingPreview && (
                <>
                    <div className="rounded-2xl border bg-muted/20 p-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                        <span className="flex items-center gap-1.5">
                            <Calendar className="w-4 h-4 text-primary" /> Fiscal year <strong>{preview.fiscalYear.label}</strong>
                        </span>
                        {preview.candidates[0]?.threshold != null && (
                            <span className="flex items-center gap-1.5">
                                <Info className="w-4 h-4 text-primary" /> Moves up at age <strong>{preview.candidates[0].threshold}</strong>
                            </span>
                        )}
                        <span className="flex items-center gap-1.5">
                            <Users className="w-4 h-4 text-primary" />
                            <strong>{preview.counts.eligible}</strong> of {preview.counts.total} due to move
                        </span>
                        <a href="/admin/settings" className="text-xs text-primary underline underline-offset-4 ml-auto">
                            Change the rules →
                        </a>
                    </div>

                    {!preview.targetUnitType ? (
                        <div className="rounded-2xl border border-dashed p-8 text-center">
                            <ShieldCheck className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                            <p className="text-sm text-muted-foreground">
                                <strong>{unitTypeLabel(preview.unit.unitType)}</strong> is the final branch — there is nowhere to move up to.
                                Members finishing here leave the group via the <strong>Leaving</strong> tab.
                            </p>
                        </div>
                    ) : preview.targetUnits.length === 0 ? (
                        <div className="rounded-2xl border border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800/50 p-6 text-center">
                            <AlertTriangle className="w-7 h-7 text-amber-600 mx-auto mb-2" />
                            <p className="text-sm font-medium text-amber-900 dark:text-amber-300">
                                No {unitTypeLabel(preview.targetUnitType)} unit exists yet.
                            </p>
                            <p className="text-xs text-amber-800/80 dark:text-amber-400/80 mt-1">
                                Create one in <a href="/admin/units" className="underline underline-offset-2">Units</a> before moving anyone up.
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="rounded-2xl border bg-card overflow-hidden">
                                <div className="px-4 py-3 border-b bg-muted/30 flex flex-wrap items-center justify-between gap-3">
                                    <h2 className="text-sm font-bold flex items-center gap-2">
                                        <ArrowRight className="w-4 h-4 text-primary" />
                                        Due to move to {unitTypeLabel(preview.targetUnitType)}
                                        <span className="text-muted-foreground font-normal">({preview.candidates.length})</span>
                                    </h2>
                                    {preview.candidates.length > 0 && (
                                        <div className="flex items-center gap-3">
                                            {preview.targetUnits.length > 1 && (
                                                <select
                                                    onChange={e => {
                                                        if (!e.target.value) return;
                                                        setDestinations(Object.fromEntries(preview.candidates.map(c => [c.id, e.target.value])));
                                                    }}
                                                    defaultValue=""
                                                    className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                                                >
                                                    <option value="">Send all to…</option>
                                                    {preview.targetUnits.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                                </select>
                                            )}
                                            <button onClick={toggleAll} className="text-xs text-primary underline underline-offset-4">
                                                {selected.size === preview.candidates.length ? "Deselect all" : "Select all"}
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {preview.candidates.length === 0 ? (
                                    <p className="p-8 text-sm text-muted-foreground text-center">
                                        Nobody in {preview.unit.name} is due to move up this fiscal year.
                                    </p>
                                ) : (
                                    <div className="divide-y">
                                        {preview.candidates.map(c => (
                                            <div key={c.id} className="p-3.5 flex flex-wrap items-center gap-3">
                                                <input
                                                    type="checkbox"
                                                    checked={selected.has(c.id)}
                                                    onChange={() => toggle(c.id)}
                                                    className="w-4 h-4 accent-primary shrink-0"
                                                />
                                                <div className="flex-1 min-w-[180px]">
                                                    <p className="text-sm font-semibold">{c.firstName} {c.lastName}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        Turns {c.ageReached} this year
                                                        {c.role && ` · ${c.role}`}
                                                        {c.subgroupName && ` · ${c.subgroupName}`}
                                                    </p>
                                                </div>
                                                <ChevronRight className="w-4 h-4 text-muted-foreground/50 shrink-0" />
                                                <select
                                                    value={destinations[c.id] ?? ""}
                                                    onChange={e => setDestinations(d => ({ ...d, [c.id]: e.target.value }))}
                                                    className="h-9 rounded-md border border-input bg-background px-2 text-sm min-w-[160px]"
                                                >
                                                    <option value="">Select a unit…</option>
                                                    {preview.targetUnits.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                                </select>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {preview.candidates.length > 0 && (
                                <div className="rounded-2xl border bg-card p-5 space-y-4">
                                    <h2 className="text-sm font-bold">What happens on arrival</h2>
                                    <div className="space-y-2.5">
                                        <Check label="Clear their current role" hint="A Sizenier does not stay a Sizenier in the Troupe." checked={clearRole} onChange={setClearRole} />
                                        <Check label={`Remove them from their ${UNIT_CONTAINER_NAME[preview.unit.unitType] ?? "unit"} sub-group`} hint="Sub-groups belong to a single unit." checked={clearSubgroup} onChange={setClearSubgroup} />
                                        <Check label="Reset progressions" hint="Branch badges restart in the new branch." checked={resetProgressions} onChange={setResetProgressions} />
                                    </div>
                                    <p className="text-xs text-muted-foreground flex items-start gap-1.5 border-t pt-3">
                                        <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-primary" />
                                        Previous values are saved on each member&apos;s move record, so nothing is lost and a revert restores them exactly.
                                    </p>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Note (optional)</label>
                                        <input
                                            value={notes}
                                            onChange={e => setNotes(e.target.value)}
                                            placeholder="e.g. End-of-year promotion"
                                            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                                        />
                                    </div>

                                    {missingDestination && (
                                        <p className="text-xs text-destructive font-medium">Every selected member needs a destination unit.</p>
                                    )}

                                    {!confirming ? (
                                        <Button disabled={!canExecute} onClick={() => setConfirming(true)} className="gap-2">
                                            <ArrowRight className="w-4 h-4" />
                                            Move {selectedList.length} member{selectedList.length !== 1 ? "s" : ""} up
                                        </Button>
                                    ) : (
                                        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
                                            <p className="text-sm font-semibold">
                                                Move {selectedList.length} member{selectedList.length !== 1 ? "s" : ""} out of {preview.unit.name}?
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                This updates their unit immediately. You can undo the whole batch from History.
                                            </p>
                                            <div className="flex gap-2">
                                                <Button onClick={execute} disabled={executing} className="gap-2">
                                                    {executing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                                    {executing ? "Moving…" : "Yes, move them"}
                                                </Button>
                                                <Button variant="outline" onClick={() => setConfirming(false)} disabled={executing}>Cancel</Button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}

                    {preview.others.length > 0 && (
                        <details className="rounded-2xl border bg-card overflow-hidden">
                            <summary className="px-4 py-3 bg-muted/30 cursor-pointer text-sm font-bold select-none flex items-center gap-2">
                                <Users className="w-4 h-4 text-muted-foreground" />
                                Staying in {preview.unit.name} ({preview.others.length})
                            </summary>
                            <div className="divide-y">
                                {preview.others.map(o => (
                                    <div key={o.id} className="px-4 py-2.5 flex items-center justify-between gap-3">
                                        <span className="text-sm">
                                            {o.firstName} {o.lastName}
                                            {o.role && <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{o.role}</span>}
                                        </span>
                                        <span className={`text-xs ${o.reason === "NO_DOB" ? "text-amber-600 font-medium" : "text-muted-foreground"}`}>
                                            {o.ageNow != null && `${o.ageNow}y · `}{REASON_LABEL[o.reason]}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </details>
                    )}
                </>
            )}

            {!unitId && !loadingPreview && (
                <div className="rounded-2xl border border-dashed p-10 text-center">
                    <RefreshCw className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Pick a unit above to see who is due to move up.</p>
                </div>
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
