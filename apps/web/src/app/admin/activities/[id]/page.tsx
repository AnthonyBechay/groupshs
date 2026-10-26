"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
    ArrowLeft, Ban, CalendarX2, ChevronRight, ClipboardCheck, Clock, FileText, ListTodo, MapPin, Pencil, Repeat, RotateCcw,
} from "lucide-react";
import { ACTIVITY_TYPE_LABELS } from "@/lib/scout-config";
import { unitTheme } from "@/lib/unit-theme";
import { activitiesListHref } from "@/lib/activities-list";
import { todayKey } from "../activity-views";

type Session = {
    id: string; date: string; status: "SCHEDULED" | "CANCELLED"; cancelReason: string | null;
    programmeCount: number; hasNotes: boolean;
    attendance: { recorded: number; present: number; expected: number };
};
type Data = {
    canEdit: boolean;
    activity: {
        id: string; title: string; activityType: string; recurrence: string | null; recurrenceUntil: string | null;
        startDate: string; endDate: string | null; dropoffTime: string | null; pickupTime: string | null;
        location: string | null; hidden: boolean; circularCount: number;
        unit: { id: string; name: string; unitType: string };
    };
    sessions: Session[];
};

const day = (iso: string) => iso.slice(0, 10);
const fmt = (iso: string, opts: Intl.DateTimeFormatOptions) =>
    new Date(`${day(iso)}T00:00:00Z`).toLocaleDateString("en-GB", { timeZone: "UTC", ...opts });

/**
 * One activity and all of its sessions. A one-off has a single session, so it
 * goes straight there; this page is really for weekly series: see every week,
 * cancel one, or end the series early.
 */
export default function ActivityPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const [data, setData] = useState<Data | null>(null);
    const [error, setError] = useState("");
    const [backHref, setBackHref] = useState("/admin/activities");
    const [endDate, setEndDate] = useState("");

    const load = useCallback(async () => {
        const res = await fetch(`/api/admin/activities/${id}`);
        if (!res.ok) { setError((await res.json().catch(() => ({}))).error || "Could not load the activity"); return; }
        const d: Data = await res.json();
        if (!d.activity.recurrence && d.sessions.length === 1) {
            router.replace(`/admin/activities/${id}/sessions/${d.sessions[0].id}`);
            return;
        }
        setData(d);
    }, [id, router]);

    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { load(); setBackHref(activitiesListHref()); }, [load]);

    async function setStatus(s: Session, status: "SCHEDULED" | "CANCELLED") {
        let cancelReason: string | null = null;
        if (status === "CANCELLED") {
            cancelReason = prompt(`Cancel the session of ${fmt(s.date, { weekday: "long", day: "numeric", month: "long" })}?\n\nReason (optional, e.g. "Exams", "Bad weather"):`, "");
            if (cancelReason === null) return;
        }
        const res = await fetch(`/api/admin/activities/${id}/sessions/${s.id}`, {
            method: "PATCH", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status, cancelReason }),
        });
        if (!res.ok) alert((await res.json().catch(() => ({}))).error || "Could not update the session");
        load();
    }

    async function endSeries() {
        if (!endDate) return;
        if (!confirm(`End this series on ${fmt(endDate, { day: "numeric", month: "long", year: "numeric" })}?\n\nLater sessions are removed. Any that already have a programme or attendance are kept as cancelled.`)) return;
        const res = await fetch(`/api/admin/activities/${id}/end-series`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lastDate: endDate }),
        });
        if (!res.ok) { alert((await res.json().catch(() => ({}))).error || "Could not end the series"); return; }
        setEndDate("");
        load();
    }

    if (error) return <p className="text-destructive">{error}</p>;
    if (!data) return <p className="text-muted-foreground">Loading…</p>;

    const { activity: a, sessions, canEdit } = data;
    const theme = unitTheme(a.unit.unitType);
    const today = todayKey();
    const upcoming = sessions.filter(s => day(s.date) >= today);
    const past = sessions.filter(s => day(s.date) < today).reverse();
    const done = past.filter(s => s.status === "SCHEDULED");
    const taken = done.filter(s => s.attendance.recorded > 0);
    const rate = taken.length
        ? Math.round(100 * taken.reduce((n, s) => n + s.attendance.present, 0) / taken.reduce((n, s) => n + s.attendance.recorded, 0))
        : null;

    return (
        <div className="space-y-5 max-w-4xl mx-auto">
            <Link href={backHref} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary">
                <ArrowLeft className="w-4 h-4" /> Activities
            </Link>

            <div className={`rounded-3xl ${theme.pageAccent} text-white p-5 md:p-7`}>
                <p className="text-xs font-bold uppercase tracking-widest text-white/70">
                    {a.unit.name} · {ACTIVITY_TYPE_LABELS[a.activityType] ?? a.activityType}
                </p>
                <h1 className="text-2xl md:text-3xl font-black">{a.title}</h1>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-white/85 mt-2">
                    {a.recurrence && (
                        <span className="flex items-center gap-1.5">
                            <Repeat className="w-4 h-4" />
                            Every {fmt(a.startDate, { weekday: "long" })}, {fmt(a.startDate, { day: "numeric", month: "short" })} → {a.recurrenceUntil ? fmt(a.recurrenceUntil, { day: "numeric", month: "short", year: "numeric" }) : "…"}
                        </span>
                    )}
                    {(a.dropoffTime || a.pickupTime) && (
                        <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> {[a.dropoffTime, a.pickupTime].filter(Boolean).join("–")}</span>
                    )}
                    {a.location && <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {a.location}</span>}
                </div>
                <div className="flex flex-wrap gap-2 mt-5">
                    {canEdit && (
                        <Link href={`/admin/activities?edit=${a.id}&return=1`}>
                            <Button size="sm" className="gap-1.5 bg-white text-foreground hover:bg-white/90"><Pencil className="w-4 h-4" /> Edit activity</Button>
                        </Link>
                    )}
                    <Link href={`/admin/activities/${a.id}/circulars`}>
                        <Button size="sm" variant="outline" className="gap-1.5 bg-white/10 border-white/30 text-white hover:bg-white/20">
                            <FileText className="w-4 h-4" /> Circulars{a.circularCount ? ` (${a.circularCount})` : ""}
                        </Button>
                    </Link>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
                <Stat label="Sessions" value={String(sessions.filter(s => s.status === "SCHEDULED").length)} hint={`${sessions.length - sessions.filter(s => s.status === "SCHEDULED").length} cancelled`} />
                <Stat label="Done" value={String(done.length)} hint={`${upcoming.filter(s => s.status === "SCHEDULED").length} to come`} />
                <Stat label="Attendance" value={rate == null ? "—" : `${rate}%`} hint={`taken at ${taken.length} of ${done.length}`} />
            </div>

            <SessionList title="Coming up" sessions={upcoming} activityId={a.id} canEdit={canEdit} onStatus={setStatus} today={today} />
            <SessionList title="Past" sessions={past} activityId={a.id} canEdit={canEdit} onStatus={setStatus} today={today} />

            {canEdit && a.recurrence && (
                <div className="rounded-2xl border bg-card p-5 space-y-3">
                    <h2 className="text-sm font-bold flex items-center gap-2"><CalendarX2 className="w-4 h-4 text-destructive" /> End the series early</h2>
                    <p className="text-xs text-muted-foreground">
                        To skip a single week, cancel that session above. To stop for good, pick the last session to keep.
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                        <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} min={day(a.startDate)} className="w-44" />
                        <Button variant="outline" className="text-destructive" disabled={!endDate} onClick={endSeries}>End series after this date</Button>
                    </div>
                </div>
            )}
        </div>
    );
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
    return (
        <div className="rounded-2xl border bg-card p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
            <p className="text-xl font-black mt-1">{value}</p>
            <p className="text-xs text-muted-foreground">{hint}</p>
        </div>
    );
}

