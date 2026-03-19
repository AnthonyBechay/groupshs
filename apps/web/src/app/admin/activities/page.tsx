"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect, useRef } from "react";
import { Trash2, Plus, Pencil, Upload, X } from "lucide-react";
import Image from "next/image";

type Activity = {
    id: string;
    title: string;
    description: string;
    date: string;
    endDate: string | null;
    location: string | null;
    imageUrl: string | null;
    isUpcoming: boolean;
    year: number;
};

export default function AdminActivitiesPage() {
    const [activities, setActivities] = useState<Activity[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState<Activity | null>(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    async function fetchActivities() {
        const res = await fetch("/api/activities");
        const data = await res.json();
        setActivities(data);
        setLoading(false);
    }

    useEffect(() => { fetchActivities(); }, []);

    async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await fetch("/api/upload", { method: "POST", body: formData });
            if (!res.ok) {
                const data = await res.json();
                alert(data.error || "Upload failed");
                return;
            }
            const { url } = await res.json();
            setImageUrl(url);
        } catch {
            alert("Upload failed");
        } finally {
            setUploading(false);
        }
    }

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const form = e.currentTarget;
        const formData = new FormData(form);

        const body = {
            title: formData.get("title"),
            description: formData.get("description"),
            date: formData.get("date"),
            endDate: formData.get("endDate") || null,
            location: formData.get("location") || null,
            imageUrl: imageUrl,
            isUpcoming: formData.get("isUpcoming") === "on",
            year: parseInt(formData.get("year") as string),
        };

        if (editing) {
            await fetch(`/api/activities/${editing.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
        } else {
            await fetch("/api/activities", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
        }

        setShowForm(false);
        setEditing(null);
        setImageUrl(null);
        fetchActivities();
    }

    async function handleDelete(id: string) {
        if (!confirm("Are you sure you want to delete this activity?")) return;
        await fetch(`/api/activities/${id}`, { method: "DELETE" });
        fetchActivities();
    }

    function startEdit(activity: Activity) {
        setEditing(activity);
        setImageUrl(activity.imageUrl);
        setShowForm(true);
    }

    function openNew() {
        setEditing(null);
        setImageUrl(null);
        setShowForm(!showForm);
    }

    if (loading) return <p className="text-muted-foreground">Loading...</p>;

    return (
        <div>
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">Activities</h1>
                <Button onClick={openNew} className="gap-2">
                    <Plus className="w-4 h-4" /> Add Activity
                </Button>
            </div>

            {showForm && (
                <form onSubmit={handleSubmit} className="border rounded-lg p-6 mb-8 space-y-4 bg-card">
                    <h2 className="text-lg font-semibold mb-2">{editing ? "Edit Activity" : "New Activity"}</h2>
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="title">Title *</Label>
                            <Input id="title" name="title" defaultValue={editing?.title} required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="location">Location</Label>
                            <Input id="location" name="location" defaultValue={editing?.location || ""} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="date">Start Date *</Label>
                            <Input id="date" name="date" defaultValue={editing?.date} required placeholder="e.g. Dec 27, 2026" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="endDate">End Date</Label>
                            <Input id="endDate" name="endDate" defaultValue={editing?.endDate || ""} placeholder="e.g. Dec 30, 2026" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="year">Year *</Label>
                            <Input id="year" name="year" type="number" defaultValue={editing?.year || new Date().getFullYear()} required />
                        </div>
                        <div className="space-y-2">
                            <Label>Activity Image</Label>
                            <div className="flex items-center gap-3">
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp,image/gif"
                                    onChange={handleImageUpload}
                                    className="hidden"
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={uploading}
                                    className="gap-2"
                                >
                                    <Upload className="w-4 h-4" />
                                    {uploading ? "Uploading..." : "Upload Image"}
                                </Button>
                                {imageUrl && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setImageUrl(null)}
                                        className="text-destructive hover:text-destructive"
                                    >
                                        <X className="w-4 h-4" />
                                    </Button>
                                )}
                            </div>
                            {imageUrl && (
                                <div className="mt-2 relative w-40 h-24 rounded-md overflow-hidden border">
                                    <Image src={imageUrl} alt="Preview" fill className="object-cover" unoptimized />
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="description">Description *</Label>
                        <textarea
                            id="description"
                            name="description"
                            defaultValue={editing?.description}
                            required
                            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <input type="checkbox" id="isUpcoming" name="isUpcoming" defaultChecked={editing?.isUpcoming ?? true} className="accent-primary" />
                        <Label htmlFor="isUpcoming">Upcoming activity</Label>
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
                            <th className="text-left p-3 text-sm font-medium">Location</th>
                            <th className="text-left p-3 text-sm font-medium">Year</th>
                            <th className="text-left p-3 text-sm font-medium">Upcoming</th>
                            <th className="text-right p-3 text-sm font-medium">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {activities.length === 0 ? (
                            <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">No activities yet</td></tr>
                        ) : activities.map((a) => (
                            <tr key={a.id} className="border-t">
                                <td className="p-3">
                                    {a.imageUrl ? (
                                        <div className="relative w-16 h-10 rounded overflow-hidden">
                                            <Image src={a.imageUrl} alt={a.title} fill className="object-cover" unoptimized />
                                        </div>
                                    ) : (
                                        <div className="w-16 h-10 rounded bg-muted flex items-center justify-center text-muted-foreground text-xs">—</div>
                                    )}
                                </td>
                                <td className="p-3 text-sm font-medium">{a.title}</td>
                                <td className="p-3 text-sm text-muted-foreground">{a.date}{a.endDate ? ` - ${a.endDate}` : ""}</td>
                                <td className="p-3 text-sm text-muted-foreground">{a.location || "—"}</td>
                                <td className="p-3 text-sm text-muted-foreground">{a.year}</td>
                                <td className="p-3 text-sm">{a.isUpcoming ? <span className="text-primary font-medium">Yes</span> : "No"}</td>
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
