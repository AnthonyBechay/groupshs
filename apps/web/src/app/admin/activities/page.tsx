"use client";

import { Button } from "@/components/ui/button";
import { useState, useEffect, useMemo, useCallback } from "react";
import { Plus, CalendarDays, ListChecks, LayoutGrid, Star } from "lucide-react";
import { compareUnitsByBranch } from "@/lib/scout-config";
import { unitTheme } from "@/lib/unit-theme";
import { useUrlState } from "@/hooks/use-url-state";
import { rememberActivitiesList } from "@/lib/activities-list";
import { ActivityForm } from "./activity-form";
import {
    AgendaView, CalendarView, ListView, StatsStrip,
    type ActivityRow, type SessionRow, type Unit, addDays, todayKey, monthGrid,
} from "./activity-views";

type View = "agenda" | "calendar" | "list";
type MyUnit = { unit: { id: string; name: string; unitType: string }; role: string | null; accessible: boolean } | null;

const VIEWS: { key: View; label: string; icon: typeof ListChecks }[] = [
    { key: "agenda", label: "Agenda", icon: ListChecks },
    { key: "calendar", label: "Calendar", icon: CalendarDays },
    { key: "list", label: "All activities", icon: LayoutGrid },
];

/**
 * Activities, unit by unit.
 *
 * Opens on the unit the signed-in leader runs (from their linked member), so a
 * CM lands on the Meute's agenda: what is coming, and which past reunions still
 * have no attendance. "All units" is one click away for the group.
 *
 * Everything shown is already scoped by the API to what the user may access.
 */
