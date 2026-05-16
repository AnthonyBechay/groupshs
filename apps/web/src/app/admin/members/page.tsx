"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Pencil, Trash2, Users, Star, ChevronRight, List, Search, Network, UserPlus, FolderPlus, X, FileSpreadsheet, FileText, Globe, TreePine, Compass, Mountain, Phone, Calendar, MapPin, History, ArrowUpRight } from "lucide-react";
import { SUBGROUP_LABEL_BY_UNIT_TYPE, UNIT_CONTAINER_NAME, progressionLabel } from "@/lib/scout-config";
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
    progressions: string[];
    unitId: string;
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
};

type View = "visual" | "list";

// Per-unit-type colors (for subgroup cards in members visual view)
const UNIT_THEME: Record<string, {
    headerBg: string;       // colored header bg of subgroup card
    pageAccent: string;     // page hero accent background
    chip: string;
    iconBg: string;
    icon: typeof Users;
    leadChip: string;
    assistantChip: string;
}> = {
    LOUVETEAUX: {
        headerBg: "bg-gradient-to-br from-amber-100 via-yellow-50 to-amber-50 border-b border-amber-200",
        pageAccent: "bg-gradient-to-br from-amber-500 via-yellow-500 to-amber-600",
        chip: "bg-yellow-100 text-yellow-800",
        iconBg: "bg-amber-100 text-amber-700",
        icon: TreePine,
        leadChip: "bg-amber-500 text-white",
        assistantChip: "bg-amber-100 text-amber-700",
    },
    ECLAIREURS: {
        headerBg: "bg-gradient-to-br from-emerald-100 via-green-50 to-emerald-50 border-b border-emerald-200",
        pageAccent: "bg-gradient-to-br from-emerald-600 via-green-700 to-emerald-800",
        chip: "bg-emerald-100 text-emerald-800",
        iconBg: "bg-emerald-100 text-emerald-700",
        icon: Compass,
        leadChip: "bg-emerald-600 text-white",
        assistantChip: "bg-emerald-100 text-emerald-700",
    },
    ROUTIERS: {
        headerBg: "bg-gradient-to-br from-rose-100 via-red-50 to-rose-50 border-b border-rose-200",
        pageAccent: "bg-gradient-to-br from-red-500 via-rose-600 to-red-700",
        chip: "bg-rose-100 text-rose-800",
        iconBg: "bg-rose-100 text-rose-700",
        icon: Mountain,
        leadChip: "bg-rose-600 text-white",
        assistantChip: "bg-rose-100 text-rose-700",
    },
    GROUP: {
        headerBg: "bg-gradient-to-br from-primary/5 to-transparent border-b border-border",
        pageAccent: "bg-gradient-to-br from-primary via-primary to-emerald-700",
        chip: "bg-primary/10 text-primary",
        iconBg: "bg-primary/10 text-primary",
        icon: Users,
        leadChip: "bg-primary text-white",
        assistantChip: "bg-primary/10 text-primary",
    },
};

// Sort priority for roles in a subgroup
function roleSortIndex(role: string | null, labels: { lead: string; assistant: string }): number {
    if (role === labels.lead) return 0;
    if (role === labels.assistant) return 1;
    if (role === "SI" || role === "CP" || role === "CE") return 2;
    if (role === "SE" || role === "SP") return 3;
    return 10;
}

