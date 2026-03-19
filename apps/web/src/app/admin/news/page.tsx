"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect, useRef } from "react";
import { Trash2, Plus, Pencil, Upload, X } from "lucide-react";
import Image from "next/image";

type NewsArticle = {
    id: string;
    title: string;
    summary: string;
    content: string | null;
    imageUrl: string | null;
    published: boolean;
    date: string;
};

export default function AdminNewsPage() {
    const [articles, setArticles] = useState<NewsArticle[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState<NewsArticle | null>(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    async function fetchData() {
        const res = await fetch("/api/news");
        setArticles(await res.json());
        setLoading(false);
    }

    useEffect(() => { fetchData(); }, []);

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
        const fd = new FormData(e.currentTarget);

        const body = {
            title: fd.get("title"),
            summary: fd.get("summary"),
            content: fd.get("content") || null,
            imageUrl,
            published: fd.get("published") === "on",
            date: fd.get("date") || null,
        };

        if (editing) {
            await fetch(`/api/news/${editing.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        } else {
            await fetch("/api/news", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        }

        setShowForm(false);
        setEditing(null);
        setImageUrl(null);
        fetchData();
    }

    async function handleDelete(id: string) {
        if (!confirm("Delete this news article?")) return;
        await fetch(`/api/news/${id}`, { method: "DELETE" });
        fetchData();
    }

    function startEdit(a: NewsArticle) {
        setEditing(a);
        setImageUrl(a.imageUrl);
        setShowForm(true);
    }

    if (loading) return <p className="text-muted-foreground">Loading...</p>;

    return (
        <div>
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">News</h1>
                <Button onClick={() => { setEditing(null); setImageUrl(null); setShowForm(!showForm); }} className="gap-2">
                    <Plus className="w-4 h-4" /> Add Article
                </Button>
            </div>

            {showForm && (
                <form onSubmit={handleSubmit} className="border rounded-lg p-6 mb-8 space-y-4 bg-card">
                    <h2 className="text-lg font-semibold">{editing ? "Edit Article" : "New Article"}</h2>
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="title">Title *</Label>
                            <Input id="title" name="title" defaultValue={editing?.title} required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="date">Date *</Label>
                            <Input id="date" name="date" type="date" defaultValue={editing ? new Date(editing.date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)} required />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="summary">Summary *</Label>
                        <textarea id="summary" name="summary" defaultValue={editing?.summary} required className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="Short description shown on cards" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="content">Full Content (optional)</Label>
                        <textarea id="content" name="content" defaultValue={editing?.content || ""} className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="Longer article content..." />
                    </div>
                    <div className="space-y-2">
                        <Label>Image</Label>
                        <div className="flex items-center gap-3">
                            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                            <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="gap-2">
                                <Upload className="w-4 h-4" /> {uploading ? "Uploading..." : "Upload"}
                            </Button>
                            {imageUrl && <Button type="button" variant="ghost" size="sm" onClick={() => setImageUrl(null)} className="text-destructive"><X className="w-4 h-4" /></Button>}
                        </div>
                        {imageUrl && <div className="mt-2 relative w-40 h-24 rounded-md overflow-hidden border"><Image src={imageUrl} alt="Preview" fill className="object-cover" unoptimized /></div>}
                    </div>
                    <div className="flex items-center gap-2">
                        <input type="checkbox" id="published" name="published" defaultChecked={editing?.published ?? true} className="accent-primary" />
                        <Label htmlFor="published">Published</Label>
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
                            <th className="text-left p-3 text-sm font-medium">Image</th>
                            <th className="text-left p-3 text-sm font-medium">Title</th>
                            <th className="text-left p-3 text-sm font-medium">Date</th>
                            <th className="text-left p-3 text-sm font-medium">Published</th>
                            <th className="text-right p-3 text-sm font-medium">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {articles.length === 0 ? (
                            <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No news articles yet</td></tr>
                        ) : articles.map((a) => (
                            <tr key={a.id} className="border-t">
                                <td className="p-3">
                                    {a.imageUrl ? (
                                        <div className="relative w-16 h-10 rounded overflow-hidden"><Image src={a.imageUrl} alt={a.title} fill className="object-cover" unoptimized /></div>
                                    ) : <div className="w-16 h-10 rounded bg-muted flex items-center justify-center text-xs text-muted-foreground">-</div>}
                                </td>
                                <td className="p-3 text-sm font-medium">{a.title}</td>
                                <td className="p-3 text-sm text-muted-foreground">{new Date(a.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</td>
                                <td className="p-3 text-sm">{a.published ? <span className="text-primary font-medium">Yes</span> : "No"}</td>
                                <td className="p-3 text-right">
                                    <Button variant="ghost" size="sm" onClick={() => startEdit(a)}><Pencil className="w-4 h-4" /></Button>
                                    <Button variant="ghost" size="sm" onClick={() => handleDelete(a.id)} className="text-destructive hover:text-destructive"><Trash2 className="w-4 h-4" /></Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
