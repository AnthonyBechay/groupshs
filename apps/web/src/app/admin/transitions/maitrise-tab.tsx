"use client";

import { Button } from "@/components/ui/button";
import { useState, useEffect, useCallback, useMemo } from "react";
import {
    Shuffle, Shield, CheckCircle2, Loader2, AlertTriangle, Info, Plus, X, UserPlus, Search,
} from "lucide-react";
import {
    unitTypeLabel, LEADERSHIP_ROLE_GROUPS, isCouncilRole, allRolesOf,
} from "@/lib/scout-config";

/** Only the senior branches are old enough to join the maîtrise. */
const PROMOTABLE_BRANCHES = ["ROUTIERS", "PIONNIERES"];
const PROMOTE_LIMIT = 50;

type Unit = { id: string; name: string; unitType: string };
type Leader = {
    id: string; firstName: string; lastName: string;
    role: string | null; extraRoles: string[];
    photoUrl: string | null; unitId: string;
    unit: { id: string; name: string; unitType: string };
    servesUnit: { id: string; name: string; unitType: string } | null;
};

type Draft = { memberId: string; toUnitId: string; toRole: string };

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
    const [showPromote, setShowPromote] = useState(false);
    const [promoteSearch, setPromoteSearch] = useState("");

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

    const all = [...leaders, ...others];

    // Split the current maîtrise into its two tiers.
    const council = useMemo(
        () => leaders.filter(m => allRolesOf(m).some(isCouncilRole)),
        [leaders]
    );
    const unitLeaders = useMemo(
        () => leaders.filter(m => !allRolesOf(m).some(isCouncilRole)),
        [leaders]
    );

    // Only the senior branches are old enough to join the maîtrise.
    const promotable = useMemo(
        () => others.filter(m => PROMOTABLE_BRANCHES.includes(m.unit.unitType)),
        [others]
    );

    // With a few hundred members a raw list is unusable, so search and cap it.
    const promoteMatches = useMemo(() => {
        const q = promoteSearch.trim().toLowerCase();
        const base = q
            ? promotable.filter(m => `${m.firstName} ${m.lastName}`.toLowerCase().includes(q))
            : promotable;
        return base.slice(0, PROMOTE_LIMIT);
    }, [promotable, promoteSearch]);

    const promoteTruncated = promoteMatches.length === PROMOTE_LIMIT;

    function addDraft(m: Leader) {
        if (drafts.some(d => d.memberId === m.id)) return;
        setDone(null);
        setDrafts(d => [...d, { memberId: m.id, toUnitId: m.unitId, toRole: m.role ?? "" }]);
    }

    function updateDraft(memberId: string, patch: Partial<Draft>) {
        setDrafts(d => d.map(x => x.memberId === memberId ? { ...x, ...patch } : x));
    }

    function removeDraft(memberId: string) {
        setDrafts(d => d.filter(x => x.memberId !== memberId));
    }

    const incomplete = drafts.some(d => !d.toUnitId || !d.toRole);
    // Only submit rows that actually change something.
    const changed = drafts.filter(d => {
        const m = all.find(x => x.id === d.memberId);
        return m && (m.unitId !== d.toUnitId || (m.role ?? "") !== d.toRole);
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
            await load();
        } catch {
            setError("The transfer failed");
        } finally {
            setSaving(false);
        }
    }

    if (loading) return <p className="text-muted-foreground">Loading…</p>;

    return (
        <div className="space-y-5">
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <div className="text-sm text-muted-foreground space-y-1.5">
                    <p>
                        The maîtrise is <strong className="text-foreground">not governed by age</strong> — leaders move
                        whenever the group decides. Every transfer is recorded and can be reverted from the Move Up tab.
                    </p>
                    <p>
                        <strong className="text-foreground">Unit maîtrise</strong> (CT, CM, CC…) run a younger unit but
                        stay members of the Routiers / Pionnières. <strong className="text-foreground">The conseil</strong>{" "}
                        (CG, ACG, EA, TR, SE, AU) sit at group level and leave the branch.
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
                        {done} leader{done !== 1 ? "s" : ""} reassigned.
                    </p>
                </div>
            )}

            {/* Pending changes */}
            {drafts.length > 0 && (
                <div className="rounded-2xl border bg-card overflow-hidden">
                    <div className="px-4 py-3 border-b bg-muted/30">
                        <h2 className="text-sm font-bold flex items-center gap-2">
                            <Shuffle className="w-4 h-4 text-primary" /> Pending transfers ({drafts.length})
                        </h2>
                    </div>
                    <div className="divide-y">
                        {drafts.map(d => {
                            const m = all.find(x => x.id === d.memberId);
                            if (!m) return null;
                            const isChanged = m.unitId !== d.toUnitId || (m.role ?? "") !== d.toRole;
                            return (
                                <div key={d.memberId} className="p-3.5 flex flex-wrap items-center gap-3">
                                    <div className="flex-1 min-w-[160px]">
                                        <p className="text-sm font-semibold">{m.firstName} {m.lastName}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {m.unit.name}{m.role ? ` · ${m.role}` : " · no role"}
                                        </p>
                                    </div>
                                    <select
                                        value={d.toRole}
                                        onChange={e => updateDraft(d.memberId, { toRole: e.target.value })}
                                        className="h-9 rounded-md border border-input bg-background px-2 text-sm min-w-[150px]"
                                    >
                                        <option value="">Role…</option>
                                        {LEADERSHIP_ROLE_GROUPS.map(g => (
                                            <optgroup key={g.tier} label={g.label}>
                                                {g.options.map(r => (
                                                    <option key={r.value} value={r.value}>{r.label}</option>
                                                ))}
                                            </optgroup>
                                        ))}
                                    </select>
                                    <div className="flex flex-col gap-0.5 min-w-[170px]">
                                        <select
                                            value={d.toUnitId}
                                            onChange={e => updateDraft(d.memberId, { toUnitId: e.target.value })}
                                            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                                        >
                                            <option value="">Unit…</option>
                                            {units.map(u => (
                                                <option key={u.id} value={u.id}>{u.name} ({unitTypeLabel(u.unitType)})</option>
                                            ))}
                                        </select>
                                        {/* The unit means different things per tier. */}
                                        <span className="text-[10px] text-muted-foreground">
                                            {!d.toRole
                                                ? "pick a role first"
                                                : isCouncilRole(d.toRole)
                                                    ? "their new home unit (leaves the branch)"
                                                    : "the unit they will run — stays a Routier/Pionnière"}
                                        </span>
                                    </div>
                                    {!isChanged && <span className="text-[10px] text-muted-foreground">no change</span>}
                                    <button onClick={() => removeDraft(d.memberId)} className="text-muted-foreground hover:text-destructive p-1">
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                    <div className="p-4 border-t space-y-3 bg-muted/10">
                        <input
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            placeholder="Note (optional) — e.g. New maîtrise for 2026–2027"
                            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                        />
                        {incomplete && <p className="text-xs text-destructive font-medium">Every row needs a unit and a role.</p>}
                        {!incomplete && changed.length === 0 && (
                            <p className="text-xs text-muted-foreground">Nothing has actually changed yet.</p>
                        )}
                        <Button onClick={save} disabled={saving || incomplete || changed.length === 0} className="gap-2">
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                            {saving ? "Applying…" : `Apply ${changed.length} transfer${changed.length !== 1 ? "s" : ""}`}
                        </Button>
                    </div>
                </div>
            )}

            {/* Current maîtrise */}
            <div className="rounded-2xl border bg-card overflow-hidden">
                <div className="px-4 py-3 border-b bg-muted/30">
                    <h2 className="text-sm font-bold flex items-center gap-2">
                        <Shield className="w-4 h-4 text-primary" /> Current maîtrise ({leaders.length})
                    </h2>
                </div>
                {leaders.length === 0 ? (
                    <p className="p-8 text-sm text-muted-foreground text-center">
                        Nobody currently holds a leadership role.
                    </p>
                ) : (
                    <div className="divide-y">
                        {[
                            { key: "COUNCIL", label: "Conseil — leaders of leaders", list: council },
                            { key: "UNIT", label: "Unit maîtrise", list: unitLeaders },
                        ].filter(s => s.list.length > 0).map(section => (
                            <div key={section.key}>
                                <p className="px-4 py-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground bg-muted/20">
                                    {section.label} ({section.list.length})
                                </p>
                                {section.list.map(m => {
                                    const roles = allRolesOf(m);
                                    return (
                                        <div key={m.id} className="px-4 py-3 flex flex-wrap items-center gap-3 border-t">
                                            <div className="flex-1 min-w-[180px]">
                                                <p className="text-sm font-semibold">{m.firstName} {m.lastName}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {m.unit.name} · {unitTypeLabel(m.unit.unitType)}
                                                    {m.servesUnit && (
                                                        <> · runs <strong className="text-foreground">{m.servesUnit.name}</strong></>
                                                    )}
                                                </p>
                                            </div>
                                            <div className="flex flex-wrap gap-1">
                                                {roles.map(r => (
                                                    <span
                                                        key={r}
                                                        className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                                                            isCouncilRole(r)
                                                                ? "bg-primary/10 text-primary"
                                                                : "bg-muted text-muted-foreground"
                                                        }`}
                                                    >
                                                        {r}
                                                    </span>
                                                ))}
                                            </div>
                                            <Button
                                                variant="outline" size="sm" className="gap-1.5"
                                                disabled={drafts.some(d => d.memberId === m.id)}
                                                onClick={() => addDraft(m)}
                                            >
                                                <Shuffle className="w-3.5 h-3.5" /> Reassign
                                            </Button>
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Promote someone into the maîtrise */}
            <div className="rounded-2xl border bg-card overflow-hidden">
                <button
                    onClick={() => setShowPromote(s => !s)}
                    className="w-full px-4 py-3 bg-muted/30 text-left text-sm font-bold flex items-center gap-2"
                >
                    <UserPlus className="w-4 h-4 text-primary" />
                    Promote a member into the maîtrise
                    <span className="text-muted-foreground font-normal">({promotable.length} eligible)</span>
                </button>
                {showPromote && (
                    <div className="p-4 space-y-3">
                        <p className="text-xs text-muted-foreground">
                            Only <strong>Routiers</strong> and <strong>Pionnières</strong> are old enough to join the maîtrise.
                        </p>
                        <div className="relative">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                            <input
                                value={promoteSearch}
                                onChange={e => setPromoteSearch(e.target.value)}
                                placeholder="Search by name…"
                                className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm"
                            />
                        </div>

                        {promotable.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-6">
                                No Routiers or Pionnières available to promote.
                            </p>
                        ) : promoteMatches.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-6">
                                Nobody matches &quot;{promoteSearch}&quot;.
                            </p>
                        ) : (
                            <div className="max-h-72 overflow-y-auto divide-y border rounded-lg">
                                {promoteMatches.map(m => (
                                    <div key={m.id} className="px-3 py-2.5 flex flex-wrap items-center gap-3">
                                        <div className="flex-1 min-w-[160px]">
                                            <p className="text-sm">{m.firstName} {m.lastName}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {m.unit.name} · {unitTypeLabel(m.unit.unitType)}{m.role ? ` · ${m.role}` : ""}
                                            </p>
                                        </div>
                                        <Button
                                            variant="ghost" size="sm" className="gap-1.5 text-primary"
                                            disabled={drafts.some(d => d.memberId === m.id)}
                                            onClick={() => addDraft(m)}
                                        >
                                            <Plus className="w-3.5 h-3.5" /> Add
                                        </Button>
                                    </div>
                                ))}
                                {promoteTruncated && (
                                    <p className="px-3 py-2 text-xs text-muted-foreground bg-muted/30">
                                        Showing the first 50 — keep typing to narrow it down.
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
