"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { Pencil, Trash2, Users, Star, ChevronRight, List, Search, Network, UserPlus, FolderPlus, X, FileSpreadsheet, FileText, Globe, TreePine, Compass, Mountain, Phone, Calendar, MapPin, History, ArrowUpRight } from "lucide-react";
import { SUBGROUP_LABEL_BY_UNIT_TYPE, UNIT_CONTAINER_NAME, UNIT_GENDER, UNIT_TYPES, progressionLabel, unitHoldsMembers, leadershipRolesOf } from "@/lib/scout-config";
import { useUrlState } from "@/hooks/use-url-state";
import { exportMembersToExcel, exportMembersToPDF } from "@/lib/export-members";

type Unit = { id: string; name: string; unitType: string };
type Subgroup = { id: string; name: string; description: string | null; unitId: string; unit: Unit; _count: { members: number } };
type Member = {
    id: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string | null;
    phone: string | null;
    email: string | null;
    bloodType: string | null;
    role: string | null;
    // Concurrent roles; for a Routier who is ACT of the Troupe, "ACT" is here.
    extraRoles?: string[];
    progressions: string[];
    unitId: string;
    // The unit a leader runs, when it is not the one they belong to.
    servesUnitId?: string | null;
    subgroupId: string | null;
    unit: { name: string; unitType: string };
    subgroup: { id: string; name: string } | null;
    photoUrl: string | null;
    city: string | null;
    fatherName: string | null;
    fatherPhone: string | null;
    motherName: string | null;
    motherPhone: string | null;
    emergencyContactName: string | null;
    emergencyContactPhone: string | null;
    doctorName: string | null;
    doctorPhone: string | null;
    chronicIllnesses: string | null;
    joinedAt: string;
    // Most recent move only (the list endpoint sends just one), used for the
    // short-lived "came from …" tag.
    moves?: Array<{ moveDate: string; fromUnitId: string | null; revertedAt: string | null }>;
};

type View = "visual" | "list";

// ─── Recent-arrival tags ──────────────────────────────────────────────────────
// Both tags fade away on their own after this long, so the roster does not stay
// permanently decorated.
const RECENT_MONTHS = 2;

function withinRecentWindow(iso: string | null | undefined): boolean {
    if (!iso) return false;
    const then = new Date(iso).getTime();
    if (!Number.isFinite(then)) return false;
    const cutoff = Date.now() - RECENT_MONTHS * 30 * 24 * 60 * 60 * 1000;
    return then >= cutoff;
}

/** A member who joined the group recently — brand new, not moved up. */
function isNewMember(m: Member): boolean {
    if (!withinRecentWindow(m.joinedAt)) return false;
    // Someone who was moved up is not "new" to the group, only to this unit.
    return !lastMove(m);
}

/** The most recent move that actually changed unit and has not been reverted. */
function lastMove(m: Member) {
    const mv = m.moves?.[0];
    if (!mv || mv.revertedAt || !mv.fromUnitId) return null;
    return withinRecentWindow(mv.moveDate) ? mv : null;
}

// Per-unit-type colors (for subgroup cards in members visual view)
const UNIT_THEME: Record<string, {
    headerBg: string;       // colored header bg of subgroup card
    pageAccent: string;     // page hero accent background
    chip: string;
    iconBg: string;
    icon: typeof Users;
    leadChip: string;
    assistantChip: string;
    dot: string;            // solid swatch for the unit tabs
}> = {
    LOUVETEAUX: {
        headerBg: "bg-gradient-to-br from-amber-100 via-yellow-50 to-amber-50 border-b border-amber-200",
        pageAccent: "bg-gradient-to-br from-amber-500 via-yellow-500 to-amber-600",
        chip: "bg-yellow-100 text-yellow-800",
        iconBg: "bg-amber-100 text-amber-700",
        icon: TreePine,
        leadChip: "bg-amber-500 text-white",
        assistantChip: "bg-amber-100 text-amber-700",
        dot: "bg-amber-500",
    },
    ECLAIREURS: {
        headerBg: "bg-gradient-to-br from-emerald-100 via-green-50 to-emerald-50 border-b border-emerald-200",
        pageAccent: "bg-gradient-to-br from-emerald-600 via-green-700 to-emerald-800",
        chip: "bg-emerald-100 text-emerald-800",
        iconBg: "bg-emerald-100 text-emerald-700",
        icon: Compass,
        leadChip: "bg-emerald-600 text-white",
        assistantChip: "bg-emerald-100 text-emerald-700",
        dot: "bg-emerald-600",
    },
    ROUTIERS: {
        headerBg: "bg-gradient-to-br from-rose-100 via-red-50 to-rose-50 border-b border-rose-200",
        pageAccent: "bg-gradient-to-br from-red-500 via-rose-600 to-red-700",
        chip: "bg-rose-100 text-rose-800",
        iconBg: "bg-rose-100 text-rose-700",
        icon: Mountain,
        leadChip: "bg-rose-600 text-white",
        assistantChip: "bg-rose-100 text-rose-700",
        dot: "bg-rose-600",
    },
    // ─── Girls track ─────────────────────────────────────────────────────────
    LOUVETTES: {
        headerBg: "bg-gradient-to-br from-teal-100 via-cyan-50 to-teal-50 border-b border-teal-200",
        pageAccent: "bg-gradient-to-br from-teal-500 via-cyan-500 to-teal-600",
        chip: "bg-teal-100 text-teal-800",
        iconBg: "bg-teal-100 text-teal-700",
        icon: TreePine,
        leadChip: "bg-teal-500 text-white",
        assistantChip: "bg-teal-100 text-teal-700",
        dot: "bg-teal-500",
    },
    ECLAIREUSES: {
        headerBg: "bg-gradient-to-br from-violet-100 via-purple-50 to-violet-50 border-b border-violet-200",
        pageAccent: "bg-gradient-to-br from-violet-600 via-purple-700 to-violet-800",
        chip: "bg-violet-100 text-violet-800",
        iconBg: "bg-violet-100 text-violet-700",
        icon: Compass,
        leadChip: "bg-violet-600 text-white",
        assistantChip: "bg-violet-100 text-violet-700",
        dot: "bg-violet-600",
    },
    PIONNIERES: {
        headerBg: "bg-gradient-to-br from-pink-100 via-fuchsia-50 to-pink-50 border-b border-pink-200",
        pageAccent: "bg-gradient-to-br from-pink-500 via-fuchsia-600 to-pink-700",
        chip: "bg-pink-100 text-pink-800",
        iconBg: "bg-pink-100 text-pink-700",
        icon: Mountain,
        leadChip: "bg-pink-600 text-white",
        assistantChip: "bg-pink-100 text-pink-700",
        dot: "bg-pink-600",
    },
    GROUP: {
        headerBg: "bg-gradient-to-br from-primary/5 to-transparent border-b border-border",
        pageAccent: "bg-gradient-to-br from-primary via-primary to-emerald-700",
        chip: "bg-primary/10 text-primary",
        iconBg: "bg-primary/10 text-primary",
        icon: Users,
        leadChip: "bg-primary text-white",
        assistantChip: "bg-primary/10 text-primary",
        dot: "bg-primary",
    },
};

