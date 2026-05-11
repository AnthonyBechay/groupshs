"use client";

import { Input } from "@/components/ui/input";
import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Calendar, MapPin, CheckCircle2, XCircle, Clock3, CircleDashed, Save } from "lucide-react";

type Member = {
    id: string;
    firstName: string;
    lastName: string;
    role: string | null;
    subgroup: { id: string; name: string } | null;
};
type Activity = {
    id: string;
    title: string;
    startDate: string;
    endDate: string | null;
    location: string | null;
    totalDays: number | null;
    unit: { id: string; name: string; unitType: string };
};
type Record = {
    id: string;
    memberId: string;
    confirmation: string | null;
    confirmationDays: number | null;
    confirmationReason: string | null;
    confirmationNote: string | null;
    attended: string | null;
    attendedDays: number | null;
    attendanceNote: string | null;
};

type Phase = "pre" | "post";

const CONF_OPTIONS = [
    { value: "", label: "—", icon: CircleDashed, color: "text-muted-foreground" },
    { value: "CONFIRMED", label: "Coming", icon: CheckCircle2, color: "text-emerald-600 bg-emerald-50" },
    { value: "PARTIAL", label: "Partial", icon: Clock3, color: "text-amber-600 bg-amber-50" },
    { value: "NOT_COMING", label: "Not coming", icon: XCircle, color: "text-red-600 bg-red-50" },
    { value: "PENDING", label: "Pending", icon: CircleDashed, color: "text-slate-600 bg-slate-100" },
];

const ATT_OPTIONS = [
    { value: "", label: "—", icon: CircleDashed, color: "text-muted-foreground" },
    { value: "FULLY", label: "Came", icon: CheckCircle2, color: "text-emerald-600 bg-emerald-50" },
    { value: "PARTIAL", label: "Partial", icon: Clock3, color: "text-amber-600 bg-amber-50" },
    { value: "NOT_AT_ALL", label: "Didn't come", icon: XCircle, color: "text-red-600 bg-red-50" },
];

