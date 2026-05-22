"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect, useRef } from "react";
import { Trash2, Plus, Pencil, Upload, ExternalLink, ArrowUp, ArrowDown } from "lucide-react";

type Partner = {
    id: string;
    name: string;
    description: string | null;
    logoUrl: string;
    websiteUrl: string | null;
    sortOrder: number;
};

export default function AdminPartnersPage() {
    const [partners, setPartners] = useState<Partner[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState<Partner | null>(null);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    async function fetchPartners() {
        const res = await fetch("/api/admin/partners");
        setPartners(await res.json());
        setLoading(false);
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { fetchPartners(); }, []);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);

        if (editing) {
            await fetch(`/api/admin/partners/${editing.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: fd.get("name"),
                    description: fd.get("description") || null,
                    websiteUrl: fd.get("websiteUrl") || null,
                }),
            });
        } else {
            const file = fd.get("file") as File;
            if (!file || file.size === 0) {
                alert("Please select a logo image");
                return;
            }
            setUploading(true);
            const uploadData = new FormData();
            uploadData.append("file", file);
            uploadData.append("name", fd.get("name") as string);
            uploadData.append("description", (fd.get("description") as string) || "");
            uploadData.append("websiteUrl", (fd.get("websiteUrl") as string) || "");

            const res = await fetch("/api/admin/partners", { method: "POST", body: uploadData });
            if (!res.ok) {
                const data = await res.json();
                alert(data.error || "Failed to create partner");
                setUploading(false);
                return;
            }
            setUploading(false);
        }

        setShowForm(false);
        setEditing(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        fetchPartners();
    }

    async function handleDelete(id: string) {
        if (!confirm("Delete this partner?")) return;
        await fetch(`/api/admin/partners/${id}`, { method: "DELETE" });
        fetchPartners();
    }

    function startEdit(p: Partner) {
        setEditing(p);
        setShowForm(true);
    }

    async function move(index: number, direction: -1 | 1) {
        const target = index + direction;
        if (target < 0 || target >= partners.length) return;
        const reordered = [...partners];
        [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
        setPartners(reordered);
        await fetch("/api/admin/partners/reorder", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ids: reordered.map(p => p.id) }),
        });
    }

    if (loading) return <p className="text-muted-foreground">Loading...</p>;

    return (
        <div>
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold">Partners & Sponsors</h1>
                    <p className="text-sm text-muted-foreground mt-1">Logos and details displayed on the homepage. Use arrows to reorder.</p>
                </div>
                <Button onClick={() => { setEditing(null); setShowForm(!showForm); }} className="gap-2">
                    <Plus className="w-4 h-4" /> Add Partner
                </Button>
            </div>

            {showForm && (
                <form onSubmit={handleSubmit} className="border rounded-lg p-6 mb-8 space-y-4 bg-card">
                    <h2 className="text-lg font-semibold">{editing ? "Edit Partner" : "New Partner"}</h2>
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Name *</Label>
                            <Input id="name" name="name" defaultValue={editing?.name} required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="websiteUrl">Website URL</Label>
                            <Input id="websiteUrl" name="websiteUrl" type="url" placeholder="https://..." defaultValue={editing?.websiteUrl || ""} />
                        </div>
                        {!editing && (
                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="file">Logo Image *</Label>
                                <input ref={fileInputRef} id="file" name="file" type="file" accept="image/*" required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium" />
                            </div>
                        )}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="description">Short description (optional)</Label>
                        <textarea
                            id="description"
                            name="description"
                            defaultValue={editing?.description || ""}
                            placeholder="A few words shown under the logo on the landing page"
                            rows={2}
                            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-y"
                        />
                    </div>
                    <div className="flex gap-2">
                        <Button type="submit" disabled={uploading}>{uploading ? "Uploading..." : editing ? "Update" : "Create"}</Button>
                        <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditing(null); }}>Cancel</Button>
                    </div>
                </form>
            )}

            {partners.length === 0 ? (
                <div className="text-center py-20 border border-dashed rounded-2xl bg-muted/30">
                    <Upload className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                    <p className="text-muted-foreground mb-4">No partners yet. Add logos to display on the homepage.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {partners.map((p, idx) => (
                        <div key={p.id} className="group flex items-center gap-4 border rounded-xl p-4 bg-card hover:shadow-md transition-all">
                            <div className="flex flex-col gap-1">
                                <button
                                    onClick={() => move(idx, -1)}
                                    disabled={idx === 0}
                                    className="w-7 h-7 rounded-md border bg-background hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center"
                                    title="Move up"
                                >
                                    <ArrowUp className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    onClick={() => move(idx, 1)}
                                    disabled={idx === partners.length - 1}
                                    className="w-7 h-7 rounded-md border bg-background hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center"
                                    title="Move down"
                                >
                                    <ArrowDown className="w-3.5 h-3.5" />
                                </button>
                            </div>
                            <div className="w-24 h-16 bg-muted/30 rounded-lg flex items-center justify-center p-2 shrink-0">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={p.logoUrl} alt={p.name} className="max-w-full max-h-full object-contain" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-semibold truncate">{p.name}</h3>
                                {p.description && <p className="text-sm text-muted-foreground line-clamp-1">{p.description}</p>}
                                {p.websiteUrl && (
                                    <a href={p.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary flex items-center gap-1 mt-1 hover:underline w-fit">
                                        <ExternalLink className="w-3 h-3" /> {p.websiteUrl}
                                    </a>
                                )}
                            </div>
                            <div className="flex gap-1">
                                <Button variant="ghost" size="sm" onClick={() => startEdit(p)}><Pencil className="w-4 h-4" /></Button>
                                <Button variant="ghost" size="sm" onClick={() => handleDelete(p.id)} className="text-destructive hover:text-destructive"><Trash2 className="w-4 h-4" /></Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
