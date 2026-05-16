"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Plus, Pencil, Trash2, ArrowUp, ArrowDown, X, Upload, History } from "lucide-react";

type Section = {
    id: string;
    year: number | null;
    dateLabel: string | null;
    title: string;
    description: string | null;
    imageUrl: string | null;
    sortOrder: number;
};

export default function AdminAboutPage() {
    const [sections, setSections] = useState<Section[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState<Section | null>(null);
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    async function fetchSections() {
        const res = await fetch("/api/admin/about");
        if (res.ok) setSections(await res.json());
        setLoading(false);
    }

    useEffect(() => { fetchSections(); }, []);

    async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        const fd = new FormData();
        fd.append("file", file);
        try {
            const res = await fetch("/api/upload", { method: "POST", body: fd });
            if (res.ok) {
                const { url } = await res.json();
                setImageUrl(url);
            }
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    }

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const yearStr = fd.get("year") as string;
        const body = {
            year: yearStr ? parseInt(yearStr) : null,
            dateLabel: (fd.get("dateLabel") as string) || null,
            title: fd.get("title"),
            description: (fd.get("description") as string) || null,
            imageUrl,
        };
        const url = editing ? `/api/admin/about/${editing.id}` : "/api/admin/about";
        const method = editing ? "PUT" : "POST";
        await fetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });
        setShowForm(false);
        setEditing(null);
        setImageUrl(null);
        fetchSections();
    }

    async function handleDelete(id: string) {
        if (!confirm("Delete this entry?")) return;
        await fetch(`/api/admin/about/${id}`, { method: "DELETE" });
        fetchSections();
    }

    function startEdit(s: Section) {
        setEditing(s);
        setImageUrl(s.imageUrl);
        setShowForm(true);
    }

    function startCreate() {
        setEditing(null);
        setImageUrl(null);
        setShowForm(true);
    }

    async function move(idx: number, dir: -1 | 1) {
        const target = idx + dir;
        if (target < 0 || target >= sections.length) return;
        const next = [...sections];
        [next[idx], next[target]] = [next[target], next[idx]];
        setSections(next);
        await fetch("/api/admin/about/reorder", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ids: next.map(s => s.id) }),
        });
    }

    if (loading) return <p className="text-muted-foreground">Loading...</p>;

    return (
        <div className="max-w-4xl">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <History className="w-7 h-7 text-primary" /> About Us — Timeline
                    </h1>
                    <p className="text-sm text-muted-foreground mt-0.5">Add milestones, archives and dated events that appear on the public About page.</p>
                </div>
                <div className="flex gap-2">
                    <Link href="/admin/settings"><Button variant="outline">Edit intro / mission</Button></Link>
                    <Button onClick={startCreate} className="gap-2"><Plus className="w-4 h-4" /> Add Entry</Button>
                </div>
            </div>

            {showForm && (
                <form onSubmit={handleSubmit} className="border rounded-2xl p-6 mb-8 space-y-4 bg-card">
                    <div className="flex justify-between items-center">
                        <h2 className="text-lg font-semibold">{editing ? "Edit entry" : "New timeline entry"}</h2>
                        <button type="button" onClick={() => { setShowForm(false); setEditing(null); setImageUrl(null); }} className="text-muted-foreground hover:text-foreground">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="grid md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="year">Year</Label>
                            <Input id="year" name="year" type="number" min="1900" defaultValue={editing?.year ?? ""} placeholder="2014" />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="dateLabel">Date label (optional)</Label>
                            <Input id="dateLabel" name="dateLabel" defaultValue={editing?.dateLabel || ""} placeholder="e.g. Summer 2018, October" />
                        </div>
                        <div className="space-y-2 md:col-span-3">
                            <Label htmlFor="title">Title *</Label>
                            <Input id="title" name="title" defaultValue={editing?.title} required placeholder="e.g. Group founded" />
                        </div>
                        <div className="space-y-2 md:col-span-3">
                            <Label htmlFor="description">Description</Label>
                            <textarea id="description" name="description" defaultValue={editing?.description || ""} className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="What happened, who was involved..." />
                        </div>
                        <div className="space-y-2 md:col-span-3">
                            <Label>Image (optional)</Label>
                            <div className="flex items-center gap-3">
                                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                                <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="gap-2">
                                    <Upload className="w-4 h-4" /> {uploading ? "Uploading..." : imageUrl ? "Change image" : "Upload image"}
                                </Button>
                                {imageUrl && (
                                    <Button type="button" variant="ghost" size="sm" onClick={() => setImageUrl(null)} className="text-destructive">
                                        <X className="w-4 h-4" />
                                    </Button>
                                )}
                            </div>
                            {imageUrl && (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img src={imageUrl} alt="Preview" className="w-48 h-32 object-cover rounded-md border mt-2" />
                            )}
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <Button type="submit">{editing ? "Update" : "Create"}</Button>
                        <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditing(null); setImageUrl(null); }}>Cancel</Button>
                    </div>
                </form>
            )}

            {sections.length === 0 ? (
                <div className="text-center py-20 border border-dashed rounded-2xl bg-muted/30">
                    <History className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                    <p className="text-muted-foreground mb-4">No timeline entries yet. Add the first milestone to bring the About page to life.</p>
                    <Button onClick={startCreate} className="gap-2"><Plus className="w-4 h-4" /> Add Entry</Button>
                </div>
            ) : (
                <div className="space-y-3">
                    {sections.map((s, idx) => (
                        <div key={s.id} className="border rounded-2xl bg-card p-4 flex items-start gap-4">
                            <div className="flex flex-col gap-1 shrink-0">
                                <button onClick={() => move(idx, -1)} disabled={idx === 0} className="w-7 h-7 rounded-md border bg-background hover:bg-muted disabled:opacity-30 flex items-center justify-center">
                                    <ArrowUp className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => move(idx, 1)} disabled={idx === sections.length - 1} className="w-7 h-7 rounded-md border bg-background hover:bg-muted disabled:opacity-30 flex items-center justify-center">
                                    <ArrowDown className="w-3.5 h-3.5" />
                                </button>
                            </div>
                            {s.imageUrl && (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img src={s.imageUrl} alt={s.title} className="w-24 h-16 object-cover rounded-lg shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 text-xs text-primary font-bold mb-0.5">
                                    {s.year && <span>{s.year}</span>}
                                    {s.dateLabel && <span className="text-muted-foreground font-normal">• {s.dateLabel}</span>}
                                </div>
                                <h3 className="font-bold text-base mb-0.5">{s.title}</h3>
                                {s.description && <p className="text-sm text-muted-foreground line-clamp-2">{s.description}</p>}
                            </div>
                            <div className="flex gap-1 shrink-0">
                                <Button variant="ghost" size="sm" onClick={() => startEdit(s)}><Pencil className="w-4 h-4" /></Button>
                                <Button variant="ghost" size="sm" onClick={() => handleDelete(s.id)} className="text-destructive"><Trash2 className="w-4 h-4" /></Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
