"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEffect, useMemo, useState } from "react";
import { Ban, CheckCircle2, CircleDashed, Clock3, Loader2, Save, UserCheck, XCircle } from "lucide-react";
import { leadershipRolesOf } from "@/lib/scout-config";

type Member = {
    id: string; firstName: string; lastName: string; role: string | null; extraRoles: string[];
    photoUrl: string | null; unitId: string; servesUnitId: string | null;
    unit: { id: string; name: string; unitType: string };
    subgroup: { id: string; name: string } | null;
};
type Rec = {
    memberId: string;
    confirmation: string | null; confirmationDays: number | null; confirmationReason: string | null; confirmationNote: string | null;
    attended: string | null; attendedDays: number | null; attendanceNote: string | null;
};
type Phase = "pre" | "post";

const CONF = [
    { value: "CONFIRMED", label: "Coming", icon: CheckCircle2, on: "bg-emerald-600 text-white", chip: "text-emerald-700 bg-emerald-50" },
    { value: "PARTIAL", label: "Partial", icon: Clock3, on: "bg-amber-500 text-white", chip: "text-amber-700 bg-amber-50" },
    { value: "NOT_COMING", label: "Not coming", icon: XCircle, on: "bg-red-600 text-white", chip: "text-red-700 bg-red-50" },
    { value: "PENDING", label: "Pending", icon: CircleDashed, on: "bg-slate-500 text-white", chip: "text-slate-700 bg-slate-100" },
];
const ATT = [
    { value: "FULLY", label: "Present", icon: CheckCircle2, on: "bg-emerald-600 text-white", chip: "text-emerald-700 bg-emerald-50" },
    { value: "PARTIAL", label: "Partly", icon: Clock3, on: "bg-amber-500 text-white", chip: "text-amber-700 bg-amber-50" },
    { value: "NOT_AT_ALL", label: "Absent", icon: XCircle, on: "bg-red-600 text-white", chip: "text-red-700 bg-red-50" },
];

const EMPTY = (memberId: string): Rec => ({
    memberId, confirmation: null, confirmationDays: null, confirmationReason: null, confirmationNote: null,
    attended: null, attendedDays: null, attendanceNote: null,
});

/**
 * Attendance for one session. Each tap saves on its own, so a leader can take
 * the roll on a phone in the middle of a reunion with no "Save" to forget.
 *
 * Grouped the way a leader sees the unit: the maîtrise, then each sizaine /
 * patrouille / équipe. A group-wide activity is grouped by unit instead.
 */