function SessionList({ title, sessions, activityId, canEdit, onStatus, today }: {
    title: string; sessions: Session[]; activityId: string; canEdit: boolean; today: string;
    onStatus: (s: Session, status: "SCHEDULED" | "CANCELLED") => void;
}) {
    if (sessions.length === 0) return null;
    return (
        <section>
            <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2 px-1">{title} ({sessions.length})</h2>
            <div className="rounded-2xl border bg-card divide-y overflow-hidden">
                {sessions.map(s => {
                    const cancelled = s.status === "CANCELLED";
                    const isPast = day(s.date) < today;
                    return (
                        <div key={s.id} className={`flex items-center gap-3 px-4 py-2.5 ${cancelled ? "bg-muted/30" : ""}`}>
                            <Link href={`/admin/activities/${activityId}/sessions/${s.id}`} className="flex-1 min-w-0 flex items-center gap-3 group">
                                <span className={`w-28 shrink-0 text-sm font-semibold ${cancelled ? "line-through text-muted-foreground" : ""} ${day(s.date) === today ? "text-primary" : ""}`}>
                                    {fmt(s.date, { weekday: "short", day: "numeric", month: "short" })}
                                </span>
                                {cancelled ? (
                                    <span className="text-xs text-destructive flex items-center gap-1 truncate"><Ban className="w-3.5 h-3.5" /> Cancelled{s.cancelReason ? ` — ${s.cancelReason}` : ""}</span>
                                ) : (
                                    <span className="flex items-center gap-4 text-xs text-muted-foreground">
                                        <span className={`flex items-center gap-1 ${s.programmeCount ? "text-emerald-700 dark:text-emerald-400" : ""}`}>
                                            <ListTodo className="w-3.5 h-3.5" /> {s.programmeCount ? `${s.programmeCount} in programme` : "No programme"}
                                        </span>
                                        {s.attendance.recorded > 0 ? (
                                            <span className="flex items-center gap-1 font-semibold text-foreground">
                                                <ClipboardCheck className="w-3.5 h-3.5 text-primary" /> {s.attendance.present}/{s.attendance.expected || s.attendance.recorded} present
                                            </span>
                                        ) : isPast ? (
                                            <span>No attendance</span>
                                        ) : null}
                                    </span>
                                )}
                                <ChevronRight className="w-4 h-4 text-muted-foreground/40 ml-auto group-hover:text-foreground" />
                            </Link>
                            {canEdit && (
                                cancelled ? (
                                    <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => onStatus(s, "SCHEDULED")}>
                                        <RotateCcw className="w-3.5 h-3.5" /> Restore
                                    </Button>
                                ) : (
                                    <Button variant="ghost" size="sm" className="gap-1 text-xs text-muted-foreground hover:text-destructive" onClick={() => onStatus(s, "CANCELLED")}>
                                        <Ban className="w-3.5 h-3.5" /> Cancel
                                    </Button>
                                )
                            )}
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
