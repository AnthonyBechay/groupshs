"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { Trash2, Plus, Pencil, Shield, ShieldCheck, X } from "lucide-react";

type Unit = { id: string; name: string };
type User = {
    id: string;
    name: string;
    email: string;
    role: string;
    createdAt: string;
    canManageUnits: boolean;
    canManageMembers: boolean;
    canManageActivities: boolean;
    canManageGallery: boolean;
    canManagePartners: boolean;
    canManageSocialLinks: boolean;
    canManageNews: boolean;
    canViewSubmissions: boolean;
    canManageSettings: boolean;
    allowedUnitIds: string[];
};

const PERMISSIONS = [
    { key: "canManageUnits", label: "Units" },
    { key: "canManageMembers", label: "Members" },
    { key: "canManageActivities", label: "Activities" },
    { key: "canManageGallery", label: "Gallery" },
    { key: "canManagePartners", label: "Partners" },
    { key: "canManageSocialLinks", label: "Social Links" },
    { key: "canManageNews", label: "News" },
    { key: "canViewSubmissions", label: "View Submissions" },
    { key: "canManageSettings", label: "Site Settings" },
] as const;

type PermissionKey = typeof PERMISSIONS[number]["key"];

type RolePreset = {
    key: string;
    title: string;
    subtitle: string;
    permissions: Partial<Record<PermissionKey, boolean>>;
    restrictUnits: boolean;
    role: "admin" | "super_admin";
};

// Common scout leadership presets
const ROLE_PRESETS: RolePreset[] = [
    {
        key: "ct",
        title: "Unit Chef (CT / ACT / CM / ACM / CC / ACC)",
        subtitle: "Manages activities, members, and details of their unit",
        role: "admin",
        restrictUnits: true,
        permissions: {
            canManageActivities: true,
            canManageMembers: true,
            canManageUnits: true,
        },
    },
    {
        key: "cg",
        title: "Chef de Groupe (CG / ACG)",
        subtitle: "Manages everything across all units",
        role: "admin",
        restrictUnits: false,
        permissions: {
            canManageActivities: true,
            canManageMembers: true,
            canManageUnits: true,
            canManageGallery: true,
            canManagePartners: true,
            canManageSocialLinks: true,
            canManageNews: true,
            canViewSubmissions: true,
            canManageSettings: true,
        },
    },
    {
        key: "comm",
        title: "Communications team",
        subtitle: "Gallery, news, partners, social only",
        role: "admin",
        restrictUnits: false,
        permissions: {
            canManageGallery: true,
            canManageNews: true,
            canManagePartners: true,
            canManageSocialLinks: true,
        },
    },
    {
        key: "super",
        title: "Super Admin",
        subtitle: "Full access, can manage users",
        role: "super_admin",
        restrictUnits: false,
        permissions: Object.fromEntries(PERMISSIONS.map(p => [p.key, true])) as Record<PermissionKey, boolean>,
    },
];

