"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Pencil, Trash2, Users, Shield, Star, ChevronRight, List, Search, Network, UserPlus, FolderPlus, X, FileSpreadsheet, FileText, Globe } from "lucide-react";
import { SUBGROUP_LABEL_BY_UNIT_TYPE, UNIT_CONTAINER_NAME } from "@/lib/scout-config";
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
    progression: string | null;
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
                <AllUnitsView units={units} subgroups={subgroups} members={members} />
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
                />
            ) : (
                <ListView
                    unit={activeUnit}
                    members={unitMembers}
                    subgroups={unitSubgroups}
                    search={search}
                    setSearch={setSearch}
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
    onEditSubgroup, onDeleteSubgroup,
}: {
    unit: Unit;
    subgroups: Subgroup[];
    members: Member[];
    labels: { singular: string; plural: string; lead: string; assistant: string };
    containerName: string;
    onEditSubgroup: (s: Subgroup) => void;
    onDeleteSubgroup: (id: string) => void;
}) {
    const unassigned = members.filter(m => !m.subgroupId);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="rounded-3xl bg-gradient-to-br from-primary via-primary to-emerald-700 text-white p-6 md:p-8">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center">
                            <Shield className="w-6 h-6" />
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
                            subgroup={sg}
                            members={members.filter(m => m.subgroupId === sg.id)}
                            labels={labels}
                            onEdit={() => onEditSubgroup(sg)}
                            onDelete={() => onDeleteSubgroup(sg.id)}
                        />
                    ))}
                </div>
            )}

            {/* Unassigned (chefs / unaffiliated) */}
            {unassigned.length > 0 && (
                <div className="border rounded-2xl p-5 bg-muted/20">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-3">Unassigned to a {labels.singular}</h3>
                    <div className="space-y-2">
                        {unassigned.map(m => (
                            <MemberRow key={m.id} member={m} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function SubgroupCard({
    subgroup, members, labels, onEdit, onDelete,
}: {
    subgroup: Subgroup;
    members: Member[];
    labels: { lead: string; assistant: string; singular: string };
    onEdit: () => void;
    onDelete: () => void;
}) {
    const lead = members.find(m => m.role === labels.lead);
    const assistant = members.find(m => m.role === labels.assistant);
    const others = members.filter(m => m.role !== labels.lead && m.role !== labels.assistant);

    return (
        <div className="bg-card border rounded-2xl overflow-hidden hover:shadow-lg hover:shadow-primary/5 transition-all group">
            <div className="p-5 border-b bg-gradient-to-br from-primary/5 to-transparent">
                <div className="flex justify-between items-start mb-1">
                    <div>
                        <h3 className="font-extrabold text-lg">{subgroup.name}</h3>
                        {subgroup.description && <p className="text-xs text-muted-foreground mt-0.5">{subgroup.description}</p>}
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                        <Button variant="ghost" size="sm" onClick={onEdit} className="h-7 w-7 p-0"><Pencil className="w-3.5 h-3.5" /></Button>
                        <Button variant="ghost" size="sm" onClick={onDelete} className="h-7 w-7 p-0 text-destructive"><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                </div>
                <div className="text-xs text-muted-foreground font-medium">
                    {members.length} member{members.length !== 1 ? "s" : ""}
                </div>
            </div>
            <div className="p-4 space-y-2">
                {lead && <MemberRow member={lead} accentRole={labels.lead} />}
                {assistant && <MemberRow member={assistant} accentRole={labels.assistant} />}
                {(lead || assistant) && others.length > 0 && <div className="border-t my-2" />}
                {others.length === 0 && !lead && !assistant ? (
                    <p className="text-xs text-muted-foreground italic px-2 py-3 text-center">Empty {labels.singular.toLowerCase()}</p>
                ) : (
                    others.map(m => <MemberRow key={m.id} member={m} />)
                )}
            </div>
        </div>
    );
}

function MemberRow({ member, accentRole }: { member: Member; accentRole?: string }) {
    return (
        <Link
            href={`/admin/members/${member.id}`}
            className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-muted/50 transition-colors group/row"
        >
            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0 overflow-hidden">
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
                        {accentRole ? (
                            <span className={`font-bold ${accentRole === "CP" || accentRole === "SI" || accentRole === "CE" ? "text-primary" : "text-amber-600"}`}>
                                {member.role}
                            </span>
                        ) : member.role}
                        {member.progression && <span> • {member.progression}</span>}
                    </div>
                )}
            </div>
            {accentRole && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                    accentRole === "CP" || accentRole === "SI" || accentRole === "CE"
                        ? "bg-primary/10 text-primary"
                        : "bg-amber-100 text-amber-700"
                }`}>
                    {accentRole === "CP" || accentRole === "SI" || accentRole === "CE" ? <Star className="w-3 h-3 inline -mt-0.5" /> : ""} {accentRole}
                </span>
            )}
            <ChevronRight className="w-4 h-4 text-muted-foreground/40 opacity-0 group-hover/row:opacity-100 transition-opacity shrink-0" />
        </Link>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// List view
// ─────────────────────────────────────────────────────────────────────────────

function ListView({
    unit, members, subgroups, search, setSearch,
}: {
    unit: Unit;
    members: Member[];
    subgroups: Subgroup[];
    search: string;
    setSearch: (v: string) => void;
}) {
    const filtered = members.filter(m => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return `${m.firstName} ${m.lastName}`.toLowerCase().includes(q);
    });

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
                            <tr key={m.id} className="border-t hover:bg-muted/20">
                                <td className="p-3 text-sm font-medium">
                                    <Link href={`/admin/members/${m.id}`} className="hover:text-primary">
                                        {m.firstName} {m.lastName}
                                    </Link>
                                </td>
                                <td className="p-3 text-sm text-muted-foreground">
                                    {m.subgroup?.name || subgroups.find(s => s.id === m.subgroupId)?.name || "-"}
                                </td>
                                <td className="p-3 text-sm">
                                    {m.role && <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary">{m.role}</span>}
                                </td>
                                <td className="p-3 text-sm text-muted-foreground">{m.progression || "-"}</td>
                                <td className="p-3 text-sm text-muted-foreground">{m.phone || "-"}</td>
                                <td className="p-3 text-right">
                                    <Link href={`/admin/members/${m.id}`}><Button variant="ghost" size="sm"><Pencil className="w-4 h-4" /></Button></Link>
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

function AllUnitsView({ units, subgroups, members }: { units: Unit[]; subgroups: Subgroup[]; members: Member[] }) {
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
                    const um = members.filter(m => m.unitId === u.id);
                    const us = subgroups.filter(s => s.unitId === u.id);
                    const labels = SUBGROUP_LABEL_BY_UNIT_TYPE[u.unitType] || SUBGROUP_LABEL_BY_UNIT_TYPE.GROUP;
                    const container = UNIT_CONTAINER_NAME[u.unitType] || "Unit";
                    return (
                        <div key={u.id} className="border rounded-2xl p-4 bg-card">
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
                                                    <Link
                                                        key={m.id}
                                                        href={`/admin/members/${m.id}`}
                                                        className={`text-[11px] leading-tight hover:text-primary transition-colors ${
                                                            m === lead ? "font-bold text-primary" : m === assistant ? "font-semibold text-amber-700" : "text-foreground"
                                                        }`}
                                                    >
                                                        {m.firstName} {m.lastName}
                                                        {m === lead && <Star className="w-2.5 h-2.5 inline ml-0.5 -mt-0.5" />}
                                                    </Link>
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
                                                <Link key={m.id} href={`/admin/members/${m.id}`} className="text-[11px] leading-tight text-foreground hover:text-primary transition-colors">
                                                    {m.firstName} {m.lastName}
                                                </Link>
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