/**
 * Units in scouting order — youngest branch first, leadership last — rather
 * than alphabetically, which scattered a Meute, a Troupe and a Clan at random.
 */
function byBranch(a: Unit, b: Unit): number {
    const order = (t: string) => {
        const i = (UNIT_TYPES as readonly string[]).indexOf(t);
        return i === -1 ? 99 : i;
    };
    // Pair each boys' branch with its girls' equivalent: 0,3 → 0 · 1,4 → 1 · 2,5 → 2.
    const band = (t: string) => { const i = order(t); return i < 6 ? i % 3 : i; };
    return band(a.unitType) - band(b.unitType) || order(a.unitType) - order(b.unitType) || a.name.localeCompare(b.name);
}

// Sort priority for roles in a subgroup
function roleSortIndex(role: string | null, labels: { lead: string; assistant: string }): number {
    if (role === labels.lead) return 0;
    if (role === labels.assistant) return 1;
    if (["SI", "CP", "CE", "SIS", "CPS", "CES"].includes(role ?? "")) return 2;
    if (["SE", "SP", "SES", "SPS"].includes(role ?? "")) return 3;
    return 10;
}

export default function AdminMembersPage() {
    const [members, setMembers] = useState<Member[]>([]);
    const [units, setUnits] = useState<Unit[]>([]);
    const [subgroups, setSubgroups] = useState<Subgroup[]>([]);
    const [loading, setLoading] = useState(true);

    const [showSubgroupForm, setShowSubgroupForm] = useState(false);
    const [editingSubgroup, setEditingSubgroup] = useState<Subgroup | null>(null);

    // ── URL-backed navigation state ──────────────────────────────────────────
    // The selected unit, the view and the open member live in the query string,
    // not in React state, so a refresh keeps you where you were and Back closes
    // the preview instead of leaving the page.
    const { params, setParams } = useUrlState();
    const unitParam = params.get("unit");
    const previewMemberId = params.get("member");
    const view: View = params.get("view") === "list" ? "list" : "visual";

    // Typed into local state so it is instant, then mirrored to the URL shortly
    // after — a refresh keeps the search without rewriting history per keystroke.
    const [search, setSearch] = useState(() => params.get("q") ?? "");
    useEffect(() => {
        const t = setTimeout(() => setParams({ q: search.trim() || null }), 350);
        return () => clearTimeout(t);
    }, [search, setParams]);

    // Only units that have a roster. "All Units" exists so group-wide activities
    // have something to belong to, and the anciens archive is bookkeeping —
    // neither holds members, so neither belongs on this page.
    const rosterUnits = useMemo(
        () => units.filter(u => unitHoldsMembers(u.unitType)).sort(byBranch),
        [units]
    );
    const rosterUnitIds = useMemo(() => new Set(rosterUnits.map(u => u.id)), [rosterUnits]);
    const rosterMembers = useMemo(
        () => members.filter(m => rosterUnitIds.has(m.unitId)),
        [members, rosterUnitIds]
    );

    // Falls back to the first unit when the URL names one that no longer exists.
    const activeUnitId = useMemo(() => {
        if (unitParam === "ALL") return "ALL";
        if (unitParam && rosterUnitIds.has(unitParam)) return unitParam;
        return rosterUnits[0]?.id ?? "";
    }, [unitParam, rosterUnits, rosterUnitIds]);

    /** Did WE push the history entry for the open preview? */
    const pushedPreview = useRef(false);
    useEffect(() => {
        // Closed by the browser's Back button rather than ours: forget the entry.
        if (!previewMemberId) pushedPreview.current = false;
    }, [previewMemberId]);

    // Switching unit or view replaces rather than pushes, so Back does not walk
    // through every tab the user clicked.
    function selectUnit(id: string) {
        setShowSubgroupForm(false);
        setEditingSubgroup(null);
        setParams({ unit: id, member: null });
    }

    function setView(next: View) {
        setParams({ view: next === "list" ? "list" : null });
    }

    function openPreview(memberId: string) {
        pushedPreview.current = true;
        setParams({ member: memberId }, "push");
    }

    function closePreview() {
        if (pushedPreview.current) {
            // We added the entry, so stepping back is exactly right.
            pushedPreview.current = false;
            window.history.back();
        } else {
            // Opened by a direct link or survived a refresh — there is no entry
            // of ours to go back to, and back() would leave the page entirely.
            setParams({ member: null });
        }
    }

    async function fetchData() {
        const [mRes, uRes, sgRes] = await Promise.all([
            fetch("/api/admin/members"),
            fetch("/api/admin/units"),
            fetch("/api/admin/subgroups"),
        ]);
        if (mRes.ok) setMembers(await mRes.json());
        if (uRes.ok) setUnits(await uRes.json());
        if (sgRes.ok) setSubgroups(await sgRes.json());
        setLoading(false);
    }

    /** Assign an unassigned member to a sub-group from the roster. */
    async function handleAssignSubgroup(memberId: string, subgroupId: string) {
        const res = await fetch(`/api/admin/members/${memberId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ subgroupId }),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            alert(err.error || "Could not assign this member");
            return;
        }
        fetchData();
    }

    // Initial load only. fetchData no longer depends on the selected unit —
    // that now comes from the URL — so it never needs to re-run on selection.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { fetchData(); }, []);

    const activeUnit = useMemo(() => rosterUnits.find(u => u.id === activeUnitId) || null, [rosterUnits, activeUnitId]);
    const unitMembers = useMemo(() => members.filter(m => m.unitId === activeUnitId), [members, activeUnitId]);
    const unitSubgroups = useMemo(() => subgroups.filter(s => s.unitId === activeUnitId), [subgroups, activeUnitId]);

    const labels = activeUnit ? SUBGROUP_LABEL_BY_UNIT_TYPE[activeUnit.unitType] || SUBGROUP_LABEL_BY_UNIT_TYPE.GROUP : null;
    const containerName = activeUnit ? UNIT_CONTAINER_NAME[activeUnit.unitType] || "Unit" : "";

    // Search runs across every unit: the question is usually "where is X?".
    const query = search.trim().toLowerCase();
    const searchResults = useMemo(() => {
        if (!query) return [];
        const digits = query.replace(/\s+/g, "");
        return rosterMembers
            .filter(m =>
                `${m.firstName} ${m.lastName}`.toLowerCase().includes(query)
                || `${m.lastName} ${m.firstName}`.toLowerCase().includes(query)
                || (!!m.phone && /\d/.test(digits) && m.phone.replace(/\s+/g, "").includes(digits)))
            .sort((a, b) => `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`));
    }, [query, rosterMembers]);

    async function handleDeleteSubgroup(id: string) {
        if (!confirm("Delete this group? Members in it will become unassigned.")) return;
        await fetch(`/api/admin/subgroups/${id}`, { method: "DELETE" });
        fetchData();
    }

    if (loading) return <p className="text-muted-foreground">Loading...</p>;

    // Adding from a unit's tab pre-selects that unit in the form.
    const addMemberHref = activeUnit ? `/admin/members/new?unit=${activeUnit.id}` : "/admin/members/new";

    return (
        <div>
            {/* ── Page header: only what acts on the whole page ── */}
            <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
                <div>
                    <h1 className="text-3xl font-bold">Members</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        {rosterMembers.length} active member{rosterMembers.length !== 1 ? "s" : ""}
                        {" · "}{rosterUnits.length} unit{rosterUnits.length !== 1 ? "s" : ""}
                    </p>
                </div>
                <Link href={addMemberHref}>
                    <Button className="gap-2">
                        <UserPlus className="w-4 h-4" /> Add member
                    </Button>
                </Link>
            </div>

            {/* ── Search, across every unit ── */}
            <div className="relative mb-5">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <Input
                    placeholder="Search all members by name or phone…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-10 pr-10 h-11"
                    aria-label="Search all members"
                />
                {search && (
                    <button
                        type="button"
                        onClick={() => setSearch("")}
                        aria-label="Clear search"
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>

            {query ? (
                <SearchResults
                    results={searchResults}
                    units={rosterUnits}
                    query={search.trim()}
                    onPreview={openPreview}
                />
            ) : (
                <>
                    {/* ── Unit tabs: young → old, each in its branch color ── */}
                    <div className="-mx-4 px-4 mb-6 overflow-x-auto">
                        <div className="flex items-center gap-2 pb-2 min-w-max">
                            <button
                                onClick={() => selectUnit("ALL")}
                                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ${
                                    activeUnitId === "ALL"
                                        ? "bg-foreground text-background shadow-md"
                                        : "bg-muted text-muted-foreground hover:bg-muted/70"
                                }`}
                            >
                                <Globe className="w-3.5 h-3.5" /> All
                                <span className="text-[11px] font-semibold opacity-70 tabular-nums">{rosterMembers.length}</span>
                            </button>

                            {rosterUnits.length > 0 && <span className="h-6 w-px bg-border mx-1" aria-hidden />}

                            {rosterUnits.map(u => {
                                const theme = UNIT_THEME[u.unitType] || UNIT_THEME.GROUP;
                                const count = members.filter(m => m.unitId === u.id).length;
                                const active = activeUnitId === u.id;
                                return (
                                    <button
                                        key={u.id}
                                        onClick={() => selectUnit(u.id)}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ${
                                            active
                                                ? `${theme.leadChip} shadow-md`
                                                : "bg-muted text-muted-foreground hover:bg-muted/70"
                                        }`}
                                    >
                                        <span className={`w-2 h-2 rounded-full ${active ? "bg-white/80" : theme.dot}`} aria-hidden />
                                        {u.name}
                                        <span className="text-[11px] font-semibold opacity-70 tabular-nums">{count}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {activeUnitId === "ALL" ? (
                        <AllUnitsView
                            units={rosterUnits}
                            subgroups={subgroups}
                            members={rosterMembers}
                            onPreview={openPreview}
                            onSelectUnit={selectUnit}
                        />
                    ) : !activeUnit || !labels ? (
                        <div className="text-center py-20 bg-muted/20 rounded-2xl border border-dashed">
                            <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                            <p className="text-muted-foreground mb-1">No units to show yet.</p>
                            <Link href="/admin/units" className="text-sm text-primary underline underline-offset-4">
                                Create a unit first
                            </Link>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Everything that acts on THIS unit lives in its header. */}
                            <UnitHeader
                                unit={activeUnit}
                                members={unitMembers}
                                subgroups={unitSubgroups}
                                labels={labels}
                                containerName={containerName}
                                view={view}
                                onViewChange={setView}
                                onAddSubgroup={() => { setEditingSubgroup(null); setShowSubgroupForm(true); }}
                            />

                            {showSubgroupForm && (
                                <SubgroupForm
                                    unit={activeUnit}
                                    labels={labels}
                                    editing={editingSubgroup}
                                    onCancel={() => { setShowSubgroupForm(false); setEditingSubgroup(null); }}
                                    onSaved={() => { setShowSubgroupForm(false); setEditingSubgroup(null); fetchData(); }}
                                />
                            )}

                            <UnitMaitrise
                                unit={activeUnit}
                                leaders={members.filter(m => m.servesUnitId === activeUnit.id)}
                                onPreview={openPreview}
                            />

                            {view === "visual" ? (
                                <VisualView
                                    unit={activeUnit}
                                    subgroups={unitSubgroups}
                                    members={unitMembers}
                                    labels={labels}
                                    onEditSubgroup={(sg) => { setEditingSubgroup(sg); setShowSubgroupForm(true); }}
                                    onDeleteSubgroup={handleDeleteSubgroup}
                                    onPreview={openPreview}
                                    allUnits={units}
                                    onAssignSubgroup={handleAssignSubgroup}
                                />
                            ) : (
                                <ListView
                                    unit={activeUnit}
                                    members={unitMembers}
                                    subgroups={unitSubgroups}
                                    allUnits={units}
                                    onPreview={openPreview}
                                    onChanged={fetchData}
                                />
                            )}
                        </div>
                    )}
                </>
            )}

            {previewMemberId && (
                <MemberPreviewModal
                    memberId={previewMemberId}
                    onClose={closePreview}
                />
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Search results (across all units)
// ─────────────────────────────────────────────────────────────────────────────

const SEARCH_LIMIT = 60;

function SearchResults({ results, units, query, onPreview }: {
    results: Member[];
    units: Unit[];
    query: string;
    onPreview: (id: string) => void;
}) {
    if (results.length === 0) {
        return (
            <div className="text-center py-16 bg-muted/20 rounded-2xl border border-dashed">
                <Search className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                    No active member matches &quot;{query}&quot;.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                    Former members are under Milestones → Anciens.
                </p>
            </div>
        );
    }

    return (
        <div className="border rounded-2xl overflow-hidden bg-card">
            <div className="px-4 py-2.5 border-b bg-muted/30 text-xs font-semibold text-muted-foreground">
                {results.length} match{results.length !== 1 ? "es" : ""}
            </div>
            <div className="divide-y">
                {results.slice(0, SEARCH_LIMIT).map(m => {
                    const theme = UNIT_THEME[m.unit.unitType] || UNIT_THEME.GROUP;
                    return (
                        <button
                            key={m.id}
                            type="button"
                            onClick={() => onPreview(m.id)}
                            className="w-full text-left flex items-center gap-3 px-4 py-2.5 hover:bg-muted/40 transition-colors"
                        >
                            <div className={`w-9 h-9 rounded-full ${theme.iconBg} flex items-center justify-center text-xs font-bold shrink-0 overflow-hidden`}>
                                {m.photoUrl ? (
                                    /* eslint-disable-next-line @next/next/no-img-element */
                                    <img src={m.photoUrl} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    `${m.firstName[0] ?? ""}${m.lastName[0] ?? ""}`.toUpperCase()
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-sm font-semibold truncate">{m.firstName} {m.lastName}</span>
                                    <MaitriseTag member={m} units={units} />
                                    <RecentTags member={m} units={units} />
                                </div>
                                <div className="text-xs text-muted-foreground truncate">
                                    {m.subgroup?.name ? `${m.subgroup.name} · ` : ""}
                                    {m.role ? `${m.role} · ` : ""}
                                    {m.phone || "no phone"}
                                </div>
                            </div>
                            <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold shrink-0 ${theme.chip}`}>
                                {m.unit.name}
                            </span>
                        </button>
                    );
                })}
            </div>
            {results.length > SEARCH_LIMIT && (
                <p className="px-4 py-2 text-xs text-muted-foreground bg-muted/30 border-t">
                    Showing the first {SEARCH_LIMIT} — keep typing to narrow it down.
                </p>
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Unit header: identity, numbers, and every action that applies to the unit
// ─────────────────────────────────────────────────────────────────────────────

const ON_COLOR_BUTTON =
    "inline-flex items-center gap-2 h-9 px-3.5 rounded-full text-sm font-semibold " +
    "bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur text-white " +
    "transition-colors disabled:opacity-40 disabled:pointer-events-none";

function UnitHeader({
    unit, members, subgroups, labels, containerName, view, onViewChange, onAddSubgroup,
}: {
    unit: Unit;
    members: Member[];
    subgroups: Subgroup[];
    labels: { singular: string; plural: string; lead: string; assistant: string };
    containerName: string;
    view: View;
    onViewChange: (v: View) => void;
    onAddSubgroup: () => void;
}) {
    const theme = UNIT_THEME[unit.unitType] || UNIT_THEME.GROUP;
    const unassigned = members.filter(m => !m.subgroupId).length;

    return (
        <div className={`rounded-3xl ${theme.pageAccent} text-white p-5 md:p-7`}>
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center shrink-0">
                        <theme.icon className="w-6 h-6" />
                    </div>
                    <div className="min-w-0">
                        <span className="text-xs font-bold uppercase tracking-widest text-white/70">{containerName}</span>
                        <h2 className="text-2xl md:text-3xl font-black truncate">{unit.name}</h2>
                    </div>
                </div>
                <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
                    <span><strong>{members.length}</strong> <span className="text-white/70">member{members.length !== 1 ? "s" : ""}</span></span>
                    <span><strong>{subgroups.length}</strong> <span className="text-white/70">{subgroups.length === 1 ? labels.singular : labels.plural}</span></span>
                    {unassigned > 0 && (
                        <span><strong>{unassigned}</strong> <span className="text-white/70">unassigned</span></span>
                    )}
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-5">
                <div className="inline-flex items-center rounded-full bg-black/15 p-1" role="group" aria-label="View">
                    <button
                        type="button"
                        onClick={() => onViewChange("visual")}
                        aria-pressed={view === "visual"}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold transition-all ${
                            view === "visual" ? "bg-white text-foreground shadow-sm" : "text-white/80 hover:text-white"
                        }`}
                    >
                        <Network className="w-4 h-4" /> Visual
                    </button>
                    <button
                        type="button"
                        onClick={() => onViewChange("list")}
                        aria-pressed={view === "list"}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold transition-all ${
                            view === "list" ? "bg-white text-foreground shadow-sm" : "text-white/80 hover:text-white"
                        }`}
                    >
                        <List className="w-4 h-4" /> List
                    </button>
                </div>

                <button type="button" onClick={onAddSubgroup} className={ON_COLOR_BUTTON}>
                    <FolderPlus className="w-4 h-4" /> Add {labels.singular}
                </button>

                <div className="flex-1" />

                <button
                    type="button"
                    disabled={members.length === 0}
                    onClick={() => {
                        exportMembersToPDF(unit, subgroups, members)
                            .catch(() => alert("Could not generate the PDF."));
                    }}
                    className={ON_COLOR_BUTTON}
                >
                    <FileText className="w-4 h-4" /> PDF
                </button>
                <button
                    type="button"
                    disabled={members.length === 0}
                    onClick={() => {
                        exportMembersToExcel(unit, members)
                            .catch(() => alert("Could not generate the Excel file."));
                    }}
                    className={ON_COLOR_BUTTON}
                >
                    <FileSpreadsheet className="w-4 h-4" /> Excel
                </button>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Visual hierarchy view
// ─────────────────────────────────────────────────────────────────────────────

function VisualView({
    unit, subgroups, members, labels,
    onEditSubgroup, onDeleteSubgroup, onPreview, allUnits, onAssignSubgroup,
}: {
    unit: Unit;
    subgroups: Subgroup[];
    members: Member[];
    labels: { singular: string; plural: string; lead: string; assistant: string };
    onEditSubgroup: (s: Subgroup) => void;
    onDeleteSubgroup: (id: string) => void;
    onPreview: (id: string) => void;
    // Needed to turn a move's fromUnitId into a readable unit name.
    allUnits: Unit[];
    onAssignSubgroup: (memberId: string, subgroupId: string) => void;
}) {
    const unassigned = members.filter(m => !m.subgroupId).sort(sortMembers(labels));

    return (
        <div className="space-y-6">
            {/* Subgroups */}
            {subgroups.length === 0 ? (
                <div className="text-center py-12 bg-muted/20 rounded-2xl border border-dashed">
                    <p className="text-sm text-muted-foreground mb-2">No {labels.plural.toLowerCase()} yet.</p>
                    <p className="text-xs text-muted-foreground">Use &quot;Add {labels.singular}&quot; in the header above to create one.</p>
                </div>
            ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {subgroups.map(sg => (
                        <SubgroupCard
                            key={sg.id}
                            unitType={unit.unitType}
                            subgroup={sg}
                            members={members.filter(m => m.subgroupId === sg.id).sort(sortMembers(labels))}
                            labels={labels}
                            onEdit={() => onEditSubgroup(sg)}
                            onDelete={() => onDeleteSubgroup(sg.id)}
                            onPreview={onPreview}
                            allUnits={allUnits}
                        />
                    ))}
                </div>
            )}

            {/* Unassigned (chefs / unaffiliated) */}
            {unassigned.length > 0 && (
                <div className={`border rounded-2xl p-5 bg-muted/20`}>
                    <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-3">Unassigned to a {labels.singular}</h3>
                    {subgroups.length === 0 && (
                        <p className="text-xs text-muted-foreground mb-3">
                            Create a {labels.singular.toLowerCase()} above before you can assign anyone to one.
                        </p>
                    )}
                    <div className="space-y-2">
                        {unassigned.map(m => (
                            <div key={m.id} className="flex items-center gap-2">
                                <div className="flex-1 min-w-0">
                                    <MemberRow member={m} unitType={unit.unitType} onPreview={onPreview} allUnits={allUnits} />
                                </div>
                                {/* Assign straight from the roster — a newly enrolled
                                    member arrives here with no sub-group. */}
                                {subgroups.length > 0 && (
                                    <select
                                        value=""
                                        aria-label={`Assign ${m.firstName} ${m.lastName} to a ${labels.singular}`}
                                        onChange={e => e.target.value && onAssignSubgroup(m.id, e.target.value)}
                                        className="h-8 shrink-0 rounded-md border border-input bg-background px-2 text-xs"
                                    >
                                        <option value="">Assign to…</option>
                                        {subgroups.map(sg => (
                                            <option key={sg.id} value={sg.id}>{sg.name}</option>
                                        ))}
                                    </select>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function sortMembers(labels: { lead: string; assistant: string }) {
    return (a: Member, b: Member) => {
        const ai = roleSortIndex(a.role, labels);
        const bi = roleSortIndex(b.role, labels);
        if (ai !== bi) return ai - bi;
        return `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`);
    };
}

function SubgroupCard({
    unitType, subgroup, members, labels, onEdit, onDelete, onPreview, allUnits = [],
}: {
    unitType: string;
    subgroup: Subgroup;
    members: Member[];
    labels: { lead: string; assistant: string; singular: string };
    onEdit: () => void;
    onDelete: () => void;
    onPreview: (id: string) => void;
    allUnits?: Unit[];
}) {
    const theme = UNIT_THEME[unitType] || UNIT_THEME.GROUP;
    const lead = members.find(m => m.role === labels.lead);
    const assistant = members.find(m => m.role === labels.assistant);
    const others = members.filter(m => m.role !== labels.lead && m.role !== labels.assistant);

    // A maîtrise group such as "Troupe" holds the leaders of BOTH troupes, the
    // boys' and the girls'. When its members serve more than one unit, list
    // them under the unit each one serves instead of as one flat list.
    const servedIds = [...new Set(members.map(m => m.servesUnitId).filter((id): id is string => !!id))];
    const servedUnits = servedIds
        .map(id => allUnits.find(u => u.id === id))
        .filter((u): u is Unit => !!u)
        .sort(byBranch);
    const splitByServedUnit = servedUnits.length >= 2;
    const servingNowhere = members.filter(m => !m.servesUnitId || !servedUnits.some(u => u.id === m.servesUnitId));

    return (
        <div className="bg-card border rounded-2xl overflow-hidden hover:shadow-lg hover:shadow-primary/5 transition-all group">
            <div className={`p-5 ${theme.headerBg}`}>
                <div className="flex justify-between items-start mb-1">
                    <div>
                        <h3 className="font-extrabold text-lg">{subgroup.name}</h3>
                        {subgroup.description && <p className="text-xs text-muted-foreground mt-0.5">{subgroup.description}</p>}
                    </div>
                    <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={onEdit} className="h-7 w-7 p-0" title="Rename"><Pencil className="w-3.5 h-3.5" /></Button>
                        <Button variant="ghost" size="sm" onClick={onDelete} className="h-7 w-7 p-0 text-destructive" title="Delete"><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                </div>
                <div className="text-xs text-muted-foreground font-medium">
                    {members.length} member{members.length !== 1 ? "s" : ""}
                </div>
            </div>
            {splitByServedUnit ? (
                <div className="p-4 space-y-3">
                    {servedUnits.map(u => {
                        const serving = members.filter(m => m.servesUnitId === u.id);
                        const gender = UNIT_GENDER[u.unitType];
                        return (
                            <div key={u.id}>
                                <div className="flex items-center gap-2 px-2 mb-1">
                                    <span className={`w-2 h-2 rounded-full ${(UNIT_THEME[u.unitType] || UNIT_THEME.GROUP).dot}`} />
                                    <span className="text-xs font-bold uppercase tracking-wider">{u.name}</span>
                                    {gender !== "MIXED" && (
                                        <span className="text-[10px] font-medium text-muted-foreground">{gender === "BOYS" ? "Boys" : "Girls"}</span>
                                    )}
                                    <span className="text-[10px] text-muted-foreground ml-auto">{serving.length}</span>
                                </div>
                                <div className="space-y-1 border-l-2 border-muted ml-[11px] pl-1">
                                    {serving.map(m => <MemberRow key={m.id} member={m} unitType={unitType} onPreview={onPreview} allUnits={allUnits} />)}
                                </div>
                            </div>
                        );
                    })}
                    {servingNowhere.length > 0 && (
                        <div>
                            <div className="px-2 mb-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">Unit not set</div>
                            <div className="space-y-1 border-l-2 border-dashed border-muted ml-[11px] pl-1">
                                {servingNowhere.map(m => <MemberRow key={m.id} member={m} unitType={unitType} onPreview={onPreview} allUnits={allUnits} />)}
                            </div>
                        </div>
                    )}
                </div>
            ) : (
            <div className="p-4 space-y-2">
                {lead && <MemberRow member={lead} unitType={unitType} accentRole={labels.lead} onPreview={onPreview} allUnits={allUnits} />}
                {assistant && <MemberRow member={assistant} unitType={unitType} accentRole={labels.assistant} onPreview={onPreview} allUnits={allUnits} />}
                {(lead || assistant) && others.length > 0 && <div className="border-t my-2" />}
                {others.length === 0 && !lead && !assistant ? (
                    <p className="text-xs text-muted-foreground italic px-2 py-3 text-center">Empty {labels.singular.toLowerCase()}</p>
                ) : (
                    others.map(m => <MemberRow key={m.id} member={m} unitType={unitType} onPreview={onPreview} allUnits={allUnits} />)
                )}
            </div>
            )}
        </div>
    );
}

/**
 * "New" for a recent arrival, "from X" for someone recently moved up. Both
 * disappear on their own after RECENT_MONTHS, so the roster does not stay
 * permanently tagged.
 */
function RecentTags({ member, units }: { member: Member; units: Unit[] }) {
    const moved = lastMove(member);
    const fromUnit = moved ? units.find(u => u.id === moved.fromUnitId) : null;

    if (isNewMember(member)) {
        return (
            <span
                title={`Joined ${new Date(member.joinedAt).toLocaleDateString("en-GB")}`}
                className="px-1.5 py-0.5 rounded-full text-[9px] font-bold shrink-0 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
            >
                NEW
            </span>
        );
    }
    if (moved && fromUnit) {
        return (
            <span
                title={`Moved up on ${new Date(moved.moveDate).toLocaleDateString("en-GB")}`}
                className="px-1.5 py-0.5 rounded-full text-[9px] font-bold shrink-0 bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
            >
                FROM {fromUnit.name.toUpperCase()}
            </span>
        );
    }
    return null;
}

/**
 * "ACT · Troupe Aigle" on a Routier who also leads a younger unit. He is still
 * listed in his équipe as a Routier; the tag is the only sign of the second hat.
 */
function MaitriseTag({ member, units }: { member: Member; units: Unit[] }) {
    // The primary role already shows as the role line; only extras need a tag,
    // unless the primary role is the leadership one and they serve elsewhere.
    const roles = leadershipRolesOf(member, member.unit.unitType)
        .filter(r => r !== member.role || !!member.servesUnitId);
    if (roles.length === 0) return null;
    const served = units.find(u => u.id === member.servesUnitId);
    return (
        <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-primary/10 text-primary shrink-0">
            {roles.join(" / ")}{served ? ` · ${served.name}` : ""}
        </span>
    );
}

/** Assistants (ACT, ACM…) after the chief they assist. */
const isAssistantRole = (role: string) => role.startsWith("A");

/**
 * The leaders who run this unit — its CC, CT, ACTs… They usually belong to
 * another unit (a CT is a Routier), so they never appear in this roster's
 * sub-groups, only here.
 */
function UnitMaitrise({ unit, leaders, onPreview }: {
    unit: Unit;
    leaders: Member[];
    onPreview: (id: string) => void;
}) {
    if (leaders.length === 0) return null;
    const theme = UNIT_THEME[unit.unitType] || UNIT_THEME.GROUP;
    const roleHere = (m: Member) => leadershipRolesOf(m, m.unit.unitType).find(r => !isAssistantRole(r))
        ?? leadershipRolesOf(m, m.unit.unitType)[0] ?? "";
    const sorted = [...leaders].sort((a, b) =>
        Number(isAssistantRole(roleHere(a))) - Number(isAssistantRole(roleHere(b)))
        || `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`));

    return (
        <div className="bg-card border rounded-2xl overflow-hidden">
            <div className={`px-5 py-3 ${theme.headerBg} flex items-center justify-between`}>
                <h3 className="font-extrabold">Maîtrise</h3>
                <span className="text-xs text-muted-foreground font-medium">
                    {leaders.length} leader{leaders.length !== 1 ? "s" : ""}
                </span>
            </div>
            <div className="p-3 grid sm:grid-cols-2 lg:grid-cols-3 gap-1">
                {sorted.map(m => {
                    const role = roleHere(m);
                    const lead = !isAssistantRole(role);
                    return (
                        <button
                            key={m.id}
                            type="button"
                            onClick={() => onPreview(m.id)}
                            className="text-left flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-muted/50 transition-colors"
                        >
                            <div className={`w-8 h-8 rounded-full ${theme.iconBg} flex items-center justify-center text-xs font-bold shrink-0 overflow-hidden`}>
                                {m.photoUrl ? (
                                    /* eslint-disable-next-line @next/next/no-img-element */
                                    <img src={m.photoUrl} alt={m.firstName} className="w-full h-full object-cover" />
                                ) : (
                                    `${m.firstName[0]}${m.lastName[0]}`.toUpperCase()
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-semibold truncate">{m.firstName} {m.lastName}</div>
                                <div className="text-[11px] text-muted-foreground truncate">{m.unit.name}</div>
                            </div>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 inline-flex items-center gap-1 ${
                                lead ? theme.leadChip : theme.assistantChip
                            }`}>
                                {lead && <Star className="w-3 h-3" />} {role}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

function MemberRow({ member, unitType, accentRole, onPreview, allUnits = [] }: { member: Member; unitType?: string; accentRole?: string; onPreview: (id: string) => void; allUnits?: Unit[] }) {
    const theme = UNIT_THEME[unitType || "GROUP"] || UNIT_THEME.GROUP;
    const isLead = accentRole && (accentRole === "CP" || accentRole === "SI" || accentRole === "CE");

    return (
        <button
            type="button"
            onClick={() => onPreview(member.id)}
            className="w-full text-left flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-muted/50 transition-colors group/row"
        >
            <div className={`w-8 h-8 rounded-full ${theme.iconBg} flex items-center justify-center text-xs font-bold shrink-0 overflow-hidden`}>
                {member.photoUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={member.photoUrl} alt={member.firstName} className="w-full h-full object-cover" />
                ) : (
                    `${member.firstName[0]}${member.lastName[0]}`.toUpperCase()
                )}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-sm font-semibold truncate">{member.firstName} {member.lastName}</span>
                    <MaitriseTag member={member} units={allUnits} />
                    <RecentTags member={member} units={allUnits} />
                </div>
                {member.role && (
                    <div className="text-[11px] text-muted-foreground">
                        <span>{member.role}</span>
                        {member.progressions && member.progressions.length > 0 && (
                            <span> • {member.progressions.map(progressionLabel).join(", ")}</span>
                        )}
                    </div>
                )}
            </div>
            {accentRole && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 inline-flex items-center gap-1 ${
                    isLead ? theme.leadChip : theme.assistantChip
                }`}>
                    {isLead && <Star className="w-3 h-3" />} {accentRole}
                </span>
            )}
            <ChevronRight className="w-4 h-4 text-muted-foreground/40 opacity-0 group-hover/row:opacity-100 transition-opacity shrink-0" />
        </button>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// List view
// ─────────────────────────────────────────────────────────────────────────────

function ListView({
    unit, members, subgroups, allUnits, onPreview, onChanged,
}: {
    unit: Unit;
    members: Member[];
    subgroups: Subgroup[];
    allUnits: Unit[];
    onPreview: (id: string) => void;
    onChanged: () => void;
}) {
    const labels = SUBGROUP_LABEL_BY_UNIT_TYPE[unit.unitType] || SUBGROUP_LABEL_BY_UNIT_TYPE.GROUP;
    const theme = UNIT_THEME[unit.unitType] || UNIT_THEME.GROUP;
    const filtered = [...members].sort(sortMembers(labels));

    async function handleDelete(m: Member) {
        if (!confirm(
            `Delete ${m.firstName} ${m.lastName} permanently? This cannot be undone.\n\n` +
            `If they are simply leaving the group, use Transitions → Leaving instead — ` +
            `that keeps their record and adds them to the Anciens.`
        )) return;
        const res = await fetch(`/api/admin/members/${m.id}`, { method: "DELETE" });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            alert(err.error || "Could not delete this member");
            return;
        }
        // Refetch in place — a full reload would be slower and lose scroll.
        onChanged();
    }

    return (
        <div className="space-y-4">
            <div className="border rounded-xl overflow-hidden bg-card">
                <table className="w-full">
                    <thead className="bg-muted/50">
                        <tr>
                            <th className="text-left p-3 text-sm font-medium">Name</th>
                            <th className="text-left p-3 text-sm font-medium">Group</th>
                            <th className="text-left p-3 text-sm font-medium">Role</th>
                            <th className="text-left p-3 text-sm font-medium">Progression</th>
                            <th className="text-left p-3 text-sm font-medium">Phone</th>
                            <th className="text-right p-3 text-sm font-medium">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length === 0 ? (
                            <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No members</td></tr>
                        ) : filtered.map(m => (
                            <tr key={m.id} className="border-t hover:bg-muted/20 cursor-pointer" onClick={() => onPreview(m.id)}>
                                <td className="p-3 text-sm font-medium">
                                    <span className="inline-flex items-center gap-1.5 flex-wrap">
                                        <span className="hover:text-primary">{m.firstName} {m.lastName}</span>
                                        <MaitriseTag member={m} units={allUnits} />
                                        <RecentTags member={m} units={allUnits} />
                                    </span>
                                </td>
                                <td className="p-3 text-sm text-muted-foreground">
                                    {m.subgroup?.name || subgroups.find(s => s.id === m.subgroupId)?.name || "-"}
                                </td>
                                <td className="p-3 text-sm">
                                    {m.role && <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${theme.chip}`}>{m.role}</span>}
                                </td>
                                <td className="p-3 text-sm text-muted-foreground">{m.progressions && m.progressions.length > 0 ? m.progressions.map(progressionLabel).join(", ") : "-"}</td>
                                <td className="p-3 text-sm text-muted-foreground">{m.phone || "-"}</td>
                                <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                                    <Link href={`/admin/members/${m.id}`}><Button variant="ghost" size="sm" title="Edit full sheet"><Pencil className="w-4 h-4" /></Button></Link>
                                    <Button variant="ghost" size="sm" onClick={() => handleDelete(m)} className="text-destructive" title="Delete permanently"><Trash2 className="w-4 h-4" /></Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// All units compact tree view
// ─────────────────────────────────────────────────────────────────────────────

function AllUnitsView({ units, subgroups, members, onPreview, onSelectUnit }: {
    units: Unit[]; subgroups: Subgroup[]; members: Member[];
    onPreview: (id: string) => void;
    onSelectUnit: (id: string) => void;
}) {
    return (
        <div className="space-y-5">
            <div className="rounded-3xl bg-gradient-to-br from-primary via-primary to-emerald-700 text-white p-6">
                <h2 className="text-xl font-black mb-1">All Members — Group Tree</h2>
                <div className="flex flex-wrap gap-4 text-sm">
                    <span><strong>{members.length}</strong> <span className="text-white/70">members</span></span>
                    <span><strong>{units.length}</strong> <span className="text-white/70">units</span></span>
                    <span><strong>{subgroups.length}</strong> <span className="text-white/70">sub-groups</span></span>
                </div>
            </div>

            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                {units.map(u => {
                    const theme = UNIT_THEME[u.unitType] || UNIT_THEME.GROUP;
                    const labels = SUBGROUP_LABEL_BY_UNIT_TYPE[u.unitType] || SUBGROUP_LABEL_BY_UNIT_TYPE.GROUP;
                    const um = members.filter(m => m.unitId === u.id).sort(sortMembers(labels));
                    const us = subgroups.filter(s => s.unitId === u.id);
                    const container = UNIT_CONTAINER_NAME[u.unitType] || "Unit";
                    return (
                        <div key={u.id} className={`border-2 rounded-2xl p-4 ${theme.headerBg}`}>
                            <div className="flex items-start justify-between mb-3">
                                <div>
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{container}</span>
                                    <h3 className="font-extrabold">
                                        <button
                                            type="button"
                                            onClick={() => onSelectUnit(u.id)}
                                            className="hover:underline underline-offset-4 text-left"
                                            title={`Open ${u.name}`}
                                        >
                                            {u.name}
                                        </button>
                                    </h3>
                                </div>
                                <div className="text-xs text-muted-foreground text-right">
                                    <div><strong className="text-foreground">{um.length}</strong> members</div>
                                </div>
                            </div>
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                {us.map(sg => {
                                    const sgMembers = um.filter(m => m.subgroupId === sg.id);
                                    const lead = sgMembers.find(m => m.role === labels.lead);
                                    const assistant = sgMembers.find(m => m.role === labels.assistant);
                                    return (
                                        <div key={sg.id} className="border-l-2 border-primary/30 pl-2 py-1">
                                            <div className="text-xs font-bold text-primary mb-0.5">{sg.name} <span className="font-normal text-muted-foreground">({sgMembers.length})</span></div>
                                            <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                                                {sgMembers.map(m => (
                                                    <button
                                                        key={m.id}
                                                        type="button"
                                                        onClick={() => onPreview(m.id)}
                                                        className={`text-[11px] leading-tight hover:text-primary transition-colors ${
                                                            m === lead ? "font-bold text-primary" : m === assistant ? "font-semibold text-amber-700" : "text-foreground"
                                                        }`}
                                                    >
                                                        {m.firstName} {m.lastName}
                                                        {m === lead && <Star className="w-2.5 h-2.5 inline ml-0.5 -mt-0.5" />}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                                {um.filter(m => !m.subgroupId).length > 0 && (
                                    <div className="border-l-2 border-muted pl-2 py-1">
                                        <div className="text-xs font-bold text-muted-foreground mb-0.5">Unassigned <span className="font-normal">({um.filter(m => !m.subgroupId).length})</span></div>
                                        <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                                            {um.filter(m => !m.subgroupId).map(m => (
                                                <button key={m.id} type="button" onClick={() => onPreview(m.id)} className="text-[11px] leading-tight text-foreground hover:text-primary transition-colors">
                                                    {m.firstName} {m.lastName}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Subgroup form
// ─────────────────────────────────────────────────────────────────────────────

function SubgroupForm({
    unit, labels, editing, onCancel, onSaved,
}: {
    unit: Unit;
    labels: { singular: string };
    editing: Subgroup | null;
    onCancel: () => void;
    onSaved: () => void;
}) {
    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const body = {
            name: fd.get("name"),
            description: fd.get("description"),
            unitId: unit.id,
        };
        const url = editing ? `/api/admin/subgroups/${editing.id}` : "/api/admin/subgroups";
        const method = editing ? "PUT" : "POST";
        await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        onSaved();
    }

    return (
        <form onSubmit={handleSubmit} className="border rounded-2xl p-6 mb-6 space-y-4 bg-card">
            <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold">{editing ? `Edit ${labels.singular}` : `New ${labels.singular} in ${unit.name}`}</h2>
                <button type="button" onClick={onCancel} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="name">Name *</Label>
                    <Input id="name" name="name" defaultValue={editing?.name} required placeholder={`e.g. ${labels.singular} des Aigles`} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Input id="description" name="description" defaultValue={editing?.description || ""} />
                </div>
            </div>
            <div className="flex gap-2">
                <Button type="submit">{editing ? "Update" : "Create"}</Button>
                <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
            </div>
        </form>
    );
}


// ─────────────────────────────────────────────────────────────────────────────
// Member quick-preview modal
// ─────────────────────────────────────────────────────────────────────────────

type DetailMember = {
    id: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string | null;
    phone: string | null;
    email: string | null;
    role: string | null;
    progressions: string[];
    photoUrl: string | null;
    unitId: string;
    unit: { name: string; unitType: string };
    subgroup: { id: string; name: string } | null;
    joinedAt: string;
    fatherName: string | null;
    fatherPhone: string | null;
    motherName: string | null;
    motherPhone: string | null;
    emergencyContactName: string | null;
    emergencyContactPhone: string | null;
    bloodType: string | null;
    moves: Array<{
        id: string;
        fromUnitId: string | null;
        toUnitId: string | null;
        fromSubgroupId: string | null;
        toSubgroupId: string | null;
        fromRole: string | null;
        toRole: string | null;
        fromProgression: string[];
        toProgression: string[];
        moveDate: string;
        notes: string | null;
    }>;
};

function MemberPreviewModal({ memberId, onClose }: { memberId: string; onClose: () => void }) {
    const [member, setMember] = useState<DetailMember | null>(null);
    const [allUnits, setAllUnits] = useState<{ id: string; name: string }[]>([]);
    const [allSubgroups, setAllSubgroups] = useState<{ id: string; name: string }[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        Promise.all([
            fetch(`/api/admin/members/${memberId}`).then(r => r.ok ? r.json() : null),
            fetch("/api/admin/units").then(r => r.ok ? r.json() : []),
            fetch("/api/admin/subgroups").then(r => r.ok ? r.json() : []),
        ]).then(([m, u, sg]) => {
            if (cancelled) return;
            setMember(m);
            setAllUnits(u);
            setAllSubgroups(sg);
            setLoading(false);
        });
        return () => { cancelled = true; };
    }, [memberId]);

    // Close on Escape
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose]);

    const unitName = (id: string | null) => allUnits.find(u => u.id === id)?.name || "-";
    const sgName = (id: string | null) => allSubgroups.find(s => s.id === id)?.name || "-";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <div
                className="relative bg-card border rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
                style={{ animation: "fade-in 0.25s ease-out" }}
            >
                {loading || !member ? (
                    <div className="p-12 text-center text-muted-foreground">Loading...</div>
                ) : (
                    <>
                        {/* Header */}
                        <div className={`relative ${(UNIT_THEME[member.unit.unitType] || UNIT_THEME.GROUP).pageAccent} text-white p-6`}>
                            <button onClick={onClose} className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur flex items-center justify-center transition-colors">
                                <X className="w-4 h-4" />
                            </button>
                            <div className="flex items-center gap-4">
                                <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center font-black text-2xl shrink-0 overflow-hidden">
                                    {member.photoUrl ? (
                                        /* eslint-disable-next-line @next/next/no-img-element */
                                        <img src={member.photoUrl} alt={member.firstName} className="w-full h-full object-cover" />
                                    ) : (
                                        `${member.firstName[0]}${member.lastName[0]}`.toUpperCase()
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <h2 className="text-2xl md:text-3xl font-black leading-tight">{member.firstName} {member.lastName}</h2>
                                    <div className="text-sm text-white/85 mt-1">
                                        {member.unit.name}
                                        {member.subgroup && <span> • {member.subgroup.name}</span>}
                                        {member.role && <span className="ml-2 inline-block px-2 py-0.5 rounded-full bg-white/20 text-white font-bold text-xs">{member.role}</span>}
                                    </div>
                                    {member.progressions.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 mt-2">
                                            {member.progressions.map(p => (
                                                <span key={p} className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-white/20 backdrop-blur">
                                                    <Star className="w-2.5 h-2.5 inline -mt-0.5 mr-0.5" /> {progressionLabel(p)}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Body */}
                        <div className="overflow-y-auto p-6 space-y-5">
                            {/* Quick facts */}
                            <div className="grid sm:grid-cols-2 gap-3">
                                {member.dateOfBirth && (
                                    <Fact icon={<Calendar className="w-3.5 h-3.5" />} label="Born" value={new Date(member.dateOfBirth).toLocaleDateString("en-GB")} />
                                )}
                                {member.joinedAt && (
                                    <Fact icon={<MapPin className="w-3.5 h-3.5" />} label="Joined" value={new Date(member.joinedAt).toLocaleDateString("en-GB")} />
                                )}
                                {member.phone && (
                                    <Fact icon={<Phone className="w-3.5 h-3.5" />} label="Phone" value={<a href={`tel:${member.phone}`} className="hover:text-primary">{member.phone}</a>} />
                                )}
                                {member.email && (
                                    <Fact icon={<span className="text-xs">@</span>} label="Email" value={<a href={`mailto:${member.email}`} className="hover:text-primary">{member.email}</a>} />
                                )}
                                {member.bloodType && (
                                    <Fact icon={<span className="text-xs font-bold">B</span>} label="Blood type" value={member.bloodType} />
                                )}
                            </div>

                            {(member.fatherName || member.motherName || member.emergencyContactName) && (
                                <div>
                                    <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Family & Emergency</h3>
                                    <div className="grid sm:grid-cols-2 gap-3">
                                        {member.fatherName && (
                                            <div className="rounded-xl border p-3 bg-muted/20">
                                                <div className="text-xs text-muted-foreground">Father</div>
                                                <div className="font-semibold text-sm">{member.fatherName}</div>
                                                {member.fatherPhone && <a href={`tel:${member.fatherPhone}`} className="text-xs text-primary inline-flex items-center gap-1 mt-0.5"><Phone className="w-3 h-3" /> {member.fatherPhone}</a>}
                                            </div>
                                        )}
                                        {member.motherName && (
                                            <div className="rounded-xl border p-3 bg-muted/20">
                                                <div className="text-xs text-muted-foreground">Mother</div>
                                                <div className="font-semibold text-sm">{member.motherName}</div>
                                                {member.motherPhone && <a href={`tel:${member.motherPhone}`} className="text-xs text-primary inline-flex items-center gap-1 mt-0.5"><Phone className="w-3 h-3" /> {member.motherPhone}</a>}
                                            </div>
                                        )}
                                        {member.emergencyContactName && (
                                            <div className="rounded-xl border p-3 bg-rose-50 border-rose-200 sm:col-span-2">
                                                <div className="text-xs text-rose-700 font-bold">Emergency contact</div>
                                                <div className="font-semibold text-sm">{member.emergencyContactName}</div>
                                                {member.emergencyContactPhone && <a href={`tel:${member.emergencyContactPhone}`} className="text-xs text-rose-700 inline-flex items-center gap-1 mt-0.5"><Phone className="w-3 h-3" /> {member.emergencyContactPhone}</a>}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Transitions / move history */}
                            {member.moves.length > 0 && (
                                <div>
                                    <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5">
                                        <History className="w-3.5 h-3.5" /> Transitions
                                    </h3>
                                    <div className="space-y-2">
                                        {member.moves.map(m => (
                                            <div key={m.id} className="border-l-2 border-primary/30 pl-3 py-1 text-sm space-y-0.5">
                                                <div className="text-xs font-mono text-muted-foreground">
                                                    {new Date(m.moveDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                                                </div>
                                                {m.fromUnitId !== m.toUnitId && (m.fromUnitId || m.toUnitId) && (
                                                    <div><span className="text-muted-foreground">Unit:</span> {unitName(m.fromUnitId)} <ArrowUpRight className="w-3 h-3 inline rotate-45 text-primary" /> <strong className="text-primary">{unitName(m.toUnitId)}</strong></div>
                                                )}
                                                {m.fromSubgroupId !== m.toSubgroupId && (m.fromSubgroupId || m.toSubgroupId) && (
                                                    <div><span className="text-muted-foreground">Group:</span> {sgName(m.fromSubgroupId)} <ArrowUpRight className="w-3 h-3 inline rotate-45 text-primary" /> <strong className="text-primary">{sgName(m.toSubgroupId)}</strong></div>
                                                )}
                                                {m.fromRole !== m.toRole && (m.fromRole || m.toRole) && (
                                                    <div><span className="text-muted-foreground">Role:</span> {m.fromRole || "-"} <ArrowUpRight className="w-3 h-3 inline rotate-45 text-primary" /> <strong className="text-primary">{m.toRole || "-"}</strong></div>
                                                )}
                                                {((m.fromProgression?.length || 0) > 0 || (m.toProgression?.length || 0) > 0)
                                                  && !sameStringArr(m.fromProgression || [], m.toProgression || []) && (
                                                    <div><span className="text-muted-foreground">Progression:</span> {(m.fromProgression || []).map(progressionLabel).join(", ") || "-"} <ArrowUpRight className="w-3 h-3 inline rotate-45 text-primary" /> <strong className="text-primary">{(m.toProgression || []).map(progressionLabel).join(", ") || "-"}</strong></div>
                                                )}
                                                {m.notes && <div className="text-xs italic text-muted-foreground">{m.notes}</div>}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer actions */}
                        <div className="border-t p-4 flex justify-end gap-2 bg-muted/20">
                            <Button variant="outline" onClick={onClose}>Close</Button>
                            <Link href={`/admin/members/${member.id}`}>
                                <Button className="gap-2"><Pencil className="w-4 h-4" /> Edit full sheet</Button>
                            </Link>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

function Fact({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
    return (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/30">
            <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                {icon}
            </div>
            <div className="min-w-0 flex-1">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
                <div className="text-sm font-semibold truncate">{value}</div>
            </div>
        </div>
    );
}

function sameStringArr(a: string[], b: string[]) {
    return a.length === b.length && a.every((v, i) => v === b[i]);
}
