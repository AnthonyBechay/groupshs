"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
    ArrowLeft, Ban, ChevronLeft, ChevronRight, ClipboardCheck, Clock, FileText, ListTodo, MapPin, Pencil, Repeat, RotateCcw,
} from "lucide-react";
import { ACTIVITY_TYPE_LABELS } from "@/lib/scout-config";
import { unitTheme } from "@/lib/unit-theme";
import { useUrlState } from "@/hooks/use-url-state";
import type { ProgrammeItem } from "@/lib/activity-schedule";
import { ProgrammeEditor } from "./programme-editor";
import { AttendanceSheet } from "./attendance-sheet";

export type SessionData = {
    canEdit: boolean;
    activity: {
        id: string; title: string; activityType: string; recurrence: string | null;
        startDate: string; endDate: string | null; totalDays: number | null;
        dropoffTime: string | null; pickupTime: string | null; location: string | null;
        unitId: string; unit: { id: string; name: string; unitType: string };
    };
    session: {
        id: string; date: string; status: "SCHEDULED" | "CANCELLED"; cancelReason: string | null;
        programme: ProgrammeItem[]; notes: string | null;
    };
    prev: { id: string; date: string; programme: ProgrammeItem[] } | null;
    next: { id: string; date: string } | null;
};

type Tab = "programme" | "attendance";

const fmt = (iso: string, opts: Intl.DateTimeFormatOptions) =>
    new Date(`${iso.slice(0, 10)}T00:00:00Z`).toLocaleDateString("en-GB", { timeZone: "UTC", ...opts });

/**
 * One session: what happens (the programme) and who came (the attendance).
 * The activity is defined once; everything here belongs to this day only.
 */
