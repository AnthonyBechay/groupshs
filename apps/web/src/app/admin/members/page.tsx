"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { Trash2, Plus, Pencil } from "lucide-react";
import { ROLES_BY_UNIT_TYPE, PROGRESSION_BY_UNIT_TYPE } from "@/lib/scout-config";

type Unit = { id: string; name: string; unitType: string };
type Member = {
    id: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string | null;
    phone: string | null;
    role: string | null;
    progression: string | null;
    unitId: string;
    unit: { name: string; unitType: string };
};

export default function AdminMembersPage() {
    const [members, setMembers] = useState<Member[]>([]);
    const [units, setUnits] = useState<Unit[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState<Member | null>(null);
    const [loading, setLoading] = useState(true);
    const [filterUnit, setFilterUnit] = useState("");
    const [selectedUnitType, setSelectedUnitType] = useState("");

    async function fetchData() {
        const [membersRes, unitsRes] = await Promise.all([
            fetch("/api/admin/members" + (filterUnit ? `?unitId=${filterUnit}` : "")),
            fetch("/api/admin/units"),
        ]);
        setMembers(await membersRes.json());
        setUnits(await unitsRes.json());
        setLoading(false);
    }

    useEffect(() => { fetchData(); }, [filterUnit]);

    function getUnitType(unitId: string) {
        return units.find(u => u.id === unitId)?.unitType || "";
    }

    function handleUnitChange(unitId: string) {
        setSelectedUnitType(getUnitType(unitId));
    }

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const body = {
            firstName: formData.get("firstName"),
            lastName: formData.get("lastName"),
            dateOfBirth: formData.get("dateOfBirth") || null,
            phone: formData.get("phone") || null,
            role: formData.get("role") || null,
            progression: formData.get("progression") || null,
            unitId: formData.get("unitId"),
        };

        if (editing) {
            await fetch(`/api/admin/members/${editing.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        } else {
            await fetch("/api/admin/members", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        }

        setShowForm(false);
        setEditing(null);
        setSelectedUnitType("");
        fetchData();
    }

    async function handleDelete(id: string) {
        if (!confirm("Delete this member?")) return;
        await fetch(`/api/admin/members/${id}`, { method: "DELETE" });
        fetchData();
    }

    function startEdit(m: Member) {
        setEditing(m);
        setSelectedUnitType(m.unit.unitType);
        setShowForm(true);
    }

    const roles = ROLES_BY_UNIT_TYPE[selectedUnitType] || [];
    const progressions = PROGRESSION_BY_UNIT_TYPE[selectedUnitType] || [];

    if (loading) return <p className="text-muted-foreground">Loading...</p>;

    return (
        <div>
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">Members</h1>
                <Button onClick={() => { setEditing(null); setSelectedUnitType(""); setShowForm(!showForm); }} className="gap-2">
                    <Plus className="w-4 h-4" /> Add Member
                </Button>
            </div>

            {/* Filter */}
            <div className="mb-6">
                <select
                    value={filterUnit}
                    onChange={(e) => setFilterUnit(e.target.value)}
                    className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                    <option value="">All units</option>
                    {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
            </div>

            {showForm && (
                <form onSubmit={handleSubmit} className="border rounded-lg p-6 mb-8 space-y-4 bg-card">
                    <h2 className="text-lg font-semibold">{editing ? "Edit Member" : "New Member"}</h2>
                    <div className="grid md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="firstName">First Name *</Label>
                            <Input id="firstName" name="firstName" defaultValue={editing?.firstName} required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="lastName">Last Name *</Label>
                            <Input id="lastName" name="lastName" defaultValue={editing?.lastName} required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="unitId">Unit *</Label>
                            <select
                                id="unitId"
                                name="unitId"
                                defaultValue={editing?.unitId || ""}
                                required
                                onChange={(e) => handleUnitChange(e.target.value)}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            >
                                <option value="">Select unit...</option>
                                {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="dateOfBirth">Date of Birth</Label>
                            <Input id="dateOfBirth" name="dateOfBirth" type="date" defaultValue={editing?.dateOfBirth || ""} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phone">Phone</Label>
                            <Input id="phone" name="phone" defaultValue={editing?.phone || ""} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="role">Role</Label>
                            <select id="role" name="role" defaultValue={editing?.role || ""} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                                <option value="">None</option>
                                {roles.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                            </select>
                        </div>
                        {progressions.length > 0 && (
                            <div className="space-y-2">
                                <Label htmlFor="progression">Progression</Label>
                                <select id="progression" name="progression" defaultValue={editing?.progression || ""} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                                    <option value="">None</option>
                                    {progressions.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                                </select>
                            </div>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <Button type="submit">{editing ? "Update" : "Create"}</Button>
                        <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditing(null); }}>Cancel</Button>
                    </div>
                </form>
            )}

            <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                    <thead className="bg-muted/50">
                        <tr>
                            <th className="text-left p-3 text-sm font-medium">Name</th>
                            <th className="text-left p-3 text-sm font-medium">Unit</th>
                            <th className="text-left p-3 text-sm font-medium">Role</th>
                            <th className="text-left p-3 text-sm font-medium">Progression</th>
                            <th className="text-left p-3 text-sm font-medium">Phone</th>
                            <th className="text-right p-3 text-sm font-medium">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {members.length === 0 ? (
                            <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No members</td></tr>
                        ) : members.map((m) => (
                            <tr key={m.id} className="border-t">
                                <td className="p-3 text-sm font-medium">{m.firstName} {m.lastName}</td>
                                <td className="p-3 text-sm"><span className="px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">{m.unit.name}</span></td>
                                <td className="p-3 text-sm text-muted-foreground">{m.role || "—"}</td>
                                <td className="p-3 text-sm text-muted-foreground">{m.progression || "—"}</td>
                                <td className="p-3 text-sm text-muted-foreground">{m.phone || "—"}</td>
                                <td className="p-3 text-right">
                                    <Button variant="ghost" size="sm" onClick={() => startEdit(m)}><Pencil className="w-4 h-4" /></Button>
                                    <Button variant="ghost" size="sm" onClick={() => handleDelete(m.id)} className="text-destructive hover:text-destructive"><Trash2 className="w-4 h-4" /></Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
