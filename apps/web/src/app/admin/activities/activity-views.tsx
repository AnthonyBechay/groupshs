"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
    CalendarClock, ChevronLeft, ChevronRight, ClipboardCheck, Clock,
    Eye, EyeOff, FileText, MapPin, Pencil, Repeat, Search, Trash2, TrendingUp, Ban, ListTodo,
} from "lucide-react";
import { ACTIVITY_TYPE_LABELS } from "@/lib/scout-config";
import { unitTheme } from "@/lib/unit-theme";
import { ActivityCoverFallback } from "@/components/activity-cover-fallback";
import type { ActivityFormData } from "./activity-form";

// ─── Types ──────────────────────────────────────────────────────────────────

export type Unit = { id: string; name: string; unitType: string; imageUrl: string | null };

export type SessionRow = {
    id: string;
    date: string;
    status: "SCHEDULED" | "CANCELLED";
    cancelReason: string | null;
    programmeCount: number;
    canEdit: boolean;
    activity: {
        id: string; title: string; activityType: string; recurrence: string | null; hidden: boolean;
        dropoffTime: string | null; pickupTime: string | null; location: string | null;
        startDate: string; endDate: string | null;
        unitId: string; unit: { id: string; name: string; unitType: string };
    };
    attendance: { recorded: number; present: number; expected: number };
};

export type ActivityRow = ActivityFormData & {
    year: number;
    canEdit: boolean;
    unit: { id: string; name: string; unitType: string; imageUrl: string | null };
    _count: { circulars: number };
    sessionSummary: {
        total: number; cancelled: number; past: number;
        nextSessionId: string | null; nextDate: string | null; focusSessionId: string | null;
    };
};

// ─── Dates (day strings, "YYYY-MM-DD", in UTC like the database) ────────────

export function todayKey(): string {
    // The leader's calendar day, not UTC's: at 1am in Beirut it is already today.
    const d = new Date();
    return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())).toISOString().slice(0, 10);
}

