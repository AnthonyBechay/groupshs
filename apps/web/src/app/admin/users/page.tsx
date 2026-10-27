"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect, useMemo } from "react";
import { Trash2, Plus, Pencil, Shield, ShieldCheck, X, Link2, Search, UserRound } from "lucide-react";
import { UnsavedFormGuard } from "@/components/unsaved-form-guard";
import { leadershipRolesOf, isCouncilRole } from "@/lib/scout-config";

type Unit = { id: string; name: string };
type LinkedMember = {
    id: string; firstName: string; lastName: string;
    role: string | null; extraRoles: string[];
    unit: { id: string; name: string; unitType: string };
    servesUnit: { id: string; name: string; unitType: string } | null;
};

/** The unit this member runs as unit maîtrise (CM, ACT…), if any. */
function ledUnitOf(m: LinkedMember | null) {
    if (!m?.servesUnit) return null;
    const roles = leadershipRolesOf(m, m.unit.unitType).filter(r => !isCouncilRole(r));
    return roles.length ? m.servesUnit : null;
}

/** What a unit leader needs: their unit's activities, members and family links. */
const LEADER_PERMISSIONS = ["canManageActivities", "canManageMembers"] as const;

/** Can this account do a unit leader's job for that unit? */
function leaderAccessOk(
    perms: Partial<Record<(typeof LEADER_PERMISSIONS)[number], boolean>>, role: string, restrict: boolean, allowed: string[], unitId: string
) {
    if (role === "super_admin") return true;
    return LEADER_PERMISSIONS.every(k => perms[k]) && (!restrict || allowed.includes(unitId));
}

