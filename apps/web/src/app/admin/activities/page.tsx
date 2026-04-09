"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect, useRef } from "react";
import { Trash2, Plus, Pencil, Upload, X } from "lucide-react";
import { ACTIVITY_TYPES } from "@/lib/scout-config";

type Unit = { id: string; name: string; unitType: string };
type Activity = {
    id: string;
    title: string;
    description: string;
    unitId: string;
    unit: { name: string; unitType: string };
    activityType: string;
    startDate: string;
    endDate: string | null;
    pickupTime: string | null;
    dropoffTime: string | null;
    pickupLocation: string | null;
    dropoffLocation: string | null;
    location: string | null;
    imageUrl: string | null;
    isUpcoming: boolean;
    year: number;
};

export default function AdminActivitiesPage() {
    const [activities, setActivities] = useState<Activity[]>([]);
    const [units, setUnits] = useState<Unit[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState<Activity | null>(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    async function fetchData() {
        const [actRes, unitRes] = await Promise.all([
            fetch("/api/activities"),
            fetch("/api/admin/units"),
        ]);
        setActivities(await actRes.json());
        setUnits(await unitRes.json());
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
            const data = await res.json();
            if (!res.ok) {
                alert(data.error || "Upload failed");
                return;
            }
            setImageUrl(data.url);
        } catch {
            alert("Upload failed");
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    }

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);

        const body = {
            title: fd.get("title"),
            description: fd.get("description"),
            unitId: fd.get("unitId"),
            activityType: fd.get("activityType"),
            startDate: fd.get("startDate"),
            endDate: fd.get("endDate") || null,
            pickupTime: fd.get("pickupTime") || null,
            dropoffTime: fd.get("dropoffTime") || null,
            pickupLocation: fd.get("pickupLocation") || null,
            dropoffLocation: fd.get("dropoffLocation") || null,
            location: fd.get("location") || null,
            imageUrl,
            isUpcoming: fd.get("isUpcoming") === "on",
            year: parseInt(fd.get("year") as string),
        };

        if (editing) {
            await fetch(`/api/activities/${editing.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        } else {
            await fetch("/api/activities", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        }

        setShowForm(false);
        setEditing(null);
        setImageUrl(null);
        fetchData();
    }

    async function handleDelete(id: string) {
        if (!confirm("Delete this activity?")) return;
        await fetch(`/api/activities/${id}`, { method: "DELETE" });
        fetchData();
    }

    function startEdit(a: Activity) {
        setEditing(a);
        setImageUrl(a.imageUrl);
        setShowForm(true);
    }

    function formatDate(d: string) {
        return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    }

    if (loading) return <p className="text-muted-foreground">Loading...</p>;

    return (
        <div>
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">Activities</h1>
                <Button onClick={() => { setEditing(null); setImageUrl(null); setShowForm(!showForm); }} className="gap-2">
                    <Plus className="w-4 h-4" /> Add Activity
                </Button>
            </div>

            {showForm && (
                <form onSubmit={handleSubmit} className="border rounded-lg p-6 mb-8 space-y-4 bg-card">
                    <h2 className="text-lg font-semibold">{editing ? "Edit Activity" : "New Activity"}</h2>
                    <div className="grid md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="title">Title *</Label>
                            <Input id="title" name="title" defaultValue={editing?.title} required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="unitId">Unit *</Label>
                            <select id="unitId" name="unitId" defaultValue={editing?.unitId || ""} required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                                <option value="">Select unit...</option>
                                {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="activityType">Type *</Label>
                            <select id="activityType" name="activityType" defaultValue={editing?.activityType || "OTHER"} required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                                {ACTIVITY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="startDate">Start Date *</Label>
                            <Input id="startDate" name="startDate" type="datetime-local" defaultValue={editing ? new Date(editing.startDate).toISOString().slice(0, 16) : ""} required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="endDate">End Date</Label>
                            <Input id="endDate" name="endDate" type="datetime-local" defaultValue={editing?.endDate ? new Date(editing.endDate).toISOString().slice(0, 16) : ""} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="year">Year *</Label>
                            <Input id="year" name="year" type="number" defaultValue={editing?.year || new Date().getFullYear()} required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="dropoffTime">Dropoff Time (Start)</Label>
                            <Input id="dropoffTime" name="dropoffTime" type="time" defaultValue={editing?.dropoffTime || ""} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="pickupTime">Pickup Time (End)</Label>
                            <Input id="pickupTime" name="pickupTime" type="time" defaultValue={editing?.pickupTime || ""} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="location">Location</Label>
                            <Input id="location" name="location" defaultValue={editing?.location || ""} placeholder="Main location" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="pickupLocation">Pickup Location</Label>
                            <Input id="pickupLocation" name="pickupLocation" defaultValue={editing?.pickupLocation || ""} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="dropoffLocation">Dropoff Location</Label>
                            <Input id="dropoffLocation" name="dropoffLocation" defaultValue={editing?.dropoffLocation || ""} />
                        </div>
                        <div className="space-y-2">
                            <Label>Image</Label>
                            <div className="flex items-center gap-3">
                                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                                <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="gap-2">
                                    <Upload className="w-4 h-4" /> {uploading ? "Uploading..." : "Upload"}
                                </Button>
                                {imageUrl && (
                                    <Button type="button" variant="ghost" size="sm" onClick={() => setImageUrl(null)} className="text-destructive">
                                        <X className="w-4 h-4" />
                                    </Button>
                                )}
                            </div>
                            {imageUrl && (
                                <div className="mt-2">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={imageUrl} alt="Preview" className="w-40 h-24 object-cover rounded-md border" />
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="description">Description *</Label>
                        <textarea id="description" name="description" defaultValue={editing?.description} required className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
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

            <div className="border rounded-lg overflow-hidden overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-muted/50">
                        <tr>
                            <th className="text-left p-3 text-sm font-medium">Image</th>
                            <th className="text-left p-3 text-sm font-medium">Title</th>
                            <th className="text-left p-3 text-sm font-medium">Unit</th>
                            <th className="text-left p-3 text-sm font-medium">Type</th>
                            <th className="text-left p-3 text-sm font-medium">Date</th>
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
                                        /* eslint-disable-next-line @next/next/no-img-element */
                                        <img src={a.imageUrl} alt={a.title} className="w-16 h-10 object-cover rounded" />
                                    ) : <div className="w-16 h-10 rounded bg-muted flex items-center justify-center text-xs text-muted-foreground">-</div>}
                                </td>
                                <td className="p-3 text-sm font-medium">{a.title}</td>
                                <td className="p-3 text-sm"><span className="px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">{a.unit.name}</span></td>
                                <td className="p-3 text-sm text-muted-foreground">{ACTIVITY_TYPES.find(t => t.value === a.activityType)?.label || a.activityType}</td>
                                <td className="p-3 text-sm text-muted-foreground">{formatDate(a.startDate)}{a.endDate ? ` - ${formatDate(a.endDate)}` : ""}</td>
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