export default function AdminUsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [units, setUnits] = useState<Unit[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // Form state for permissions
    const [role, setRole] = useState<"admin" | "super_admin">("admin");
    const [permissions, setPermissions] = useState<Record<PermissionKey, boolean>>({
        canManageUnits: false, canManageMembers: false, canManageActivities: false,
        canManageGallery: false, canManagePartners: false, canManageSocialLinks: false,
        canManageNews: false, canViewSubmissions: false, canManageSettings: false,
    });
    const [allowedUnitIds, setAllowedUnitIds] = useState<string[]>([]);
    const [restrictUnits, setRestrictUnits] = useState(false);

    function applyPreset(preset: RolePreset) {
        const newPerms: Record<PermissionKey, boolean> = {
            canManageUnits: false, canManageMembers: false, canManageActivities: false,
            canManageGallery: false, canManagePartners: false, canManageSocialLinks: false,
            canManageNews: false, canViewSubmissions: false, canManageSettings: false,
        };
        for (const k of Object.keys(preset.permissions) as PermissionKey[]) {
            newPerms[k] = preset.permissions[k] === true;
        }
        setPermissions(newPerms);
        setRole(preset.role);
        setRestrictUnits(preset.restrictUnits);
        if (!preset.restrictUnits) setAllowedUnitIds([]);
    }

    async function fetchData() {
        const [uRes, unitsRes] = await Promise.all([
            fetch("/api/admin/users"),
            fetch("/api/admin/units"),
        ]);
        if (uRes.ok) setUsers(await uRes.json());
        if (unitsRes.ok) setUnits(await unitsRes.json());
        setLoading(false);
    }

    useEffect(() => { fetchData(); }, []);

    function startCreate() {
        setEditing(null);
        setRole("admin");
        setPermissions({
            canManageUnits: false, canManageMembers: false, canManageActivities: false,
            canManageGallery: false, canManagePartners: false, canManageSocialLinks: false,
            canManageNews: false, canViewSubmissions: false, canManageSettings: false,
        });
        setAllowedUnitIds([]);
        setRestrictUnits(false);
        setShowForm(true);
    }

    function startEdit(u: User) {
        setEditing(u);
        setRole(u.role === "super_admin" ? "super_admin" : "admin");
        setPermissions({
            canManageUnits: u.canManageUnits,
            canManageMembers: u.canManageMembers,
            canManageActivities: u.canManageActivities,
            canManageGallery: u.canManageGallery,
            canManagePartners: u.canManagePartners,
            canManageSocialLinks: u.canManageSocialLinks,
            canManageNews: u.canManageNews,
            canViewSubmissions: u.canViewSubmissions,
            canManageSettings: u.canManageSettings,
        });
        setAllowedUnitIds(u.allowedUnitIds || []);
        setRestrictUnits((u.allowedUnitIds || []).length > 0);
        setShowForm(true);
    }

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError("");
        const fd = new FormData(e.currentTarget);

        const body: Record<string, unknown> = {
            name: fd.get("name"),
            email: fd.get("email"),
            role,
            ...permissions,
            allowedUnitIds: restrictUnits ? allowedUnitIds : [],
        };

        const password = fd.get("password") as string;
        if (password) body.password = password;

        const url = editing ? `/api/admin/users/${editing.id}` : "/api/admin/users";
        const method = editing ? "PUT" : "POST";

        const res = await fetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });

        if (!res.ok) {
            const data = await res.json();
            setError(data.error || "Failed to save user");
            return;
        }

        setShowForm(false);
        setEditing(null);
        fetchData();
    }

    async function handleDelete(id: string) {
        if (!confirm("Delete this user? This cannot be undone.")) return;
        const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
        if (!res.ok) {
            const data = await res.json();
            alert(data.error || "Failed to delete");
            return;
        }
        fetchData();
    }

    function toggleAll(value: boolean) {
        const next = { ...permissions };
        for (const p of PERMISSIONS) next[p.key] = value;
        setPermissions(next);
    }

    if (loading) return <p className="text-muted-foreground">Loading...</p>;

    const grantedCount = (u: User) => PERMISSIONS.filter(p => u[p.key]).length;

    return (
        <div>
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold">Users & Permissions</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">Manage who can access what in the admin panel</p>
                </div>
                <Button onClick={startCreate} className="gap-2">
                    <Plus className="w-4 h-4" /> Add User
                </Button>
            </div>

            {showForm && (
                <form onSubmit={handleSubmit} className="border rounded-2xl p-6 mb-8 space-y-6 bg-card">
                    <div className="flex justify-between items-start">
                        <h2 className="text-xl font-semibold">{editing ? `Edit ${editing.name}` : "New User"}</h2>
                        <button type="button" onClick={() => { setShowForm(false); setEditing(null); }} className="text-muted-foreground hover:text-foreground">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Quick presets */}
                    <div className="rounded-xl bg-primary/5 border border-primary/20 p-4 space-y-3">
                        <div>
                            <h3 className="text-sm font-bold">Quick role preset</h3>
                            <p className="text-xs text-muted-foreground mt-0.5">Pre-fills permissions for typical scout leadership roles. You can still tweak after applying.</p>
                        </div>
                        <div className="grid sm:grid-cols-2 gap-2">
                            {ROLE_PRESETS.map(p => (
                                <button
                                    key={p.key}
                                    type="button"
                                    onClick={() => applyPreset(p)}
                                    className="text-left px-3 py-2 rounded-lg bg-background border hover:border-primary hover:bg-primary/5 transition-colors"
                                >
                                    <div className="text-sm font-bold">{p.title}</div>
                                    <div className="text-xs text-muted-foreground">{p.subtitle}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Name *</Label>
                            <Input id="name" name="name" defaultValue={editing?.name} required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Email *</Label>
                            <Input id="email" name="email" type="email" defaultValue={editing?.email} required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Password {editing ? "(leave empty to keep current)" : "*"}</Label>
                            <Input id="password" name="password" type="password" required={!editing} minLength={editing ? 0 : 8} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="role">Role *</Label>
                            <select
                                id="role"
                                value={role}
                                onChange={(e) => setRole(e.target.value as "admin" | "super_admin")}
                                required
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            >
                                <option value="admin">Admin</option>
                                <option value="super_admin">Super Admin</option>
                            </select>
                            <p className="text-xs text-muted-foreground">Super admin has all permissions automatically.</p>
                        </div>
                    </div>

                    {/* Permissions */}
                    <div className="border-t pt-5 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Screen Permissions</h3>
                            <div className="flex gap-2">
                                <Button type="button" variant="ghost" size="sm" onClick={() => toggleAll(true)}>Grant all</Button>
                                <Button type="button" variant="ghost" size="sm" onClick={() => toggleAll(false)}>Revoke all</Button>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {PERMISSIONS.map(p => (
                                <label
                                    key={p.key}
                                    className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                                        permissions[p.key] ? "bg-primary/5 border-primary/30" : "bg-background hover:bg-muted/30"
                                    }`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={permissions[p.key]}
                                        onChange={(e) => setPermissions(prev => ({ ...prev, [p.key]: e.target.checked }))}
                                        className="accent-primary"
                                    />
                                    <span className="text-sm font-medium">{p.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Unit restrictions */}
                    <div className="border-t pt-5 space-y-3">
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Unit Access</h3>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={restrictUnits}
                                onChange={(e) => setRestrictUnits(e.target.checked)}
                                className="accent-primary"
                            />
                            <span className="text-sm font-medium">Restrict to specific units</span>
                        </label>
                        {restrictUnits ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 pl-6">
                                {units.map(u => (
                                    <label key={u.id} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                                        allowedUnitIds.includes(u.id) ? "bg-primary/5 border-primary/30" : "bg-background hover:bg-muted/30"
                                    }`}>
                                        <input
                                            type="checkbox"
                                            checked={allowedUnitIds.includes(u.id)}
                                            onChange={(e) => {
                                                if (e.target.checked) setAllowedUnitIds([...allowedUnitIds, u.id]);
                                                else setAllowedUnitIds(allowedUnitIds.filter(id => id !== u.id));
                                            }}
                                            className="accent-primary"
                                        />
                                        <span className="text-sm">{u.name}</span>
                                    </label>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-muted-foreground pl-6">User can access all units</p>
                        )}
                    </div>

                    {error && <p className="text-sm text-destructive">{error}</p>}

                    <div className="flex gap-2 pt-2">
                        <Button type="submit">{editing ? "Update User" : "Create User"}</Button>
                        <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditing(null); }}>Cancel</Button>
                    </div>
                </form>
            )}

            <div className="border rounded-xl overflow-hidden bg-card">
                <table className="w-full">
                    <thead className="bg-muted/50">
                        <tr>
                            <th className="text-left p-3 text-sm font-medium">Name</th>
                            <th className="text-left p-3 text-sm font-medium">Email</th>
                            <th className="text-left p-3 text-sm font-medium">Role</th>
                            <th className="text-left p-3 text-sm font-medium">Permissions</th>
                            <th className="text-left p-3 text-sm font-medium">Units</th>
                            <th className="text-right p-3 text-sm font-medium">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.length === 0 ? (
                            <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No users</td></tr>
                        ) : users.map((u) => (
                            <tr key={u.id} className="border-t">
                                <td className="p-3 text-sm font-medium">{u.name}</td>
                                <td className="p-3 text-sm text-muted-foreground">{u.email}</td>
                                <td className="p-3 text-sm">
                                    {u.role === "super_admin" ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-primary text-white">
                                            <ShieldCheck className="w-3 h-3" /> Super Admin
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                                            <Shield className="w-3 h-3" /> Admin
                                        </span>
                                    )}
                                </td>
                                <td className="p-3 text-sm text-muted-foreground">
                                    {u.role === "super_admin" ? "All" : `${grantedCount(u)} / ${PERMISSIONS.length}`}
                                </td>
                                <td className="p-3 text-sm text-muted-foreground">
                                    {u.role === "super_admin" || u.allowedUnitIds.length === 0 ? "All units" : `${u.allowedUnitIds.length} unit(s)`}
                                </td>
                                <td className="p-3 text-right whitespace-nowrap">
                                    <Button variant="ghost" size="sm" onClick={() => startEdit(u)}><Pencil className="w-4 h-4" /></Button>
                                    {u.role !== "super_admin" && (
                                        <Button variant="ghost" size="sm" onClick={() => handleDelete(u.id)} className="text-destructive hover:text-destructive">
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