export default function ActivityAttendancePage() {
    const params = useParams<{ id: string }>();
    const [activity, setActivity] = useState<Activity | null>(null);
    const [members, setMembers] = useState<Member[]>([]);
    const [records, setRecords] = useState<Map<string, Record>>(new Map());
    const [loading, setLoading] = useState(true);
    const [phase, setPhase] = useState<Phase>("pre");
    const [savingIds, setSavingIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (!params?.id) return;
        fetch(`/api/admin/activities/${params.id}/attendance`)
            .then(r => r.json())
            .then(data => {
                setActivity(data.activity);
                setMembers(data.members);
                const map = new Map<string, Record>();
                for (const r of data.records) map.set(r.memberId, r);
                setRecords(map);
                setLoading(false);
            });
    }, [params?.id]);

    const grouped = useMemo(() => {
        const m = new Map<string, Member[]>();
        for (const member of members) {
            const key = member.subgroup?.name || "__unassigned__";
            const list = m.get(key) || [];
            list.push(member);
            m.set(key, list);
        }
        return m;
    }, [members]);

    async function update(memberId: string, patch: Partial<Record>) {
        if (!activity) return;
        const existing = records.get(memberId);
        const next: Record = {
            id: existing?.id || "",
            memberId,
            confirmation: existing?.confirmation ?? null,
            confirmationDays: existing?.confirmationDays ?? null,
            confirmationReason: existing?.confirmationReason ?? null,
            confirmationNote: existing?.confirmationNote ?? null,
            attended: existing?.attended ?? null,
            attendedDays: existing?.attendedDays ?? null,
            attendanceNote: existing?.attendanceNote ?? null,
            ...patch,
        };
        setRecords(new Map(records).set(memberId, next));
        setSavingIds(prev => new Set(prev).add(memberId));

        const res = await fetch(`/api/admin/activities/${activity.id}/attendance/${memberId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                confirmation: next.confirmation || null,
                confirmationDays: next.confirmationDays,
                confirmationReason: next.confirmationReason || null,
                confirmationNote: next.confirmationNote || null,
                attended: next.attended || null,
                attendedDays: next.attendedDays,
                attendanceNote: next.attendanceNote || null,
            }),
        });
        if (res.ok) {
            const saved = await res.json();
            setRecords(prev => new Map(prev).set(memberId, saved));
        }
        setSavingIds(prev => {
            const c = new Set(prev);
            c.delete(memberId);
            return c;
        });
    }

    if (loading) return <p className="text-muted-foreground">Loading attendance...</p>;
    if (!activity) return <p className="text-destructive">Activity not found</p>;

    // Stats
    const stats = phase === "pre"
        ? CONF_OPTIONS.filter(o => o.value).map(o => ({
            ...o,
            count: members.filter(m => (records.get(m.id)?.confirmation || "") === o.value).length,
        }))
        : ATT_OPTIONS.filter(o => o.value).map(o => ({
            ...o,
            count: members.filter(m => (records.get(m.id)?.attended || "") === o.value).length,
        }));

    return (
        <div>
            <div className="flex items-center gap-3 mb-6">
                <Link href="/admin/activities" className="text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold">{activity.title}</h1>
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mt-1">
                        <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{new Date(activity.startDate).toLocaleDateString("en-GB")}{activity.endDate ? ` → ${new Date(activity.endDate).toLocaleDateString("en-GB")}` : ""}</span>
                        {activity.location && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{activity.location}</span>}
                        <span className="font-semibold text-foreground">{activity.unit.name}</span>
                    </div>
                </div>
            </div>

            {/* Phase toggle */}
            <div className="inline-flex items-center bg-muted/60 rounded-full p-1 mb-4 border">
                <button
                    onClick={() => setPhase("pre")}
                    className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${
                        phase === "pre" ? "bg-primary text-white shadow-sm" : "text-muted-foreground"
                    }`}
                >
                    Pre-activity (confirmation)
                </button>
                <button
                    onClick={() => setPhase("post")}
                    className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${
                        phase === "post" ? "bg-foreground text-background shadow-sm" : "text-muted-foreground"
                    }`}
                >
                    Post-activity (actual)
                </button>
            </div>

            {/* Stats */}
            <div className="flex flex-wrap gap-2 mb-6">
                {stats.map(s => (
                    <div key={s.value} className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-bold ${s.color}`}>
                        <s.icon className="w-4 h-4" />
                        {s.label}: {s.count}
                    </div>
                ))}
                <div className="ml-auto text-sm text-muted-foreground self-center">
                    {members.length} members total
                </div>
            </div>

            {/* Members by subgroup */}
            <div className="space-y-5">
                {Array.from(grouped.entries()).map(([groupName, list]) => (
                    <div key={groupName} className="border rounded-2xl bg-card overflow-hidden">
                        <div className="bg-muted/30 px-4 py-2 text-sm font-bold uppercase tracking-wider">
                            {groupName === "__unassigned__" ? "Unassigned" : groupName}
                            <span className="ml-2 text-xs text-muted-foreground font-medium">({list.length})</span>
                        </div>
                        <div className="divide-y">
                            {list.map(m => (
                                <AttendanceRow
                                    key={m.id}
                                    member={m}
                                    record={records.get(m.id)}
                                    phase={phase}
                                    saving={savingIds.has(m.id)}
                                    activityTotalDays={activity.totalDays}
                                    onUpdate={(patch) => update(m.id, patch)}
                                />
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function AttendanceRow({
    member, record, phase, saving, activityTotalDays, onUpdate,
}: {
    member: Member;
    record: Record | undefined;
    phase: Phase;
    saving: boolean;
    activityTotalDays: number | null;
    onUpdate: (patch: Partial<Record>) => void;
}) {
    const options = phase === "pre" ? CONF_OPTIONS : ATT_OPTIONS;
    const value = phase === "pre" ? record?.confirmation || "" : record?.attended || "";
    const days = phase === "pre" ? record?.confirmationDays : record?.attendedDays;
    const note = phase === "pre" ? record?.confirmationNote : record?.attendanceNote;

    return (
        <div className="flex items-start gap-3 p-3 hover:bg-muted/20">
            <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                {`${member.firstName[0]}${member.lastName[0]}`.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm">{member.firstName} {member.lastName}</div>
                {member.role && <div className="text-[11px] text-muted-foreground">{member.role}</div>}
            </div>

            {/* Status dropdown */}
            <div className="flex flex-wrap items-center gap-2">
                <select
                    value={value}
                    onChange={e => {
                        const v = e.target.value || null;
                        if (phase === "pre") onUpdate({ confirmation: v });
                        else onUpdate({ attended: v });
                    }}
                    className="h-9 rounded-md border border-input bg-background px-2 text-xs font-medium"
                >
                    {options.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                </select>

                {/* Days input for partial */}
                {value === "PARTIAL" && (
                    <Input
                        type="number"
                        min="1"
                        max={activityTotalDays || 30}
                        placeholder="days"
                        value={days ?? ""}
                        onChange={e => {
                            const n = e.target.value === "" ? null : parseInt(e.target.value);
                            if (phase === "pre") onUpdate({ confirmationDays: n });
                            else onUpdate({ attendedDays: n });
                        }}
                        className="h-9 w-20 text-xs"
                    />
                )}

                {/* Reason for not coming (pre-phase only) */}
                {phase === "pre" && value === "NOT_COMING" && (
                    <Input
                        placeholder="Reason"
                        value={record?.confirmationReason || ""}
                        onChange={e => onUpdate({ confirmationReason: e.target.value })}
                        className="h-9 w-40 text-xs"
                    />
                )}

                {/* Note */}
                <Input
                    placeholder="Note (optional)"
                    value={note || ""}
                    onChange={e => {
                        if (phase === "pre") onUpdate({ confirmationNote: e.target.value });
                        else onUpdate({ attendanceNote: e.target.value });
                    }}
                    className="h-9 w-44 text-xs"
                />

                {saving && <Save className="w-3.5 h-3.5 text-muted-foreground animate-pulse shrink-0" />}
            </div>
        </div>
    );
}