export default function SessionPage() {
    const { id, sessionId } = useParams<{ id: string; sessionId: string }>();
    const { params, setParams } = useUrlState();
    const [data, setData] = useState<SessionData | null>(null);
    const [error, setError] = useState("");

    const load = useCallback(async () => {
        const res = await fetch(`/api/admin/activities/${id}/sessions/${sessionId}`);
        if (!res.ok) { setError((await res.json().catch(() => ({}))).error || "Could not load this session"); return; }
        setData(await res.json());
    }, [id, sessionId]);

    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { load(); }, [load]);

    if (error) return <p className="text-destructive">{error}</p>;
    if (!data) return <p className="text-muted-foreground">Loading…</p>;

    const { activity: a, session: s, canEdit } = data;
    const theme = unitTheme(a.unit.unitType);
    const cancelled = s.status === "CANCELLED";
    const past = s.date.slice(0, 10) < new Date().toISOString().slice(0, 10);
    // A past session opens on attendance — that is what is left to do.
    const tab: Tab = params.get("tab") === "attendance" || params.get("tab") === "programme"
        ? params.get("tab") as Tab
        : past ? "attendance" : "programme";
    const isSeries = !!a.recurrence;
    const back = isSeries ? `/admin/activities/${a.id}` : "/admin/activities";

    async function setStatus(status: "SCHEDULED" | "CANCELLED") {
        let cancelReason: string | null = null;
        if (status === "CANCELLED") {
            // A camp or day out is a single session: cancelling it cancels the activity.
            cancelReason = prompt(
                isSeries
                    ? "Cancel this week only? The rest of the series stays as it is.\n\nReason (optional, e.g. \"Exams\", \"Bad weather\"):"
                    : `Cancel "${a.title}"?\n\nIt is marked as cancelled and taken off the public site. You can restore it later.\n\nReason (optional):`,
                ""
            );
            if (cancelReason === null) return;
        }
        const res = await fetch(`/api/admin/activities/${id}/sessions/${sessionId}`, {
            method: "PATCH", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status, cancelReason }),
        });
        if (!res.ok) { alert((await res.json().catch(() => ({}))).error || "Could not update the session"); return; }
        load();
    }

    return (
        <div className="space-y-5 max-w-4xl mx-auto">
            <div className="flex items-center justify-between gap-3">
                <Link href={back} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary">
                    <ArrowLeft className="w-4 h-4" /> {isSeries ? "All sessions" : "Activities"}
                </Link>
                {isSeries && (
                    <div className="flex items-center gap-1">
                        {data.prev ? (
                            <Link href={`/admin/activities/${a.id}/sessions/${data.prev.id}?tab=${tab}`}>
                                <Button variant="outline" size="sm" className="gap-1"><ChevronLeft className="w-4 h-4" /> {fmt(data.prev.date, { day: "numeric", month: "short" })}</Button>
                            </Link>
                        ) : <Button variant="outline" size="sm" disabled><ChevronLeft className="w-4 h-4" /></Button>}
                        {data.next ? (
                            <Link href={`/admin/activities/${a.id}/sessions/${data.next.id}?tab=${tab}`}>
                                <Button variant="outline" size="sm" className="gap-1">{fmt(data.next.date, { day: "numeric", month: "short" })} <ChevronRight className="w-4 h-4" /></Button>
                            </Link>
                        ) : <Button variant="outline" size="sm" disabled><ChevronRight className="w-4 h-4" /></Button>}
                    </div>
                )}
            </div>

            <div className={`rounded-3xl ${theme.pageAccent} text-white p-5 md:p-7`}>
                <p className="text-xs font-bold uppercase tracking-widest text-white/70 flex items-center gap-1.5">
                    {isSeries && <Repeat className="w-3.5 h-3.5" />}
                    {a.unit.name} · {ACTIVITY_TYPE_LABELS[a.activityType] ?? a.activityType}
                </p>
                <h1 className={`text-2xl md:text-3xl font-black ${cancelled ? "line-through opacity-80" : ""}`}>{a.title}</h1>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-white/85 mt-2">
                    <span className="font-semibold text-white">
                        {fmt(s.date, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                        {!isSeries && a.endDate && a.endDate.slice(0, 10) !== a.startDate.slice(0, 10) && ` → ${fmt(a.endDate, { weekday: "long", day: "numeric", month: "long" })}`}
                    </span>
                    {(a.dropoffTime || a.pickupTime) && <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> {[a.dropoffTime, a.pickupTime].filter(Boolean).join("–")}</span>}
                    {a.location && <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {a.location}</span>}
                </div>
                {cancelled && (
                    <p className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold bg-black/20 rounded-lg px-3 py-1.5">
                        <Ban className="w-4 h-4" /> Cancelled{s.cancelReason ? ` — ${s.cancelReason}` : ""}
                    </p>
                )}
                <div className="flex flex-wrap gap-2 mt-5">
                    {canEdit && (
                        <Link href={`/admin/activities?edit=${a.id}&return=1`}>
                            <Button size="sm" className="gap-1.5 bg-white text-foreground hover:bg-white/90"><Pencil className="w-4 h-4" /> Edit activity</Button>
                        </Link>
                    )}
                    <Link href={`/admin/activities/${a.id}/circulars`}>
                        <Button size="sm" variant="outline" className="gap-1.5 bg-white/10 border-white/30 text-white hover:bg-white/20"><FileText className="w-4 h-4" /> Circulars</Button>
                    </Link>
                    {canEdit && (
                        cancelled ? (
                            <Button size="sm" variant="outline" className="gap-1.5 bg-white/10 border-white/30 text-white hover:bg-white/20" onClick={() => setStatus("SCHEDULED")}>
                                <RotateCcw className="w-4 h-4" /> {isSeries ? "Restore this session" : "Restore activity"}
                            </Button>
                        ) : (
                            <Button size="sm" variant="outline" className="gap-1.5 bg-white/10 border-white/30 text-white hover:bg-white/20" onClick={() => setStatus("CANCELLED")}>
                                <Ban className="w-4 h-4" /> {isSeries ? "Cancel this session" : "Cancel activity"}
                            </Button>
                        )
                    )}
                </div>
            </div>

            <div className="inline-flex items-center rounded-full bg-muted/60 border p-1" role="tablist">
                {([["programme", "Programme", ListTodo], ["attendance", "Attendance", ClipboardCheck]] as const).map(([k, label, Icon]) => (
                    <button
                        key={k}
                        role="tab"
                        aria-selected={tab === k}
                        onClick={() => setParams({ tab: k })}
                        className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
                            tab === k ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        <Icon className="w-4 h-4" /> {label}
                    </button>
                ))}
            </div>

            {tab === "programme" ? (
                <ProgrammeEditor
                    key={s.id}
                    activity={a}
                    sessionId={s.id}
                    sessionDate={s.date}
                    initial={s.programme}
                    initialNotes={s.notes}
                    previous={data.prev}
                    canEdit={canEdit}
                    onSaved={load}
                />
            ) : (
                <AttendanceSheet
                    key={s.id}
                    activity={a}
                    sessionId={s.id}
                    cancelled={cancelled}
                    // Reunions are a roll call; camps also collect confirmations beforehand.
                    defaultPhase={a.activityType === "REUNION" || past ? "post" : "pre"}
                />
            )}
        </div>
    );
}