export default function AdminActivitiesPage() {
    const [units, setUnits] = useState<Unit[]>([]);
    const [activities, setActivities] = useState<ActivityRow[]>([]);
    const [agenda, setAgenda] = useState<SessionRow[]>([]);
    const [monthSessions, setMonthSessions] = useState<SessionRow[]>([]);
    const [me, setMe] = useState<{ isSuperAdmin: boolean; myUnit: MyUnit } | null>(null);
    const [loading, setLoading] = useState(true);

    const { params, setParams } = useUrlState();
    const view: View = (VIEWS.some(v => v.key === params.get("view")) ? params.get("view") : "agenda") as View;
    const month = params.get("month") ?? todayKey().slice(0, 7);

    // ?unit=<id> | ?unit=all | nothing → the user's own unit, else all.
    const unitParam = params.get("unit");
    const myUnitId = me?.myUnit?.accessible ? me.myUnit.unit.id : null;
    const scope = unitParam === "all" ? null : unitParam ?? myUnitId;
    const scopeUnit = units.find(u => u.id === scope) ?? null;

    // The form takes over the page, and is part of history (?new=1 / ?edit=id).
    const editParam = params.get("edit");
    const editing = editParam ? activities.find(a => a.id === editParam) ?? null : null;
    const formOpen = !!editing || params.get("new") === "1";
    const [pushedForm, setPushedForm] = useState(false);
    const closeByBack = pushedForm || params.get("return") === "1";

    function openForm(target: ActivityRow | "new") {
        setPushedForm(true);
        setParams(target === "new" ? { new: "1", edit: null } : { edit: target.id, new: null }, "push");
        window.scrollTo({ top: 0 });
    }

    const loadBase = useCallback(async () => {
        const [uRes, aRes, meRes] = await Promise.all([
            fetch("/api/admin/units"),
            fetch("/api/admin/activities"),
            fetch("/api/auth/me"),
        ]);
        if (uRes.ok) setUnits(await uRes.json());
        if (aRes.ok) setActivities(await aRes.json());
        if (meRes.ok) {
            const d = await meRes.json();
            setMe({ isSuperAdmin: !!d.user?.isSuperAdmin, myUnit: d.user?.myUnit ?? null });
        }
        setLoading(false);
    }, []);

    // On arrival, and again whenever the form opens or closes: a form reached by
    // a direct link needs the units, and a saved one changes the list.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { loadBase(); }, [formOpen, loadBase]);

    // The agenda window: four weeks back (attendance still to take) and eight ahead.
    useEffect(() => {
        if (loading) return;
        const q = new URLSearchParams({ from: addDays(todayKey(), -28), to: addDays(todayKey(), 56), includeHidden: "true" });
        if (scope) q.set("unitId", scope);
        fetch(`/api/admin/sessions?${q}`).then(r => (r.ok ? r.json() : [])).then(setAgenda);
    }, [loading, scope]);

    useEffect(() => {
        if (loading || view !== "calendar") return;
        const { from, to } = monthGrid(month);
        const q = new URLSearchParams({ from, to, includeHidden: "true" });
        if (scope) q.set("unitId", scope);
        fetch(`/api/admin/sessions?${q}`).then(r => (r.ok ? r.json() : [])).then(setMonthSessions);
    }, [loading, view, month, scope]);

    // Pages reached from here link back to the same view.
    const listQuery = useMemo(() => {
        const q = new URLSearchParams(params.toString());
        q.delete("edit"); q.delete("return"); q.delete("new");
        return q.toString();
    }, [params]);
    useEffect(() => { rememberActivitiesList(listQuery); }, [listQuery]);

    const sortedUnits = useMemo(() => [...units].sort(compareUnitsByBranch), [units]);
    const scopedActivities = useMemo(
        () => scope ? activities.filter(a => a.unitId === scope || a.unit.unitType === "ALL") : activities,
        [activities, scope]
    );

    if (loading) return <p className="text-muted-foreground">Loading…</p>;

    if (formOpen) {
        return (
            <ActivityForm
                key={editing?.id ?? "new"}
                editing={editing}
                units={units}
                defaultUnitId={scope ?? undefined}
                closeByBack={closeByBack}
                onDone={() => setParams({ edit: null, new: null, return: null })}
            />
        );
    }

    const theme = unitTheme(scopeUnit?.unitType ?? "GROUP");

    return (
        <div className="space-y-5">
            {/* ── Header ── */}
            <div className={`rounded-3xl ${theme.pageAccent} text-white p-5 md:p-7`}>
                <div className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-white/70">Activities</p>
                        <h1 className="text-2xl md:text-3xl font-black">{scopeUnit?.name ?? "All units"}</h1>
                        {scopeUnit && scope === myUnitId && me?.myUnit?.role && (
                            <p className="text-sm text-white/80 mt-0.5">Your unit · {me.myUnit.role}</p>
                        )}
                    </div>
                    <Button onClick={() => openForm("new")} className="gap-2 bg-white text-foreground hover:bg-white/90">
                        <Plus className="w-4 h-4" /> New activity
                    </Button>
                </div>

                {/* Unit switcher */}
                <div className="flex flex-wrap gap-1.5 mt-5">
                    <ScopeChip active={!scope} onClick={() => setParams({ unit: "all" })}>All units</ScopeChip>
                    {sortedUnits.filter(u => u.unitType !== "ARCHIVE" && u.unitType !== "ALL").map(u => (
                        <ScopeChip key={u.id} active={scope === u.id} onClick={() => setParams({ unit: u.id })} dot={unitTheme(u.unitType).dot}>
                            {u.id === myUnitId && <Star className="w-3 h-3" />}
                            {u.name}
                        </ScopeChip>
                    ))}
                </div>
            </div>

            <StatsStrip sessions={agenda} />

            {/* ── View switcher ── */}
            <div className="inline-flex items-center rounded-full bg-muted/60 border p-1" role="tablist">
                {VIEWS.map(v => (
                    <button
                        key={v.key}
                        role="tab"
                        aria-selected={view === v.key}
                        onClick={() => setParams({ view: v.key === "agenda" ? null : v.key })}
                        className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-semibold transition-all ${
                            view === v.key ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        <v.icon className="w-4 h-4" /> {v.label}
                    </button>
                ))}
            </div>

            {view === "agenda" && <AgendaView sessions={agenda} showUnit={!scope} />}
            {view === "calendar" && (
                <CalendarView
                    month={month}
                    sessions={monthSessions}
                    onMonth={m => setParams({ month: m === todayKey().slice(0, 7) ? null : m })}
                />
            )}
            {view === "list" && (
                <ListView
                    activities={scopedActivities}
                    units={units}
                    isSuperAdmin={!!me?.isSuperAdmin}
                    onEdit={openForm}
                    onChanged={loadBase}
                />
            )}
        </div>
    );
}

function ScopeChip({ active, onClick, dot, children }: {
    active: boolean; onClick: () => void; dot?: string; children: React.ReactNode;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={active}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                active ? "bg-white text-foreground shadow-sm" : "bg-white/10 hover:bg-white/20 text-white border border-white/20"
            }`}
        >
            {dot && <span className={`w-2 h-2 rounded-full ${dot}`} />}
            {children}
        </button>
    );
}