/** "CM · Meute Hathi" — what this person is in the group. */
function describeMember(m: LinkedMember): string {
    const leading = leadershipRolesOf(m, m.unit.unitType);
    if (leading.length > 0) {
        return `${leading.join(" / ")} · ${m.servesUnit?.name ?? m.unit.name}`;
    }
    return `${m.role ?? "Member"} · ${m.unit.name}`;
}
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
    canManageHistory: boolean;
    canManageTransitions: boolean;
    canManageStock: boolean;
    allowedUnitIds: string[];
    memberId: string | null;
    member: LinkedMember | null;
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
    { key: "canManageHistory", label: "History" },
    { key: "canManageTransitions", label: "Transitions (Move Up / Maîtrise / Leaving)" },
    { key: "canManageStock", label: "Stock (storekeeper)" },
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
            canManageHistory: true,
            canManageTransitions: true,
            canManageStock: true,
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
        canManageHistory: false, canManageTransitions: false, canManageStock: false,
    });
    const [allowedUnitIds, setAllowedUnitIds] = useState<string[]>([]);
    const [restrictUnits, setRestrictUnits] = useState(false);
    const [linkedMember, setLinkedMember] = useState<LinkedMember | null>(null);
    const [members, setMembers] = useState<LinkedMember[]>([]);

    function applyPreset(preset: RolePreset) {
        const newPerms: Record<PermissionKey, boolean> = {
            canManageUnits: false, canManageMembers: false, canManageActivities: false,
            canManageGallery: false, canManagePartners: false, canManageSocialLinks: false,
            canManageNews: false, canViewSubmissions: false, canManageSettings: false,
            canManageHistory: false, canManageTransitions: false, canManageStock: false,
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

    // Loaded once the form opens: the picker is the only thing that needs it.
    async function loadMembers() {
        if (members.length > 0) return;
        const res = await fetch("/api/admin/members");
        if (res.ok) setMembers(await res.json());
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { fetchData(); }, []);

    // The panel scrolls; the list behind it should not.
    useEffect(() => {
        if (!showForm) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => { document.body.style.overflow = prev; };
    }, [showForm]);

    function startCreate() {
        setEditing(null);
        setRole("admin");
        setPermissions({
            canManageUnits: false, canManageMembers: false, canManageActivities: false,
            canManageGallery: false, canManagePartners: false, canManageSocialLinks: false,
            canManageNews: false, canViewSubmissions: false, canManageSettings: false,
            canManageHistory: false, canManageTransitions: false, canManageStock: false,
        });
        setAllowedUnitIds([]);
        setRestrictUnits(false);
        setLinkedMember(null);
        setShowForm(true);
        loadMembers();
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
            canManageHistory: u.canManageHistory,
            canManageTransitions: u.canManageTransitions,
            canManageStock: u.canManageStock,
        });
        setAllowedUnitIds(u.allowedUnitIds || []);
        setRestrictUnits((u.allowedUnitIds || []).length > 0);
        setLinkedMember(u.member);
        setShowForm(true);
        loadMembers();
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
            memberId: linkedMember?.id ?? null,
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

    /** Add what a unit leader needs for this unit, keeping everything else. */
    function grantLeaderAccess(unitId: string) {
        setPermissions(prev => ({ ...prev, ...Object.fromEntries(LEADER_PERMISSIONS.map(k => [k, true])) }));
        if (restrictUnits) setAllowedUnitIds(prev => (prev.includes(unitId) ? prev : [...prev, unitId]));
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

            {/* A panel over the list rather than a form pushed above it: the
                list stays where it was, and closing returns to the same spot.
                The backdrop does not close it, so a stray click cannot throw
                away half-entered permissions. */}
            {showForm && (
                <div className="fixed inset-0 z-[60] flex justify-end" role="dialog" aria-modal="true" aria-label={editing ? `Edit ${editing.name}` : "New user"}>
                <div className="absolute inset-0 bg-black/40" aria-hidden />
                <form onSubmit={handleSubmit} className="relative h-full w-full max-w-2xl bg-background shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
                    <UnsavedFormGuard />
                    <div className="flex justify-between items-center gap-3 px-6 py-4 border-b">
                        <div className="min-w-0">
                            <h2 className="text-xl font-semibold truncate">{editing ? `Edit ${editing.name}` : "New user"}</h2>
                            {editing && <p className="text-xs text-muted-foreground truncate">{editing.email}</p>}
                        </div>
                        <button type="button" onClick={() => { setShowForm(false); setEditing(null); }} className="text-muted-foreground hover:text-foreground p-1" aria-label="Close">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

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

                    <MemberLink
                        members={members}
                        users={users}
                        editingId={editing?.id ?? null}
                        value={linkedMember}
                        onChange={(m) => {
                            setLinkedMember(m);
                            // Linking a CT / ACT / CM… sets them up to run their
                            // unit straight away: a brand-new account gets the
                            // unit chef preset on that unit, an existing one just
                            // gains the unit. Everything stays editable below.
                            const unit = ledUnitOf(m);
                            if (!unit) return;
                            const noPermissions = !Object.values(permissions).some(Boolean);
                            if (noPermissions) {
                                applyPreset(ROLE_PRESETS.find(p => p.key === "ct")!);
                                setRestrictUnits(true);
                                setAllowedUnitIds([unit.id]);
                            } else {
                                grantLeaderAccess(unit.id);
                            }
                        }}
                        accessOk={(unitId) => leaderAccessOk(permissions, role, restrictUnits, allowedUnitIds, unitId)}
                        onGrantAccess={grantLeaderAccess}
                    />

                    {/* Permissions */}
                    <div className="border-t pt-5 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Screen Permissions</h3>
                            <div className="flex gap-2">
                                <Button type="button" variant="ghost" size="sm" onClick={() => toggleAll(true)}>Grant all</Button>
                                <Button type="button" variant="ghost" size="sm" onClick={() => toggleAll(false)}>Revoke all</Button>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-6">
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

                    </div>

                    <div className="border-t px-6 py-3 space-y-2 bg-card">
                        {error && <p className="text-sm text-destructive">{error}</p>}
                        <div className="flex gap-2">
                            <Button type="submit">{editing ? "Save changes" : "Create user"}</Button>
                            <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditing(null); }}>Cancel</Button>
                        </div>
                    </div>
                </form>
                </div>
            )}

            <div className="border rounded-xl overflow-hidden bg-card">
                <table className="w-full">
                    <thead className="bg-muted/50">
                        <tr>
                            <th className="text-left p-3 text-sm font-medium">Name</th>
                            <th className="text-left p-3 text-sm font-medium">Email</th>
                            <th className="text-left p-3 text-sm font-medium">Member</th>
                            <th className="text-left p-3 text-sm font-medium">Role</th>
                            <th className="text-left p-3 text-sm font-medium">Permissions</th>
                            <th className="text-left p-3 text-sm font-medium">Units</th>
                            <th className="text-right p-3 text-sm font-medium">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.length === 0 ? (
                            <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No users</td></tr>
                        ) : users.map((u) => (
                            <tr key={u.id} className="border-t">
                                <td className="p-3 text-sm font-medium">{u.name}</td>
                                <td className="p-3 text-sm text-muted-foreground">{u.email}</td>
                                <td className="p-3 text-sm">
                                    {u.member ? (
                                        <span className="inline-flex flex-col">
                                            <span className="font-medium">{u.member.firstName} {u.member.lastName}</span>
                                            <span className="text-xs text-muted-foreground">{describeMember(u.member)}</span>
                                            {(() => {
                                                const unit = ledUnitOf(u.member);
                                                if (!unit || leaderAccessOk(u, u.role, u.allowedUnitIds.length > 0, u.allowedUnitIds, unit.id)) return null;
                                                return <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">Cannot manage {unit.name} yet</span>;
                                            })()}
                                        </span>
                                    ) : (
                                        <span className="text-xs text-muted-foreground">Not linked</span>
                                    )}
                                </td>
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

/**
 * Who this account belongs to. Optional: linking only tells the app which
 * unit the person leads (for "My unit"). Access is still the permissions and
 * unit list below — "Limit access to this unit" copies the unit across when
 * that is what you want.
 */
function MemberLink({ members, users, editingId, value, onChange, accessOk, onGrantAccess }: {
    members: LinkedMember[];
    users: User[];
    editingId: string | null;
    value: LinkedMember | null;
    onChange: (m: LinkedMember | null) => void;
    accessOk: (unitId: string) => boolean;
    onGrantAccess: (unitId: string) => void;
}) {
    const [query, setQuery] = useState("");
    // Who is taken by another account, so the picker can say so up front.
    const takenBy = useMemo(() => new Map(
        users.filter(u => u.memberId && u.id !== editingId).map(u => [u.memberId!, u.name])
    ), [users, editingId]);
    const matches = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (q.length < 2) return [];
        return members
            .filter(m => `${m.firstName} ${m.lastName}`.toLowerCase().includes(q)
                || `${m.lastName} ${m.firstName}`.toLowerCase().includes(q))
            .slice(0, 8);
    }, [members, query]);

    const ledUnit = ledUnitOf(value);

    return (
        <div className="border-t pt-5 space-y-3">
            <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <Link2 className="w-4 h-4" /> Linked member <span className="normal-case font-normal tracking-normal">(optional)</span>
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                    The person behind this account. If they lead a unit (CM, CT, ACT…), they get a &quot;My unit&quot; view,
                    and linking sets them up to manage that unit&apos;s activities, members and family links.
                </p>
            </div>

            {value ? (
                <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-primary/5 border-primary/20 p-3">
                    <span className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <UserRound className="w-4 h-4" />
                    </span>
                    <div className="flex-1 min-w-[160px]">
                        <p className="text-sm font-semibold">{value.firstName} {value.lastName}</p>
                        <p className="text-xs text-muted-foreground">{describeMember(value)}</p>
                    </div>
                    <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)} className="text-destructive">
                        Unlink
                    </Button>
                    {ledUnit && (
                        accessOk(ledUnit.id) ? (
                            <p className="w-full text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                                ✓ Can manage {ledUnit.name}: its activities, attendance, members and family links.
                            </p>
                        ) : (
                            <div className="w-full flex flex-wrap items-center gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50 px-3 py-2">
                                <span className="text-xs text-amber-900 dark:text-amber-300 flex-1">
                                    This account cannot manage {ledUnit.name}, the unit they lead, yet.
                                </span>
                                <Button type="button" size="sm" variant="outline" onClick={() => onGrantAccess(ledUnit.id)}>Give access</Button>
                            </div>
                        )
                    )}
                </div>
            ) : (
                <div className="relative max-w-md">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder="Search a member by name…"
                        className="pl-9"
                    />
                    {matches.length > 0 && (
                        <div className="absolute z-20 mt-1 w-full rounded-xl border bg-card shadow-lg p-1">
                            {matches.map(m => {
                                const taken = takenBy.get(m.id);
                                return (
                                    <button
                                        key={m.id}
                                        type="button"
                                        disabled={!!taken}
                                        onClick={() => { onChange(m); setQuery(""); }}
                                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted disabled:opacity-50 disabled:hover:bg-transparent"
                                    >
                                        <span className="block text-sm font-medium">{m.firstName} {m.lastName}</span>
                                        <span className="block text-xs text-muted-foreground">
                                            {taken ? `Already linked to ${taken}` : describeMember(m)}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
