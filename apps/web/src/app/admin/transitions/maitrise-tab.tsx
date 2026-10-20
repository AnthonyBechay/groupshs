"use client";

import { Button } from "@/components/ui/button";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
    Shuffle, CheckCircle2, Loader2, AlertTriangle, Plus, X, UserPlus, Search, Star, ArrowRight,
} from "lucide-react";
import {
    unitTypeLabel, LEADERSHIP_ROLE_GROUPS, LEADERSHIP_ROLE_OPTIONS, isCouncilRole, leadershipRolesOf,
    UNIT_TYPES_FOR_LEADERSHIP_ROLE, compareUnitsByBranch,
} from "@/lib/scout-config";
import { unitTheme } from "@/lib/unit-theme";
import { BatchHistory } from "./batch-history";

/** Only the senior branches are old enough to join the maîtrise. */
const PROMOTABLE_BRANCHES = ["ROUTIERS", "PIONNIERES"];
const PROMOTE_LIMIT = 50;
const ASSISTANT_ROLES = ["ACT", "ACM", "ACC", "ACG"];

type Unit = { id: string; name: string; unitType: string };
type Leader = {
    id: string; firstName: string; lastName: string;
    role: string | null; extraRoles: string[];
    photoUrl: string | null; unitId: string;
    unit: { id: string; name: string; unitType: string };
    servesUnit: { id: string; name: string; unitType: string } | null;
};

type Draft = { memberId: string; toUnitId: string; toRole: string };

/** The maîtrise role a leader holds now — never their youth role as a Routier. */
const leaderRoleOf = (m: Leader) => leadershipRolesOf(m, m.unit.unitType)[0] ?? "";
/** The unit a transfer would name: the one they run, or else where they sit. */
const leaderUnitOf = (m: Leader) => m.servesUnit?.id ?? m.unitId;
const isUnchanged = (m: Leader, d: Draft) => leaderUnitOf(m) === d.toUnitId && leaderRoleOf(m) === d.toRole;
const roleLabel = (r: string) => LEADERSHIP_ROLE_OPTIONS.find(o => o.value === r)?.label ?? r;

