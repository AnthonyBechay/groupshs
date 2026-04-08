"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect, useRef } from "react";
import { Trash2, Plus, Pencil, Upload, X } from "lucide-react";
import Image from "next/image";

const UNIT_TYPES = [
    { value: "LOUVETEAUX", label: "Louveteaux" },
    { value: "ECLAIREURS", label: "Eclaireurs" },
    { value: "ROUTIERS", label: "Routiers" },
];

type Unit = {
    id: string;
    name: string;
    unitType: string;
    description: string | null;
    contactName: string | null;
    contactPhone: string | null;
    imageUrl: string | null;
    _count: { members: number; activities: number };
};

export default function AdminUnitsPage() {
    const [units, setUnits] = useState<Unit[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState<Unit | null>(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    async function fetchUnits() {
        const res = await fetch("/api/admin/units");
        setUnits(await res.json());
        setLoading(false);
    }

    useEffect(() => { fetchUnits(); }, []);

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
        };

        if (editing) {
            await fetch(`/api/admin/units/${editing.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        } else {
            await fetch("/api/admin/units", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        }

        setShowForm(false);
        setEditing(null);
        setImageUrl(null);
        fetchUnits();
    }

    async function handleDelete(id: string) {
        if (!confirm("Delete this unit? All members and activities in it must be removed first.")) return;
        const res = await fetch(`/api/admin/units/${id}`, { method: "DELETE" });
        if (!res.ok) { alert("Cannot delete unit with existing members or activities"); return; }
        fetchUnits();
    }

    function startEdit(u: Unit) {
        setEditing(u);
        setImageUrl(u.imageUrl);
        setShowForm(true);
    }

    if (loading) return <p className="text-muted-foreground">Loading...</p>;

    return (
        <div>
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">Units</h1>
                <Button onClick={() => { setEditing(null); setImageUrl(null); setShowForm(!showForm); }} className="gap-2">
                    <Plus className="w-4 h-4" /> Add Unit
                </Button>
            </div>

            {showForm && (
                <form onSubmit={handleSubmit} className="border rounded-lg p-6 mb-8 space-y-4 bg-card">
                    <h2 className="text-lg font-semibold">{editing ? "Edit Unit" : "New Unit"}</h2>
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
                        <div className="space-y-2">
                            <Label htmlFor="contactName">Contact Person</Label>
                            <Input id="contactName" name="contactName" defaultValue={editing?.contactName || ""} placeholder="Responsible person name" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="contactPhone">Contact Phone</Label>
                            <Input id="contactPhone" name="contactPhone" defaultValue={editing?.contactPhone || ""} placeholder="e.g. 71 123 456" />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="description">Description</Label>
                            <textarea id="description" name="description" defaultValue={editing?.description || ""} className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="About this unit..." />
                        </div>
                        <div className="space-y-2">
                            <Label>Unit Photo</Label>
                            <div className="flex items-center gap-3">
                                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                                <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="gap-2">
                                    <Upload className="w-4 h-4" /> {uploading ? "Uploading..." : "Upload"}
                                </Button>
                                {imageUrl && <Button type="button" variant="ghost" size="sm" onClick={() => setImageUrl(null)} className="text-destructive"><X className="w-4 h-4" /></Button>}
                            </div>
                            {imageUrl && <div className="mt-2 relative w-40 h-24 rounded-md overflow-hidden border"><Image src={imageUrl} alt="Preview" fill className="object-cover" unoptimized /></div>}
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button type="submit">{editing ? "Update" : "Create"}</Button>
                        <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditing(null); setImageUrl(null); }}>Cancel</Button>
                    </div>
                </form>
            )}

            <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                    <thead className="bg-muted/50">
                        <tr>
                            <th className="text-left p-3 text-sm font-medium">Name</th>
                            <th className="text-left p-3 text-sm font-medium">Type</th>
                            <th className="text-left p-3 text-sm font-medium">Contact</th>
                            <th className="text-left p-3 text-sm font-medium">Members</th>
                            <th className="text-left p-3 text-sm font-medium">Activities</th>
                            <th className="text-right p-3 text-sm font-medium">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {units.length === 0 ? (
                            <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No units yet</td></tr>
                        ) : units.map((u) => (
                            <tr key={u.id} className="border-t">
                                <td className="p-3 text-sm font-medium">{u.name}</td>
                                <td className="p-3 text-sm"><span className="px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">{u.unitType}</span></td>
                                <td className="p-3 text-sm text-muted-foreground">{u.contactName ? `${u.contactName}${u.contactPhone ? ` - ${u.contactPhone}` : ""}` : "-"}</td>
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