export default function AdminMembersPage() {
    const [members, setMembers] = useState<Member[]>([]);
    const [units, setUnits] = useState<Unit[]>([]);
    const [subgroups, setSubgroups] = useState<Subgroup[]>([]);
    const [loading, setLoading] = useState(true);

    const [view, setView] = useState<View>("visual");
    const [activeUnitId, setActiveUnitId] = useState<string>("");
    const [search, setSearch] = useState("");

    const [showSubgroupForm, setShowSubgroupForm] = useState(false);
    const [editingSubgroup, setEditingSubgroup] = useState<Subgroup | null>(null);

    // Member quick-preview modal
    const [previewMemberId, setPreviewMemberId] = useState<string | null>(null);

    async function fetchData() {
        const [mRes, uRes, sgRes] = await Promise.all([
            fetch("/api/admin/members"),
            fetch("/api/admin/units"),
            fetch("/api/admin/subgroups"),
        ]);
        if (mRes.ok) setMembers(await mRes.json());
        if (uRes.ok) {
            const list: Unit[] = await uRes.json();
            setUnits(list);
            if (!activeUnitId && list.length > 0) setActiveUnitId(list[0].id);
        }
        if (sgRes.ok) setSubgroups(await sgRes.json());
        setLoading(false);
    }

    useEffect(() => { fetchData(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

    const activeUnit = useMemo(() => units.find(u => u.id === activeUnitId) || null, [units, activeUnitId]);
    const unitMembers = useMemo(() => members.filter(m => m.unitId === activeUnitId), [members, activeUnitId]);
    const unitSubgroups = useMemo(() => subgroups.filter(s => s.unitId === activeUnitId), [subgroups, activeUnitId]);

    const labels = activeUnit ? SUBGROUP_LABEL_BY_UNIT_TYPE[activeUnit.unitType] || SUBGROUP_LABEL_BY_UNIT_TYPE.GROUP : null;
    const containerName = activeUnit ? UNIT_CONTAINER_NAME[activeUnit.unitType] || "Unit" : "";

    async function handleDeleteSubgroup(id: string) {
        if (!confirm("Delete this group? Members in it will become unassigned.")) return;
        await fetch(`/api/admin/subgroups/${id}`, { method: "DELETE" });
        fetchData();
    }

    if (loading) return <p className="text-muted-foreground">Loading...</p>;

    return (
        <div>
            <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
                <div>
                    <h1 className="text-3xl font-bold">Members</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">{members.length} total across {units.length} units</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <div className="inline-flex items-center bg-muted/60 rounded-full p-1 border">
                        <button
                            onClick={() => setView("visual")}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold transition-all ${
                                view === "visual" ? "bg-primary text-white shadow-sm" : "text-muted-foreground"
                            }`}
                        >
                            <Network className="w-4 h-4" /> Visual
                        </button>
                        <button
                            onClick={() => setView("list")}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold transition-all ${
                                view === "list" ? "bg-primary text-white shadow-sm" : "text-muted-foreground"
                            }`}
                        >
                            <List className="w-4 h-4" /> List
                        </button>
                    </div>
                    <Button onClick={() => { setEditingSubgroup(null); setShowSubgroupForm(true); }} variant="outline" className="gap-2">
                        <FolderPlus className="w-4 h-4" /> Add {labels?.singular || "Group"}
                    </Button>
                    <Link href="/admin/members/new">
                        <Button className="gap-2">
                            <UserPlus className="w-4 h-4" /> Add Member
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Unit selector */}
            <div className="border-b mb-6 -mx-4 px-4 overflow-x-auto">
                <div className="flex gap-2 pb-3">
                    {units.map(u => {
                        const count = members.filter(m => m.unitId === u.id).length;
                        return (
                            <button
                                key={u.id}
                                onClick={() => setActiveUnitId(u.id)}
                                className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ${
                                    activeUnitId === u.id
                                        ? "bg-primary text-white shadow-md shadow-primary/20"
                                        : "bg-muted text-muted-foreground hover:bg-muted/70"
                                }`}
                            >
                                {u.name} ({count})
                            </button>
                        );
                    })}
                    <button
                        onClick={() => setActiveUnitId("ALL")}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ${
                            activeUnitId === "ALL"
                                ? "bg-foreground text-background shadow-md"
                                : "bg-muted text-muted-foreground hover:bg-muted/70"
                        }`}
                    >
                        <Globe className="w-3.5 h-3.5" /> All ({members.length})
                    </button>
                </div>
            </div>

            {showSubgroupForm && activeUnit && labels && (
                <SubgroupForm
                    unit={activeUnit}
                    labels={labels}
                    editing={editingSubgroup}
                    onCancel={() => { setShowSubgroupForm(false); setEditingSubgroup(null); }}
                    onSaved={() => { setShowSubgroupForm(false); setEditingSubgroup(null); fetchData(); }}
                />
            )}

            {activeUnitId === "ALL" ? (
                <AllUnitsView units={units} subgroups={subgroups} members={members} onPreview={setPreviewMemberId} />
            ) : !activeUnit ? (
                <div className="text-center py-20 bg-muted/20 rounded-2xl border border-dashed">
                    <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                    <p className="text-muted-foreground">Create a unit first</p>
                </div>
            ) : view === "visual" ? (
                <VisualView
                    unit={activeUnit}
                    subgroups={unitSubgroups}
                    members={unitMembers}
                    labels={labels!}
                    containerName={containerName}
                    onEditSubgroup={(s) => { setEditingSubgroup(s); setShowSubgroupForm(true); }}
                    onDeleteSubgroup={handleDeleteSubgroup}
                    onPreview={setPreviewMemberId}
                />
            ) : (
                <ListView
                    unit={activeUnit}
                    members={unitMembers}
                    subgroups={unitSubgroups}
                    search={search}
                    setSearch={setSearch}
                    onPreview={setPreviewMemberId}
                />
            )}

            {previewMemberId && (
                <MemberPreviewModal
                    memberId={previewMemberId}
                    onClose={() => setPreviewMemberId(null)}
                />
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Visual hierarchy view
// ─────────────────────────────────────────────────────────────────────────────

function VisualView({
    unit, subgroups, members, labels, containerName,
    onEditSubgroup, onDeleteSubgroup, onPreview,
}: {
    unit: Unit;
    subgroups: Subgroup[];
    members: Member[];
    labels: { singular: string; plural: string; lead: string; assistant: string };
    containerName: string;
    onEditSubgroup: (s: Subgroup) => void;
    onDeleteSubgroup: (id: string) => void;
    onPreview: (id: string) => void;
}) {
    const theme = UNIT_THEME[unit.unitType] || UNIT_THEME.GROUP;
    const unassigned = members.filter(m => !m.subgroupId).sort(sortMembers(labels));

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className={`rounded-3xl ${theme.pageAccent} text-white p-6 md:p-8`}>
                <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center">
                            <theme.icon className="w-6 h-6" />
                        </div>
                        <div>
                            <span className="text-xs font-bold uppercase tracking-widest text-white/70">{containerName}</span>
                            <h2 className="text-2xl md:text-3xl font-black">{unit.name}</h2>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            type="button"
                            onClick={() => exportMembersToPDF(unit, subgroups, members)}
                            disabled={members.length === 0}
                            className="bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur text-white gap-2"
                        >
                            <FileText className="w-4 h-4" /> Export PDF
                        </Button>
                    </div>
                </div>
                <div className="flex flex-wrap gap-4 mt-3 text-sm">
                    <span><strong className="text-white">{members.length}</strong> <span className="text-white/70">members</span></span>
                    <span><strong className="text-white">{subgroups.length}</strong> <span className="text-white/70">{labels.plural}</span></span>
                </div>
            </div>

            {/* Subgroups */}
            {subgroups.length === 0 ? (
                <div className="text-center py-12 bg-muted/20 rounded-2xl border border-dashed">
                    <p className="text-sm text-muted-foreground mb-2">No {labels.plural.toLowerCase()} yet.</p>
                    <p className="text-xs text-muted-foreground">Click &quot;Add {labels.singular}&quot; above to create one.</p>
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
                        />
                    ))}
                </div>
            )}

            {/* Unassigned (chefs / unaffiliated) */}
            {unassigned.length > 0 && (
                <div className={`border rounded-2xl p-5 bg-muted/20`}>
                    <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-3">Unassigned to a {labels.singular}</h3>
                    <div className="space-y-2">
                        {unassigned.map(m => (
                            <MemberRow key={m.id} member={m} unitType={unit.unitType} onPreview={onPreview} />
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
    unitType, subgroup, members, labels, onEdit, onDelete, onPreview,
}: {
    unitType: string;
    subgroup: Subgroup;
    members: Member[];
    labels: { lead: string; assistant: string; singular: string };
    onEdit: () => void;
    onDelete: () => void;
    onPreview: (id: string) => void;
}) {
    const theme = UNIT_THEME[unitType] || UNIT_THEME.GROUP;
    const lead = members.find(m => m.role === labels.lead);
    const assistant = members.find(m => m.role === labels.assistant);
    const others = members.filter(m => m.role !== labels.lead && m.role !== labels.assistant);

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
            <div className="p-4 space-y-2">
                {lead && <MemberRow member={lead} unitType={unitType} accentRole={labels.lead} onPreview={onPreview} />}
                {assistant && <MemberRow member={assistant} unitType={unitType} accentRole={labels.assistant} onPreview={onPreview} />}
                {(lead || assistant) && others.length > 0 && <div className="border-t my-2" />}
                {others.length === 0 && !lead && !assistant ? (
                    <p className="text-xs text-muted-foreground italic px-2 py-3 text-center">Empty {labels.singular.toLowerCase()}</p>
                ) : (
                    others.map(m => <MemberRow key={m.id} member={m} unitType={unitType} onPreview={onPreview} />)
                )}
            </div>
        </div>
    );
}

function MemberRow({ member, unitType, accentRole, onPreview }: { member: Member; unitType?: string; accentRole?: string; onPreview: (id: string) => void }) {
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
                <div className="text-sm font-semibold truncate">{member.firstName} {member.lastName}</div>
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
    unit, members, subgroups, search, setSearch, onPreview,
}: {
    unit: Unit;
    members: Member[];
    subgroups: Subgroup[];
    search: string;
    setSearch: (v: string) => void;
    onPreview: (id: string) => void;
}) {
    const labels = SUBGROUP_LABEL_BY_UNIT_TYPE[unit.unitType] || SUBGROUP_LABEL_BY_UNIT_TYPE.GROUP;
    const theme = UNIT_THEME[unit.unitType] || UNIT_THEME.GROUP;
    const filtered = members.filter(m => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return `${m.firstName} ${m.lastName}`.toLowerCase().includes(q);
    }).sort(sortMembers(labels));

    function handleDelete(id: string) {
        if (!confirm("Delete this member?")) return;
        fetch(`/api/admin/members/${id}`, { method: "DELETE" }).then(() => window.location.reload());
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3 justify-between">
                <div className="relative max-w-sm flex-1">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input placeholder="Search members..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
                </div>
                <Button
                    type="button"
                    onClick={() => exportMembersToExcel(unit, members)}
                    disabled={members.length === 0}
                    variant="outline"
                    className="gap-2"
                >
                    <FileSpreadsheet className="w-4 h-4" /> Export Excel
                </Button>
            </div>
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
                                    <span className="hover:text-primary">{m.firstName} {m.lastName}</span>
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
                                    <Button variant="ghost" size="sm" onClick={() => handleDelete(m.id)} className="text-destructive"><Trash2 className="w-4 h-4" /></Button>
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

function AllUnitsView({ units, subgroups, members, onPreview }: { units: Unit[]; subgroups: Subgroup[]; members: Member[]; onPreview: (id: string) => void }) {
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
                                    <h3 className="font-extrabold">{u.name}</h3>
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