export function MaitriseTab() {
    const [leaders, setLeaders] = useState<Leader[]>([]);
    const [others, setOthers] = useState<Leader[]>([]);
    const [units, setUnits] = useState<Unit[]>([]);
    const [loading, setLoading] = useState(true);

    const [drafts, setDrafts] = useState<Draft[]>([]);
    const [notes, setNotes] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [done, setDone] = useState<number | null>(null);
    const [historyKey, setHistoryKey] = useState(0);

    // The "appoint" picker, optionally opened from a unit's card.
    const [picker, setPicker] = useState<{ unitId: string | null } | null>(null);
    const [promoteSearch, setPromoteSearch] = useState("");
    const pendingRef = useRef<HTMLDivElement>(null);

    const load = useCallback(async () => {
        const res = await fetch("/api/admin/transitions/maitrise");
        if (res.ok) {
            const d = await res.json();
            setLeaders(d.leaders);
            setOthers(d.others);
            setUnits(d.units);
        }
        setLoading(false);
    }, []);

     
    useEffect(() => { load(); }, [load]);

    const all = useMemo(() => [...leaders, ...others], [leaders, others]);
    const sortedUnits = useMemo(() => [...units].sort(compareUnitsByBranch), [units]);
    const unitsForRole = useCallback(
        (role: string) => sortedUnits.filter(u => UNIT_TYPES_FOR_LEADERSHIP_ROLE[role]?.includes(u.unitType)),
        [sortedUnits]
    );

    // The maîtrise as the group thinks of it: the conseil, then each unit with
    // whoever runs it.
    const council = useMemo(
        () => leaders.filter(m => leadershipRolesOf(m, m.unit.unitType).some(isCouncilRole)),
        [leaders]
    );
    const branchUnits = useMemo(() => sortedUnits.filter(u => u.unitType !== "GROUP"), [sortedUnits]);
    const unplaced = useMemo(
        () => leaders.filter(m =>
            !council.includes(m) && !branchUnits.some(u => u.id === m.servesUnit?.id)),
        [leaders, council, branchUnits]
    );

    const promotable = useMemo(
        () => others.filter(m => PROMOTABLE_BRANCHES.includes(m.unit.unitType)),
        [others]
    );
    const promoteMatches = useMemo(() => {
        const q = promoteSearch.trim().toLowerCase();
        const base = q
            ? promotable.filter(m => `${m.firstName} ${m.lastName}`.toLowerCase().includes(q))
            : promotable;
        return base.slice(0, PROMOTE_LIMIT);
    }, [promotable, promoteSearch]);

    function addDraft(m: Leader, presetUnitId?: string | null) {
        if (drafts.some(d => d.memberId === m.id)) return;
        setDone(null);
        const isLeader = leaders.includes(m);
        const toRole = isLeader ? leaderRoleOf(m) : "";
        let toUnitId = presetUnitId ?? (isLeader ? leaderUnitOf(m) : "");
        // A leader recorded against the wrong kind of unit starts blank, rather
        // than showing a unit the role's list does not offer.
        if (toRole && !unitsForRole(toRole).some(u => u.id === toUnitId)) toUnitId = "";
        setDrafts(d => [...d, { memberId: m.id, toRole, toUnitId }]);
        setTimeout(() => pendingRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 50);
    }

    /** A new role narrows the units; keep the unit only if it still fits. */
    function setDraftRole(memberId: string, toRole: string) {
        setDrafts(ds => ds.map(d => {
            if (d.memberId !== memberId) return d;
            const allowed = unitsForRole(toRole);
            const keep = allowed.some(u => u.id === d.toUnitId);
            return { ...d, toRole, toUnitId: keep ? d.toUnitId : allowed.length === 1 ? allowed[0].id : "" };
        }));
    }

    function setDraftUnit(memberId: string, toUnitId: string) {
        setDrafts(ds => ds.map(d => d.memberId === memberId ? { ...d, toUnitId } : d));
    }

    function removeDraft(memberId: string) {
        setDrafts(d => d.filter(x => x.memberId !== memberId));
    }

    const incomplete = drafts.some(d => !d.toUnitId || !d.toRole);
    const changed = drafts.filter(d => {
        const m = all.find(x => x.id === d.memberId);
        return m && !isUnchanged(m, d);
    });

    async function save() {
        if (changed.length === 0 || incomplete) return;
        setSaving(true);
        setError("");
        try {
            const res = await fetch("/api/admin/transitions/maitrise", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ moves: changed, notes: notes || null }),
            });
            const data = await res.json();
            if (!res.ok) { setError(data.error || "The transfer failed"); return; }
            setDone(data.movedCount);
            setDrafts([]);
            setNotes("");
            setPicker(null);
            setHistoryKey(k => k + 1);
            await load();
        } catch {
            setError("The transfer failed");
        } finally {
            setSaving(false);
        }
    }

    if (loading) return <p className="text-muted-foreground">Loading…</p>;

    const pickerUnit = picker?.unitId ? units.find(u => u.id === picker.unitId) : null;
    const pendingIds = new Set(drafts.map(d => d.memberId));

    return (
        <div className="space-y-5">
            {/* What the two tiers mean, in one line each */}
            <div className="grid sm:grid-cols-2 gap-3">
                <div className="rounded-xl border bg-card p-3.5">
                    <p className="text-sm font-bold">Unit maîtrise <span className="font-normal text-muted-foreground">· CM, ACM, CT, ACT, CC, ACC</span></p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        Run a Meute, Troupe or Clan, and <strong className="text-foreground">stay a Routier / Pionnière</strong> in their équipe.
                    </p>
                </div>
                <div className="rounded-xl border bg-card p-3.5">
                    <p className="text-sm font-bold">Conseil <span className="font-normal text-muted-foreground">· CG, ACG, EA, TR, SE, AU</span></p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        Lead the leaders at group level, and <strong className="text-foreground">leave the branch</strong>.
                    </p>
                </div>
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
                        {done} leader{done !== 1 ? "s" : ""} updated. You can undo it from History below.
                    </p>
                </div>
            )}

            {/* ── Pending changes ── */}
            {drafts.length > 0 && (
                <div ref={pendingRef} className="rounded-2xl border-2 border-primary/30 bg-card overflow-hidden">
                    <div className="px-4 py-3 border-b bg-primary/5">
                        <h2 className="text-sm font-bold flex items-center gap-2">
                            <Shuffle className="w-4 h-4 text-primary" /> Changes to apply ({drafts.length})
                        </h2>
                    </div>
                    <div className="divide-y">
                        {drafts.map(d => {
                            const m = all.find(x => x.id === d.memberId);
                            if (!m) return null;
                            const allowed = d.toRole ? unitsForRole(d.toRole) : [];
                            const current = leaderRoleOf(m);
                            return (
                                <div key={d.memberId} className="p-4 grid gap-3 md:grid-cols-[minmax(160px,1fr)_auto_auto_auto] md:items-center">
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold">{m.firstName} {m.lastName}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {m.unit.name}
                                            {current ? ` · now ${current}${m.servesUnit ? ` of ${m.servesUnit.name}` : ""}` : " · not in the maîtrise yet"}
                                        </p>
                                    </div>
                                    <label className="flex flex-col gap-1">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">1 · Role</span>
                                        <select
                                            value={d.toRole}
                                            onChange={e => setDraftRole(d.memberId, e.target.value)}
                                            className="h-9 rounded-md border border-input bg-background px-2 text-sm min-w-[200px]"
                                        >
                                            <option value="">Choose a role…</option>
                                            {LEADERSHIP_ROLE_GROUPS.map(g => (
                                                <optgroup key={g.tier} label={g.label}>
                                                    {g.options.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                                                </optgroup>
                                            ))}
                                        </select>
                                    </label>
                                    <label className="flex flex-col gap-1">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                            2 · {d.toRole && isCouncilRole(d.toRole) ? "Sits in" : "Runs"}
                                        </span>
                                        <select
                                            value={d.toUnitId}
                                            disabled={!d.toRole}
                                            onChange={e => setDraftUnit(d.memberId, e.target.value)}
                                            className="h-9 rounded-md border border-input bg-background px-2 text-sm min-w-[200px] disabled:opacity-50"
                                        >
                                            <option value="">{d.toRole ? "Choose a unit…" : "Choose a role first"}</option>
                                            {allowed.map(u => (
                                                <option key={u.id} value={u.id}>{u.name} ({unitTypeLabel(u.unitType)})</option>
                                            ))}
                                        </select>
                                    </label>
                                    <div className="flex items-center gap-2 md:pt-4">
                                        {isUnchanged(m, d) && <span className="text-[10px] text-muted-foreground">no change</span>}
                                        <button onClick={() => removeDraft(d.memberId)} className="text-muted-foreground hover:text-destructive p-1" title="Remove">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <div className="p-4 border-t bg-muted/10 flex flex-wrap items-center gap-3">
                        <input
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            placeholder="Note (optional) — e.g. New maîtrise for 2026–2027"
                            className="h-9 flex-1 min-w-[220px] rounded-md border border-input bg-background px-3 text-sm"
                        />
                        <Button onClick={save} disabled={saving || incomplete || changed.length === 0} className="gap-2">
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                            {saving ? "Applying…" : `Apply ${changed.length} change${changed.length !== 1 ? "s" : ""}`}
                        </Button>
                        {incomplete && <p className="w-full text-xs text-destructive font-medium">Every row needs a role and a unit.</p>}
                    </div>
                </div>
            )}

            {/* ── Appoint someone new ── */}
            {picker ? (
                <div className="rounded-2xl border bg-card overflow-hidden">
                    <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between gap-3">
                        <h2 className="text-sm font-bold flex items-center gap-2">
                            <UserPlus className="w-4 h-4 text-primary" />
                            Appoint a leader{pickerUnit ? ` for ${pickerUnit.name}` : ""}
                        </h2>
                        <button onClick={() => setPicker(null)} className="text-muted-foreground hover:text-foreground p-1"><X className="w-4 h-4" /></button>
                    </div>
                    <div className="p-4 space-y-3">
                        <div className="relative">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                            <input
                                autoFocus
                                value={promoteSearch}
                                onChange={e => setPromoteSearch(e.target.value)}
                                placeholder="Search Routiers and Pionnières by name…"
                                className="h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm"
                            />
                        </div>
                        {promoteMatches.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-6">
                                {promotable.length === 0 ? "No Routiers or Pionnières available." : `Nobody matches "${promoteSearch}".`}
                            </p>
                        ) : (
                            <div className="max-h-72 overflow-y-auto grid sm:grid-cols-2 gap-1">
                                {promoteMatches.map(m => (
                                    <button
                                        key={m.id}
                                        type="button"
                                        disabled={pendingIds.has(m.id)}
                                        onClick={() => addDraft(m, picker.unitId)}
                                        className="text-left px-3 py-2 rounded-lg hover:bg-muted/60 disabled:opacity-40 flex items-center gap-3"
                                    >
                                        <Avatar m={m} />
                                        <span className="flex-1 min-w-0">
                                            <span className="block text-sm font-medium truncate">{m.firstName} {m.lastName}</span>
                                            <span className="block text-xs text-muted-foreground truncate">{m.unit.name}{m.role ? ` · ${m.role}` : ""}</span>
                                        </span>
                                        <Plus className="w-4 h-4 text-primary shrink-0" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <Button onClick={() => { setPicker({ unitId: null }); setPromoteSearch(""); }} className="gap-2">
                    <UserPlus className="w-4 h-4" /> Appoint a leader
                </Button>
            )}

            {/* ── The maîtrise, unit by unit ── */}
            <div className="space-y-4">
                <LeaderCard
                    title="Conseil"
                    subtitle="Group level"
                    unitType="GROUP"
                    leaders={council}
                    pendingIds={pendingIds}
                    onReassign={m => addDraft(m)}
                />
                <div className="grid md:grid-cols-2 gap-4">
                    {branchUnits.map(u => (
                        <LeaderCard
                            key={u.id}
                            title={u.name}
                            subtitle={unitTypeLabel(u.unitType)}
                            unitType={u.unitType}
                            leaders={leaders.filter(m => m.servesUnit?.id === u.id && !council.includes(m))}
                            pendingIds={pendingIds}
                            onReassign={m => addDraft(m)}
                            onAdd={() => { setPicker({ unitId: u.id }); setPromoteSearch(""); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                        />
                    ))}
                </div>
                {unplaced.length > 0 && (
                    <LeaderCard
                        title="Unit not set"
                        subtitle="Hold a leadership role but are not linked to a unit — reassign them to fix it"
                        unitType="GROUP"
                        leaders={unplaced}
                        pendingIds={pendingIds}
                        onReassign={m => addDraft(m)}
                    />
                )}
            </div>

            <BatchHistory
                refreshKey={historyKey}
                filter={label => label.startsWith("Maîtrise")}
                onReverted={load}
            />
        </div>
    );
}

function Avatar({ m }: { m: Leader }) {
    return (
        <span className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold shrink-0 overflow-hidden">
            {m.photoUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={m.photoUrl} alt="" className="w-full h-full object-cover" />
            ) : (
                `${m.firstName[0] ?? ""}${m.lastName[0] ?? ""}`.toUpperCase()
            )}
        </span>
    );
}

function LeaderCard({ title, subtitle, unitType, leaders, pendingIds, onReassign, onAdd }: {
    title: string;
    subtitle: string;
    unitType: string;
    leaders: Leader[];
    pendingIds: Set<string>;
    onReassign: (m: Leader) => void;
    onAdd?: () => void;
}) {
    const theme = unitTheme(unitType);
    const roleOf = (m: Leader) => {
        const roles = leadershipRolesOf(m, m.unit.unitType);
        return roles.find(r => !ASSISTANT_ROLES.includes(r)) ?? roles[0] ?? "";
    };
    // The chief first, then the assistants.
    const sorted = [...leaders].sort((a, b) =>
        Number(ASSISTANT_ROLES.includes(roleOf(a))) - Number(ASSISTANT_ROLES.includes(roleOf(b)))
        || a.lastName.localeCompare(b.lastName));

    return (
        <div className="rounded-2xl border bg-card overflow-hidden">
            <div className={`px-4 py-3 ${theme.headerBg} flex items-center justify-between gap-3`}>
                <div className="flex items-center gap-2 min-w-0">
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${theme.dot}`} />
                    <div className="min-w-0">
                        <h3 className="font-extrabold text-sm truncate">{title}</h3>
                        <p className="text-[11px] text-muted-foreground truncate">{subtitle}</p>
                    </div>
                </div>
                {onAdd && (
                    <button onClick={onAdd} className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 shrink-0">
                        <Plus className="w-3.5 h-3.5" /> Add
                    </button>
                )}
            </div>
            {sorted.length === 0 ? (
                <p className="px-4 py-5 text-xs text-muted-foreground italic text-center">No maîtrise assigned yet.</p>
            ) : (
                <div className="divide-y">
                    {sorted.map(m => {
                        const role = roleOf(m);
                        const lead = !ASSISTANT_ROLES.includes(role);
                        const extra = leadershipRolesOf(m, m.unit.unitType).filter(r => r !== role);
                        return (
                            <div key={m.id} className="px-4 py-2.5 flex items-center gap-3">
                                <Avatar m={m} />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold truncate">{m.firstName} {m.lastName}</p>
                                    <p className="text-[11px] text-muted-foreground truncate">
                                        {roleLabel(role)}
                                        {m.unit.unitType !== "GROUP" && ` · ${m.unit.name}`}
                                        {extra.length > 0 && ` · also ${extra.join(", ")}`}
                                    </p>
                                </div>
                                <span
                                    title={roleLabel(role)}
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 inline-flex items-center gap-1 ${lead ? theme.leadChip : theme.assistantChip}`}
                                >
                                    {lead && <Star className="w-3 h-3" />} {role}
                                </span>
                                <Button
                                    variant="ghost" size="sm" className="h-8 gap-1 text-xs"
                                    disabled={pendingIds.has(m.id)}
                                    onClick={() => onReassign(m)}
                                    title="Change role or unit"
                                >
                                    <ArrowRight className="w-3.5 h-3.5" /> Change
                                </Button>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
