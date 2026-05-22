"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { Trash2, Plus, Pencil, Link2 } from "lucide-react";

const PLATFORMS = [
    { value: "instagram", label: "Instagram" },
    { value: "youtube", label: "YouTube" },
    { value: "anghami", label: "Anghami" },
    { value: "facebook", label: "Facebook" },
    { value: "tiktok", label: "TikTok" },
    { value: "twitter", label: "X / Twitter" },
    { value: "whatsapp", label: "WhatsApp" },
    { value: "linkedin", label: "LinkedIn" },
];

type SocialLink = {
    id: string;
    platform: string;
    url: string;
    sortOrder: number;
};

export default function AdminSocialLinksPage() {
    const [links, setLinks] = useState<SocialLink[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState<SocialLink | null>(null);

    async function fetchLinks() {
        const res = await fetch("/api/admin/social-links");
        setLinks(await res.json());
        setLoading(false);
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { fetchLinks(); }, []);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const body = {
            platform: fd.get("platform"),
            url: fd.get("url"),
        };

        if (editing) {
            await fetch(`/api/admin/social-links/${editing.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
        } else {
            await fetch("/api/admin/social-links", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
        }

        setShowForm(false);
        setEditing(null);
        fetchLinks();
    }

    async function handleDelete(id: string) {
        if (!confirm("Delete this social link?")) return;
        await fetch(`/api/admin/social-links/${id}`, { method: "DELETE" });
        fetchLinks();
    }

    function startEdit(link: SocialLink) {
        setEditing(link);
        setShowForm(true);
    }

    if (loading) return <p className="text-muted-foreground">Loading...</p>;

    return (
        <div>
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold">Social Media Links</h1>
                    <p className="text-sm text-muted-foreground mt-1">Social icons displayed on the website</p>
                </div>
                <Button onClick={() => { setEditing(null); setShowForm(!showForm); }} className="gap-2">
                    <Plus className="w-4 h-4" /> Add Link
                </Button>
            </div>

            {showForm && (
                <form onSubmit={handleSubmit} className="border rounded-lg p-6 mb-8 space-y-4 bg-card">
                    <h2 className="text-lg font-semibold">{editing ? "Edit Social Link" : "New Social Link"}</h2>
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="platform">Platform *</Label>
                            <select id="platform" name="platform" defaultValue={editing?.platform || ""} required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                                <option value="">Select platform...</option>
                                {PLATFORMS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="url">URL *</Label>
                            <Input id="url" name="url" type="url" placeholder="https://..." defaultValue={editing?.url || ""} required />
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button type="submit">{editing ? "Update" : "Create"}</Button>
                        <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditing(null); }}>Cancel</Button>
                    </div>
                </form>
            )}

            {links.length === 0 ? (
                <div className="text-center py-20 border border-dashed rounded-2xl bg-muted/30">
                    <Link2 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                    <p className="text-muted-foreground mb-4">No social links yet. Add links for Instagram, YouTube, Anghami, etc.</p>
                </div>
            ) : (
                <div className="border rounded-lg overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-muted/50">
                            <tr>
                                <th className="text-left p-3 text-sm font-medium">Platform</th>
                                <th className="text-left p-3 text-sm font-medium">URL</th>
                                <th className="text-right p-3 text-sm font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {links.map((link) => (
                                <tr key={link.id} className="border-t">
                                    <td className="p-3 text-sm">
                                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary capitalize">{link.platform}</span>
                                    </td>
                                    <td className="p-3 text-sm text-muted-foreground">
                                        <a href={link.url} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">{link.url}</a>
                                    </td>
                                    <td className="p-3 text-right">
                                        <Button variant="ghost" size="sm" onClick={() => startEdit(link)}><Pencil className="w-4 h-4" /></Button>
                                        <Button variant="ghost" size="sm" onClick={() => handleDelete(link.id)} className="text-destructive hover:text-destructive"><Trash2 className="w-4 h-4" /></Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