export function addDays(key: string, n: number): string {
    const d = new Date(`${key}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
}

const key = (iso: string) => iso.slice(0, 10);

/** Monday of the week containing this day. */
function weekStart(k: string): string {
    const dow = (new Date(`${k}T00:00:00Z`).getUTCDay() + 6) % 7; // Mon = 0
    return addDays(k, -dow);
}

/** The 6-week grid shown for a month, Monday first. */
export function monthGrid(month: string): { from: string; to: string; days: string[] } {
    const first = `${month}-01`;
    const from = weekStart(first);
    const days = Array.from({ length: 42 }, (_, i) => addDays(from, i));
    return { from, to: days[41], days };
}

const fmt = (k: string, opts: Intl.DateTimeFormatOptions) =>
    new Date(`${k}T00:00:00Z`).toLocaleDateString("en-GB", { timeZone: "UTC", ...opts });

function weekLabel(start: string, today: string): string {
    const thisWeek = weekStart(today);
    if (start === thisWeek) return "This week";
    if (start === addDays(thisWeek, 7)) return "Next week";
    if (start === addDays(thisWeek, -7)) return "Last week";
    return `Week of ${fmt(start, { day: "numeric", month: "short" })}`;
}

function timeRange(a: SessionRow["activity"]): string | null {
    if (a.dropoffTime && a.pickupTime) return `${a.dropoffTime}–${a.pickupTime}`;
    return a.dropoffTime ?? a.pickupTime ?? null;
}

const needsAttendance = (s: SessionRow, today: string) =>
    s.status === "SCHEDULED" && key(s.date) < today && s.attendance.recorded === 0;

// ─── Stats ──────────────────────────────────────────────────────────────────

export function StatsStrip({ sessions }: { sessions: SessionRow[] }) {
    const today = todayKey();
    const week = weekStart(today);
    const live = sessions.filter(s => s.status === "SCHEDULED");

    const thisWeek = live.filter(s => key(s.date) >= week && key(s.date) < addDays(week, 7)).length;
    const next = live.find(s => key(s.date) >= today);
    const month = today.slice(0, 7);
    const thisMonth = live.filter(s => key(s.date).startsWith(month)).length;

    // Attendance over the last four weeks, only where it was actually taken.
    const taken = live.filter(s => key(s.date) < today && s.attendance.recorded > 0);
    const present = taken.reduce((n, s) => n + s.attendance.present, 0);
    const recorded = taken.reduce((n, s) => n + s.attendance.recorded, 0);
    const rate = recorded ? Math.round((present / recorded) * 100) : null;

    const tiles = [
        { icon: CalendarClock, label: "This week", value: String(thisWeek), hint: thisWeek === 1 ? "session" : "sessions" },
        {
            icon: Clock, label: "Next up",
            value: next ? fmt(key(next.date), { weekday: "short", day: "numeric", month: "short" }) : "—",
            hint: next?.activity.title ?? "nothing scheduled",
        },
        { icon: TrendingUp, label: "Attendance, 4 weeks", value: rate == null ? "—" : `${rate}%`, hint: `${taken.length} session${taken.length !== 1 ? "s" : ""} recorded` },
        { icon: CalendarClock, label: "This month", value: String(thisMonth), hint: thisMonth === 1 ? "session" : "sessions" },
    ];

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {tiles.map(t => (
                <div key={t.label} className="rounded-2xl border p-4 bg-card">
                    <p className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 text-muted-foreground">
                        <t.icon className="w-3.5 h-3.5" /> {t.label}
                    </p>
                    <p className="text-xl font-black mt-1 truncate">{t.value}</p>
                    <p className="text-xs text-muted-foreground truncate">{t.hint}</p>
                </div>
            ))}
        </div>
    );
}

// ─── Agenda ─────────────────────────────────────────────────────────────────

export function AgendaView({ sessions, showUnit }: { sessions: SessionRow[]; showUnit: boolean }) {
    const today = todayKey();
    const [showRecent, setShowRecent] = useState(false);

    // Attendance is optional, so past sessions without it are not a to-do:
    // they sit in one small collapsed list, for whoever wants to look back.
    const upcoming = sessions.filter(s => key(s.date) >= today);
    const recent = sessions.filter(s => key(s.date) < today).reverse();
    const withoutRecord = recent.filter(s => needsAttendance(s, today)).length;

    const byWeek = useMemo(() => {
        const groups = new Map<string, SessionRow[]>();
        for (const s of upcoming) {
            const w = weekStart(key(s.date));
            groups.set(w, [...(groups.get(w) ?? []), s]);
        }
        return [...groups.entries()];
    }, [upcoming]);

    return (
        <div className="space-y-6">
            {byWeek.length === 0 ? (
                <div className="rounded-2xl border border-dashed p-10 text-center">
                    <CalendarClock className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Nothing planned in the next eight weeks.</p>
                </div>
            ) : byWeek.map(([w, list]) => (
                <section key={w}>
                    <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2 px-1">
                        {weekLabel(w, today)}
                        <span className="font-normal normal-case tracking-normal ml-2">
                            {fmt(w, { day: "numeric", month: "short" })} – {fmt(addDays(w, 6), { day: "numeric", month: "short" })}
                        </span>
                    </h2>
                    <div className="rounded-2xl border bg-card divide-y overflow-hidden">
                        {list.map(s => <SessionLine key={s.id} s={s} showUnit={showUnit} today={today} />)}
                    </div>
                </section>
            ))}

            {recent.length > 0 && (
                <section>
                    <button
                        onClick={() => setShowRecent(r => !r)}
                        className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2 px-1 flex items-center gap-1 hover:text-foreground"
                    >
                        <ChevronRight className={`w-3.5 h-3.5 transition-transform ${showRecent ? "rotate-90" : ""}`} />
                        Past four weeks ({recent.length})
                        {withoutRecord > 0 && (
                            <span className="normal-case tracking-normal font-normal ml-1">· {withoutRecord} without attendance</span>
                        )}
                    </button>
                    {showRecent && (
                        <div className="rounded-2xl border bg-card divide-y overflow-hidden">
                            {recent.map(s => <SessionLine key={s.id} s={s} showUnit={showUnit} today={today} />)}
                        </div>
                    )}
                </section>
            )}
        </div>
    );
}

function SessionLine({ s, showUnit, today }: { s: SessionRow; showUnit: boolean; today: string }) {
    const theme = unitTheme(s.activity.unit.unitType);
    const k = key(s.date);
    const cancelled = s.status === "CANCELLED";
    const past = k < today;
    const time = timeRange(s.activity);
    const { present, recorded, expected } = s.attendance;

    return (
        <Link
            href={`/admin/activities/${s.activity.id}/sessions/${s.id}`}
            className={`flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors ${cancelled ? "opacity-60" : ""}`}
        >
            <div className={`w-12 shrink-0 text-center rounded-xl py-1.5 ${k === today ? "bg-primary text-white" : "bg-muted/60"}`}>
                <div className="text-[10px] font-bold uppercase">{fmt(k, { weekday: "short" })}</div>
                <div className="text-lg font-black leading-none">{fmt(k, { day: "numeric" })}</div>
                <div className="text-[10px] uppercase">{fmt(k, { month: "short" })}</div>
            </div>
            <span className={`w-1 self-stretch rounded-full ${theme.dot}`} />
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-sm font-semibold truncate ${cancelled ? "line-through" : ""}`}>{s.activity.title}</span>
                    {s.activity.recurrence && <Repeat className="w-3.5 h-3.5 text-muted-foreground" aria-label="Weekly" />}
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                        {ACTIVITY_TYPE_LABELS[s.activity.activityType] ?? s.activity.activityType}
                    </span>
                    {showUnit && <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${theme.chip}`}>{s.activity.unit.name}</span>}
                </div>
                <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                    {time && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {time}</span>}
                    {s.activity.location && <span className="flex items-center gap-1 truncate"><MapPin className="w-3 h-3" /> {s.activity.location}</span>}
                    {cancelled && <span className="text-destructive font-medium flex items-center gap-1"><Ban className="w-3 h-3" /> Cancelled{s.cancelReason ? ` — ${s.cancelReason}` : ""}</span>}
                </div>
            </div>
            {!cancelled && (
                <div className="hidden sm:flex items-center gap-3 shrink-0 text-xs">
                    <span className={`flex items-center gap-1 ${s.programmeCount ? "text-emerald-700 dark:text-emerald-400" : "text-muted-foreground"}`}>
                        <ListTodo className="w-3.5 h-3.5" /> {s.programmeCount ? `${s.programmeCount} item${s.programmeCount !== 1 ? "s" : ""}` : "No programme"}
                    </span>
                    {(past || recorded > 0) && (
                        recorded > 0 ? (
                            <span className="flex items-center gap-1.5 font-semibold">
                                <ClipboardCheck className="w-3.5 h-3.5 text-primary" /> {present}/{expected || recorded}
                            </span>
                        ) : (
                            <span className="text-muted-foreground">No attendance</span>
                        )
                    )}
                </div>
            )}
            <ChevronRight className="w-4 h-4 text-muted-foreground/50 shrink-0" />
        </Link>
    );
}

// ─── Calendar ───────────────────────────────────────────────────────────────

export function CalendarView({ month, sessions, onMonth }: {
    month: string;
    sessions: SessionRow[];
    onMonth: (m: string) => void;
}) {
    const today = todayKey();
    const { days } = monthGrid(month);
    const byDay = useMemo(() => {
        const m = new Map<string, SessionRow[]>();
        for (const s of sessions) m.set(key(s.date), [...(m.get(key(s.date)) ?? []), s]);
        return m;
    }, [sessions]);

    const shift = (n: number) => {
        const d = new Date(`${month}-01T00:00:00Z`);
        d.setUTCMonth(d.getUTCMonth() + n);
        onMonth(d.toISOString().slice(0, 7));
    };

    return (
        <div className="rounded-2xl border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b flex items-center justify-between gap-3">
                <h2 className="text-lg font-bold">{fmt(`${month}-01`, { month: "long", year: "numeric" })}</h2>
                <div className="flex items-center gap-1">
                    <Button variant="outline" size="sm" onClick={() => shift(-1)} aria-label="Previous month"><ChevronLeft className="w-4 h-4" /></Button>
                    <Button variant="outline" size="sm" onClick={() => onMonth(today.slice(0, 7))}>Today</Button>
                    <Button variant="outline" size="sm" onClick={() => shift(1)} aria-label="Next month"><ChevronRight className="w-4 h-4" /></Button>
                </div>
            </div>
            <div className="grid grid-cols-7 text-[11px] font-bold uppercase tracking-wider text-muted-foreground border-b bg-muted/30">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(d => <div key={d} className="px-2 py-1.5">{d}</div>)}
            </div>
            <div className="grid grid-cols-7">
                {days.map(d => {
                    const list = byDay.get(d) ?? [];
                    const inMonth = d.startsWith(month);
                    return (
                        <div key={d} className={`min-h-[92px] border-b border-r p-1.5 ${inMonth ? "" : "bg-muted/20 text-muted-foreground"}`}>
                            <div className={`text-xs font-semibold mb-1 w-6 h-6 flex items-center justify-center rounded-full ${d === today ? "bg-primary text-white" : ""}`}>
                                {Number(d.slice(8))}
                            </div>
                            <div className="space-y-1">
                                {list.slice(0, 3).map(s => {
                                    const theme = unitTheme(s.activity.unit.unitType);
                                    return (
                                        <Link
                                            key={s.id}
                                            href={`/admin/activities/${s.activity.id}/sessions/${s.id}`}
                                            title={`${s.activity.title} · ${s.activity.unit.name}`}
                                            className={`block truncate rounded px-1.5 py-0.5 text-[11px] font-semibold ${theme.chip} ${s.status === "CANCELLED" ? "line-through opacity-60" : ""}`}
                                        >
                                            {s.activity.title}
                                        </Link>
                                    );
                                })}
                                {list.length > 3 && <p className="text-[10px] text-muted-foreground px-1">+{list.length - 3} more</p>}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ─── All activities ─────────────────────────────────────────────────────────

type When = "upcoming" | "past" | "this-year" | "all";

export function ListView({ activities, units, isSuperAdmin, onEdit, onChanged }: {
    activities: ActivityRow[];
    units: Unit[];
    isSuperAdmin: boolean;
    onEdit: (a: ActivityRow) => void;
    onChanged: () => void;
}) {
    const [when, setWhen] = useState<When>("upcoming");
    const [type, setType] = useState("");
    const [search, setSearch] = useState("");
    const [showHidden, setShowHidden] = useState(false);
    const today = todayKey();
    const year = Number(today.slice(0, 4));
    const unitImage = useMemo(() => new Map(units.map(u => [u.id, u.imageUrl])), [units]);

    const lastDay = (a: ActivityRow) => key(a.recurrenceUntil ?? a.endDate ?? a.startDate);
    const filtered = activities.filter(a => {
        if (a.hidden && !showHidden) return false;
        if (type && a.activityType !== type) return false;
        if (search.trim() && !a.title.toLowerCase().includes(search.trim().toLowerCase())) return false;
        if (when === "upcoming") return lastDay(a) >= today;
        if (when === "past") return lastDay(a) < today;
        if (when === "this-year") return a.year === year;
        return true;
    }).sort((a, b) => when === "past" ? b.startDate.localeCompare(a.startDate) : a.startDate.localeCompare(b.startDate));

    const hiddenCount = activities.filter(a => a.hidden).length;
    const types = [...new Set(activities.map(a => a.activityType))];

    async function toggleHidden(a: ActivityRow) {
        await fetch(`/api/activities/${a.id}`, {
            method: "PUT", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ hidden: !a.hidden }),
        });
        onChanged();
    }

    async function remove(a: ActivityRow) {
        if (!confirm(`Delete "${a.title}"? Every session, its attendance and its circulars go with it.`)) return;
        const res = await fetch(`/api/activities/${a.id}`, { method: "DELETE" });
        if (!res.ok) alert((await res.json().catch(() => ({}))).error || "Could not delete");
        onChanged();
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
                {([["upcoming", "Upcoming & running"], ["past", "Past"], ["this-year", String(year)], ["all", "All time"]] as const).map(([k, label]) => (
                    <button
                        key={k}
                        onClick={() => setWhen(k)}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${when === k ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:bg-muted/70"}`}
                    >
                        {label}
                    </button>
                ))}
                <select value={type} onChange={e => setType(e.target.value)} className="h-8 rounded-full border border-input bg-background px-3 text-xs">
                    <option value="">Every type</option>
                    {types.map(t => <option key={t} value={t}>{ACTIVITY_TYPE_LABELS[t] ?? t}</option>)}
                </select>
                <div className="relative flex-1 min-w-[180px] max-w-xs">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…" className="h-8 pl-8 text-xs rounded-full" />
                </div>
                {hiddenCount > 0 && (
                    <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                        <input type="checkbox" className="accent-primary" checked={showHidden} onChange={e => setShowHidden(e.target.checked)} />
                        Hidden ({hiddenCount})
                    </label>
                )}
            </div>

            {filtered.length === 0 ? (
                <p className="rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground">No activity matches.</p>
            ) : (
                <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filtered.map(a => {
                        const theme = unitTheme(a.unit.unitType);
                        const ss = a.sessionSummary;
                        return (
                            <div key={a.id} className={`rounded-2xl border bg-card overflow-hidden flex flex-col group ${a.hidden ? "opacity-70" : ""}`}>
                                <Link href={`/admin/activities/${a.id}`} className="relative h-28 block">
                                    {a.imageUrl ? (
                                        /* eslint-disable-next-line @next/next/no-img-element */
                                        <img src={a.imageUrl} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <ActivityCoverFallback logoUrl={unitImage.get(a.unitId)} />
                                    )}
                                    <span className={`absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${theme.chip}`}>{a.unit.name}</span>
                                    {a.hidden && (
                                        <span className="absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-black/60 text-white flex items-center gap-1">
                                            <EyeOff className="w-3 h-3" /> Hidden
                                        </span>
                                    )}
                                </Link>
                                <div className="p-4 flex-1 flex flex-col gap-2">
                                    <Link href={`/admin/activities/${a.id}`} className="font-bold hover:text-primary leading-tight">{a.title}</Link>
                                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                                        {a.recurrence ? <Repeat className="w-3.5 h-3.5" /> : <CalendarClock className="w-3.5 h-3.5" />}
                                        {ACTIVITY_TYPE_LABELS[a.activityType] ?? a.activityType} ·{" "}
                                        {a.recurrence
                                            ? `Every week, ${fmt(key(a.startDate), { day: "numeric", month: "short" })} → ${fmt(key(a.recurrenceUntil ?? a.startDate), { day: "numeric", month: "short", year: "numeric" })}`
                                            : fmt(key(a.startDate), { day: "numeric", month: "short", year: "numeric" }) + (a.endDate && key(a.endDate) !== key(a.startDate) ? ` → ${fmt(key(a.endDate), { day: "numeric", month: "short" })}` : "")}
                                    </p>
                                    {a.recurrence && (
                                        <p className="text-xs text-muted-foreground">
                                            {ss.total} sessions · {ss.past} done{ss.cancelled ? ` · ${ss.cancelled} cancelled` : ""}
                                            {ss.nextDate && <> · next <strong className="text-foreground">{fmt(key(ss.nextDate), { weekday: "short", day: "numeric", month: "short" })}</strong></>}
                                        </p>
                                    )}
                                    <div className="mt-auto pt-2 flex items-center gap-1 border-t -mx-1">
                                        {ss.focusSessionId && (
                                            <Link href={`/admin/activities/${a.id}/sessions/${ss.focusSessionId}?tab=attendance`} title="Attendance">
                                                <Button variant="ghost" size="sm" className="text-primary"><ClipboardCheck className="w-4 h-4" /></Button>
                                            </Link>
                                        )}
                                        <Link href={`/admin/activities/${a.id}/circulars`} title="Circulars">
                                            <Button variant="ghost" size="sm" className="text-primary"><FileText className="w-4 h-4" />{a._count.circulars > 0 && <span className="text-[10px]">{a._count.circulars}</span>}</Button>
                                        </Link>
                                        {a.canEdit && (
                                            <>
                                                <Button variant="ghost" size="sm" onClick={() => toggleHidden(a)} title={a.hidden ? "Show on site" : "Hide from site"}>
                                                    {a.hidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                                </Button>
                                                <Button variant="ghost" size="sm" onClick={() => onEdit(a)} title="Edit"><Pencil className="w-4 h-4" /></Button>
                                            </>
                                        )}
                                        {isSuperAdmin && (
                                            <Button variant="ghost" size="sm" onClick={() => remove(a)} className="text-destructive ml-auto" title="Delete"><Trash2 className="w-4 h-4" /></Button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
