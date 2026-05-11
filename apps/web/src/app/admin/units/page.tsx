"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect, useRef } from "react";
import { Trash2, Plus, Pencil, Upload, X, ImagePlus } from "lucide-react";

const UNIT_TYPES = [
    { value: "LOUVETEAUX", label: "Louveteaux" },
    { value: "ECLAIREURS", label: "Eclaireurs" },
    { value: "ROUTIERS", label: "Routiers" },
    { value: "GROUP", label: "Group" },
];

type Contact = {
    id: string;
    memberId: string;
    sortOrder: number;
    member: { id: string; firstName: string; lastName: string; phone: string | null; role: string | null; photoUrl: string | null };
};

type Unit = {
    id: string;
    name: string;
    unitType: string;
    description: string | null;
    contactName: string | null;
    contactPhone: string | null;
    imageUrl: string | null;
    contacts: Contact[];
    _count: { members: number; activities: number };
};

type Member = { id: string; firstName: string; lastName: string; unitId: string; role: string | null };

export default function AdminUnitsPage() {
    const [units, setUnits] = useState<Unit[]>([]);
    const [allMembers, setAllMembers] = useState<Member[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState<Unit | null>(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [contactMemberIds, setContactMemberIds] = useState<string[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    async function fetchAll() {
        const [uRes, mRes] = await Promise.all([
            fetch("/api/admin/units"),
            fetch("/api/admin/members"),
        ]);
        if (uRes.ok) setUnits(await uRes.json());
        if (mRes.ok) setAllMembers(await mRes.json());
        setLoading(false);
    }

    useEffect(() => { fetchAll(); }, []);

    async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        const formData = new FormData();
        formData.append("file", file);
        try {
            const res = await fetch("/api/upload", { method: "POST", body: formData });
            if (!res.ok) { alert("Upload failed"); return; }
            const { url } = await res.json();
            setImageUrl(url);
        } catch { alert("Upload failed"); }
        finally { setUploading(false); }
    }

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const body = {
            name: formData.get("name"),
            unitType: formData.get("unitType"),
            description: formData.get("description") || null,
            contactName: formData.get("contactName") || null,
            contactPhone: formData.get("contactPhone") || null,
            imageUrl,
            contactMemberIds,
        };

        if (editing) {
            await fetch(`/api/admin/units/${editing.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        } else {
            await fetch("/api/admin/units", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        }

        setShowForm(false);
        setEditing(null);
        setImageUrl(null);
        setContactMemberIds([]);
        fetchAll();
    }

    async function handleDelete(id: string) {
        if (!confirm("Delete this unit? All members and activities in it must be removed first.")) return;
        const res = await fetch(`/api/admin/units/${id}`, { method: "DELETE" });
        if (!res.ok) { alert("Cannot delete unit with existing members or activities"); return; }
        fetchAll();
    }

    function startEdit(u: Unit) {
        setEditing(u);
        setImageUrl(u.imageUrl);
        setContactMemberIds((u.contacts || []).sort((a, b) => a.sortOrder - b.sortOrder).map(c => c.memberId));
        setShowForm(true);
    }

    function toggleContact(memberId: string) {
        setContactMemberIds(prev =>
            prev.includes(memberId) ? prev.filter(id => id !== memberId) : [...prev, memberId]
        );
    }

    function moveContact(memberId: string, dir: -1 | 1) {
        setContactMemberIds(prev => {
            const idx = prev.indexOf(memberId);
            if (idx === -1) return prev;
            const target = idx + dir;
            if (target < 0 || target >= prev.length) return prev;
            const copy = [...prev];
            [copy[idx], copy[target]] = [copy[target], copy[idx]];
            return copy;
        });
    }

    if (loading) return <p className="text-muted-foreground">Loading...</p>;

    const eligibleMembers = editing
        ? allMembers.filter(m => m.unitId === editing.id || m.role && ["CG", "ACG", "CT", "ACT", "CM", "ACM", "CC", "ACC"].includes(m.role))
        : allMembers;

    return (
        <div>
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">Units</h1>
                <Button onClick={() => { setEditing(null); setImageUrl(null); setContactMemberIds([]); setShowForm(!showForm); }} className="gap-2">
                    <Plus className="w-4 h-4" /> Add Unit
                </Button>
            </div>

            {showForm && (
                <form onSubmit={handleSubmit} className="border rounded-2xl p-6 mb-8 space-y-5 bg-card">
                    <h2 className="text-lg font-semibold">{editing ? "Edit Unit" : "New Unit"}</h2>

                    {/* Logo */}
                    <div className="flex items-start gap-5">
                        <div className="w-28 h-28 rounded-2xl border-2 border-dashed flex items-center justify-center overflow-hidden bg-muted/20 shrink-0">
                            {imageUrl ? (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img src={imageUrl} alt="Logo" className="w-full h-full object-cover" />
                            ) : (
                                <ImagePlus className="w-8 h-8 text-muted-foreground/40" />
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label>Unit logo / photo</Label>
                            <div className="flex gap-2">
                                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                                <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="gap-2">
                                    <Upload className="w-3.5 h-3.5" /> {uploading ? "Uploading..." : imageUrl ? "Change" : "Upload"}
                                </Button>
                                {imageUrl && (
                                    <Button type="button" variant="ghost" size="sm" onClick={() => setImageUrl(null)} className="text-destructive">
                                        <X className="w-3.5 h-3.5" />
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Name *</Label>
                            <Input id="name" name="name" defaultValue={editing?.name} required placeholder="e.g. Louveteaux 1" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="unitType">Type *</Label>
                            <select id="unitType" name="unitType" defaultValue={editing?.unitType || ""} required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                                <option value="">Select type...</option>
                                {UNIT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="description">Description</Label>
                            <textarea id="description" name="description" defaultValue={editing?.description || ""} className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="About this unit..." />
                        </div>
                    </div>

                    {/* Contact persons */}
                    <div className="border-t pt-5 space-y-3">
                        <div>
                            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Contact persons</h3>
                            <p className="text-xs text-muted-foreground mt-0.5">Select one or more members to display as unit contacts on the public site.</p>
                        </div>

                        {/* Selected (ordered) */}
                        {contactMemberIds.length > 0 && (
                            <div className="space-y-1.5">
                                <p className="text-xs font-medium text-muted-foreground">Selected (in display order)</p>
                                {contactMemberIds.map((id, idx) => {
                                    const m = allMembers.find(mm => mm.id === id);
                                    if (!m) return null;
                                    return (
                                        <div key={id} className="flex items-center gap-2 p-2 rounded-lg border bg-primary/5">
                                            <div className="flex flex-col">
                                                <button type="button" onClick={() => moveContact(id, -1)} disabled={idx === 0} className="text-xs px-1 disabled:opacity-30">▲</button>
                                                <button type="button" onClick={() => moveContact(id, 1)} disabled={idx === contactMemberIds.length - 1} className="text-xs px-1 disabled:opacity-30">▼</button>
                                            </div>
                                            <span className="flex-1 text-sm font-medium">{m.firstName} {m.lastName}</span>
                                            {m.role && <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary">{m.role}</span>}
                                            <Button type="button" variant="ghost" size="sm" onClick={() => toggleContact(id)} className="text-destructive h-8 w-8 p-0"><X className="w-3.5 h-3.5" /></Button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Picker */}
                        <details className="rounded-lg border p-3 bg-background">
                            <summary className="cursor-pointer text-sm font-medium select-none">Add members as contacts ({allMembers.length - contactMemberIds.length} available)</summary>
                            <div className="mt-3 max-h-64 overflow-y-auto grid sm:grid-cols-2 gap-1.5">
                                {eligibleMembers.filter(m => !contactMemberIds.includes(m.id)).map(m => (
                                    <button
                                        key={m.id}
                                        type="button"
                                        onClick={() => toggleContact(m.id)}
                                        className="text-left flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted text-sm"
                                    >
                                        <Plus className="w-3 h-3 text-primary" />
                                        <span>{m.firstName} {m.lastName}</span>
                                        {m.role && <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-muted text-muted-foreground">{m.role}</span>}
                                    </button>
                                ))}
                            </div>
                        </details>

                        {/* Legacy contact (fallback if no members linked) */}
                        <div className="grid md:grid-cols-2 gap-4 pt-2">
                            <div className="space-y-2">
                                <Label htmlFor="contactName">Free-text contact name (fallback)</Label>
                                <Input id="contactName" name="contactName" defaultValue={editing?.contactName || ""} placeholder="Used only if no member contacts are selected" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="contactPhone">Free-text contact phone</Label>
                                <Input id="contactPhone" name="contactPhone" defaultValue={editing?.contactPhone || ""} />
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <Button type="submit">{editing ? "Update" : "Create"}</Button>
                        <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditing(null); setImageUrl(null); setContactMemberIds([]); }}>Cancel</Button>
                    </div>
                </form>
            )}

            <div className="border rounded-xl overflow-hidden bg-card">
                <table className="w-full">
                    <thead className="bg-muted/50">
                        <tr>
                            <th className="text-left p-3 text-sm font-medium">Logo</th>
                            <th className="text-left p-3 text-sm font-medium">Name</th>
                            <th className="text-left p-3 text-sm font-medium">Type</th>
                            <th className="text-left p-3 text-sm font-medium">Contacts</th>
                            <th className="text-left p-3 text-sm font-medium">Members</th>
                            <th className="text-left p-3 text-sm font-medium">Activities</th>
                            <th className="text-right p-3 text-sm font-medium">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {units.length === 0 ? (
                            <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">No units yet</td></tr>
                        ) : units.map((u) => (
                            <tr key={u.id} className="border-t">
                                <td className="p-3">
                                    {u.imageUrl ? (
                                        /* eslint-disable-next-line @next/next/no-img-element */
                                        <img src={u.imageUrl} alt={u.name} className="w-12 h-12 rounded-lg object-cover" />
                                    ) : <div className="w-12 h-12 rounded-lg bg-muted" />}
                                </td>
                                <td className="p-3 text-sm font-medium">{u.name}</td>
                                <td className="p-3 text-sm"><span className="px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">{u.unitType}</span></td>
                                <td className="p-3 text-sm text-muted-foreground">
                                    {u.contacts && u.contacts.length > 0
                                        ? u.contacts.slice(0, 2).map(c => `${c.member.firstName} ${c.member.lastName}`).join(", ") + (u.contacts.length > 2 ? ` +${u.contacts.length - 2}` : "")
                                        : (u.contactName || "-")
                                    }
                                </td>
                                <td className="p-3 text-sm text-muted-foreground">{u._count.members}</td>
                                <td className="p-3 text-sm text-muted-foreground">{u._count.activities}</td>
                                <td className="p-3 text-right">
                                    <Button variant="ghost" size="sm" onClick={() => startEdit(u)}><Pencil className="w-4 h-4" /></Button>
                                    <Button variant="ghost" size="sm" onClick={() => handleDelete(u.id)} className="text-destructive hover:text-destructive"><Trash2 className="w-4 h-4" /></Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