export function AttendanceSheet({ activity, sessionId, cancelled, defaultPhase }: {
    activity: { id: string; unitId: string; totalDays: number | null; unit: { unitType: string } };
    sessionId: string;
    cancelled: boolean;
    defaultPhase: Phase;
}) {
    const [members, setMembers] = useState<Member[]>([]);
    const [records, setRecords] = useState<Map<string, Rec>>(new Map());
    const [loading, setLoading] = useState(true);
    const [phase, setPhase] = useState<Phase>(defaultPhase);
    const [saving, setSaving] = useState<Set<string>>(new Set());
    const [bulk, setBulk] = useState(false);
    const base = `/api/admin/activities/${activity.id}/sessions/${sessionId}/attendance`;
    const groupWide = activity.unit.unitType === "ALL";

    useEffect(() => {
        fetch(base).then(r => r.json()).then(d => {
            setMembers(d.members ?? []);
            setRecords(new Map((d.records ?? []).map((r: Rec) => [r.memberId, r])));
            setLoading(false);
        });
    }, [base]);

    const groups = useMemo(() => {
        const m = new Map<string, Member[]>();
        const put = (k: string, x: Member) => m.set(k, [...(m.get(k) ?? []), x]);
        for (const x of members) {
            if (groupWide) put(x.unit.name, x);
            else if (x.servesUnitId === activity.unitId || leadershipRolesOf(x, x.unit.unitType).length > 0) put("Maîtrise", x);
            else put(x.subgroup?.name ?? "Not in a group", x);
        }
        // Maîtrise first, "Not in a group" last, the rest by name.
        return [...m.entries()].sort(([a], [b]) =>
            a === "Maîtrise" ? -1 : b === "Maîtrise" ? 1
                : a === "Not in a group" ? 1 : b === "Not in a group" ? -1 : a.localeCompare(b));
    }, [members, groupWide, activity.unitId]);

    async function save(memberId: string, patch: Partial<Rec>) {
        const next = { ...(records.get(memberId) ?? EMPTY(memberId)), ...patch };
        setRecords(prev => new Map(prev).set(memberId, next));
        setSaving(prev => new Set(prev).add(memberId));
        const res = await fetch(`${base}/${memberId}`, {
            method: "PUT", headers: { "Content-Type": "application/json" },
            body: JSON.stringify(next),
        });
        if (res.ok) {
            const saved = await res.json();
            setRecords(prev => new Map(prev).set(memberId, saved));
        } else {
            alert((await res.json().catch(() => ({}))).error || "Could not save");
        }
        setSaving(prev => { const c = new Set(prev); c.delete(memberId); return c; });
    }

    const unmarked = members.filter(m => !records.get(m.id)?.attended);

    async function markRestPresent() {
        if (!unmarked.length) return;
        if (!confirm(`Mark the ${unmarked.length} member${unmarked.length !== 1 ? "s" : ""} not yet marked as present?`)) return;
        setBulk(true);
        const res = await fetch(base, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ memberIds: unmarked.map(m => m.id), attended: "FULLY" }),
        });
        setBulk(false);
        if (!res.ok) { alert((await res.json().catch(() => ({}))).error || "Could not save"); return; }
        const d = await res.json();
        setRecords(prev => {
            const n = new Map(prev);
            for (const r of d.records as Rec[]) n.set(r.memberId, r);
            return n;
        });
    }

    if (loading) return <p className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading the list…</p>;

    if (cancelled) {
        return (
            <div className="rounded-2xl border border-dashed p-10 text-center">
                <Ban className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">This session was cancelled — there is no attendance to take. Restore it first if it did happen.</p>
            </div>
        );
    }
    if (members.length === 0) {
        return <p className="rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground">Nobody you can see is expected at this activity.</p>;
    }

    const options = phase === "pre" ? CONF : ATT;
    const field = phase === "pre" ? "confirmation" : "attended";
    const counts = options.map(o => ({ ...o, n: members.filter(m => records.get(m.id)?.[field] === o.value).length }));
    const marked = members.filter(m => records.get(m.id)?.[field]).length;

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
                <div className="inline-flex items-center rounded-full bg-muted/60 border p-1">
                    {([["pre", "Before: who is coming"], ["post", "On the day: who came"]] as const).map(([k, label]) => (
                        <button
                            key={k}
                            onClick={() => setPhase(k)}
                            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${phase === k ? "bg-background shadow-sm" : "text-muted-foreground"}`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
                {phase === "post" && unmarked.length > 0 && (
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={markRestPresent} disabled={bulk}>
                        {bulk ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
                        Mark the other {unmarked.length} present
                    </Button>
                )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
                {counts.map(c => (
                    <span key={c.value} className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${c.chip}`}>
                        <c.icon className="w-3.5 h-3.5" /> {c.label}: {c.n}
                    </span>
                ))}
                <span className="text-xs text-muted-foreground ml-auto">{marked} of {members.length} marked</span>
            </div>

            {groups.map(([name, list]) => (
                <div key={name} className="rounded-2xl border bg-card overflow-hidden">
                    <div className="bg-muted/30 px-4 py-2 text-xs font-bold uppercase tracking-wider">
                        {name} <span className="font-medium text-muted-foreground">({list.length})</span>
                    </div>
                    <div className="divide-y">
                        {list.map(m => {
                            const r = records.get(m.id);
                            const value = r?.[field] ?? null;
                            const days = phase === "pre" ? r?.confirmationDays : r?.attendedDays;
                            const note = phase === "pre" ? r?.confirmationNote : r?.attendanceNote;
                            const leading = leadershipRolesOf(m, m.unit.unitType);
                            return (
                                <div key={m.id} className="px-4 py-2.5 flex flex-wrap items-center gap-3">
                                    <span className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0 overflow-hidden">
                                        {m.photoUrl
                                            /* eslint-disable-next-line @next/next/no-img-element */
                                            ? <img src={m.photoUrl} alt="" className="w-full h-full object-cover" />
                                            : `${m.firstName[0] ?? ""}${m.lastName[0] ?? ""}`.toUpperCase()}
                                    </span>
                                    <div className="flex-1 min-w-[140px]">
                                        <p className="text-sm font-semibold">{m.firstName} {m.lastName}</p>
                                        <p className="text-[11px] text-muted-foreground">
                                            {leading.length ? leading.join(" / ") : m.role ?? ""}
                                            {groupWide && m.subgroup ? ` · ${m.subgroup.name}` : ""}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1" role="group" aria-label="Status">
                                        {options.map(o => (
                                            <button
                                                key={o.value}
                                                type="button"
                                                onClick={() => save(m.id, { [field]: value === o.value ? null : o.value })}
                                                aria-pressed={value === o.value}
                                                title={o.label}
                                                className={`h-8 px-2.5 rounded-lg text-xs font-semibold border transition-colors flex items-center gap-1 ${
                                                    value === o.value ? `${o.on} border-transparent` : "bg-background hover:bg-muted"
                                                }`}
                                            >
                                                <o.icon className="w-3.5 h-3.5" /> <span className="hidden sm:inline">{o.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                    {value === "PARTIAL" && (
                                        <Input
                                            type="number" min="1" max={activity.totalDays || 30} placeholder="days"
                                            value={days ?? ""}
                                            onChange={e => {
                                                const n = e.target.value === "" ? null : parseInt(e.target.value);
                                                save(m.id, phase === "pre" ? { confirmationDays: n } : { attendedDays: n });
                                            }}
                                            className="h-8 w-20 text-xs"
                                        />
                                    )}
                                    <NoteInput
                                        value={(phase === "pre" && value === "NOT_COMING" ? r?.confirmationReason : note) ?? ""}
                                        placeholder={phase === "pre" && value === "NOT_COMING" ? "Reason" : "Note"}
                                        onCommit={v => save(m.id,
                                            phase === "pre" && value === "NOT_COMING" ? { confirmationReason: v }
                                                : phase === "pre" ? { confirmationNote: v } : { attendanceNote: v })}
                                    />
                                    {saving.has(m.id) && <Save className="w-3.5 h-3.5 text-muted-foreground animate-pulse" />}
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
}

/** Saves on blur, not per keystroke — one request per note, not one per letter. */
function NoteInput({ value, placeholder, onCommit }: { value: string; placeholder: string; onCommit: (v: string | null) => void }) {
    const [v, setV] = useState(value);
    useEffect(() => { setV(value); }, [value]);
    return (
        <Input
            value={v}
            placeholder={placeholder}
            onChange={e => setV(e.target.value)}
            onBlur={() => { if (v !== value) onCommit(v || null); }}
            className="h-8 w-36 text-xs"
        />
    );
}
