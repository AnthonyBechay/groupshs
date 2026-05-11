"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect, useRef, useMemo } from "react";
import { Trash2, Plus, Pencil, Upload, X, Eye, EyeOff, MapPin, Filter, Search, ClipboardCheck } from "lucide-react";
import Link from "next/link";
import { ACTIVITY_TYPES } from "@/lib/scout-config";

type Unit = { id: string; name: string; unitType: string };
type Activity = {
    id: string;
    title: string;
    description: string;
    whatToBring: string | null;
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
    pickupLocationUrl: string | null;
    dropoffLocationUrl: string | null;
    locationUrl: string | null;
    imageUrl: string | null;
    isUpcoming: boolean;
    hidden: boolean;
    year: number;
    totalDays: number | null;
};

type DateFilter = "this-year" | "all" | "upcoming" | "past" | number;

export default function AdminActivitiesPage() {
    const [activities, setActivities] = useState<Activity[]>([]);
    const [units, setUnits] = useState<Unit[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState<Activity | null>(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Filters
    const currentYear = new Date().getFullYear();
    const [dateFilter, setDateFilter] = useState<DateFilter>("this-year");
    const [unitFilter, setUnitFilter] = useState<string>("ALL");
    const [search, setSearch] = useState("");

    async function fetchData() {
        const [actRes, unitRes] = await Promise.all([
            fetch("/api/activities?includeHidden=true"),
            fetch("/api/admin/units"),
        ]);
        setActivities(await actRes.json());
        setUnits(await unitRes.json());
        setLoading(false);
    }

    useEffect(() => { fetchData(); }, []);

    const availableYears = useMemo(() => {
        const years = new Set<number>();
        activities.forEach(a => years.add(a.year));
        return Array.from(years).sort((a, b) => b - a);
    }, [activities]);

    const filtered = useMemo(() => {
        const now = new Date();
        return activities.filter(a => {
            if (unitFilter !== "ALL" && a.unitId !== unitFilter) return false;
            if (search.trim() && !a.title.toLowerCase().includes(search.toLowerCase())) return false;

            if (dateFilter === "this-year") return a.year === currentYear;
            if (dateFilter === "all") return true;
            if (dateFilter === "upcoming") {
                const end = a.endDate ? new Date(a.endDate) : new Date(a.startDate);
                return end >= now;
            }
            if (dateFilter === "past") {
                const end = a.endDate ? new Date(a.endDate) : new Date(a.startDate);
                return end < now;
            }
            if (typeof dateFilter === "number") return a.year === dateFilter;
            return true;
        });
    }, [activities, unitFilter, search, dateFilter, currentYear]);

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
            whatToBring: fd.get("whatToBring") || null,
            unitId: fd.get("unitId"),
            activityType: fd.get("activityType"),
            startDate: fd.get("startDate"),
            endDate: fd.get("endDate") || null,
            pickupTime: fd.get("pickupTime") || null,
            dropoffTime: fd.get("dropoffTime") || null,
            pickupLocation: fd.get("pickupLocation") || null,
            dropoffLocation: fd.get("dropoffLocation") || null,
            location: fd.get("location") || null,
            pickupLocationUrl: fd.get("pickupLocationUrl") || null,
            dropoffLocationUrl: fd.get("dropoffLocationUrl") || null,
            locationUrl: fd.get("locationUrl") || null,
            imageUrl,
            hidden: fd.get("hidden") === "on",
            year: parseInt(fd.get("year") as string),
            totalDays: fd.get("totalDays") ? parseInt(fd.get("totalDays") as string) : null,
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

    async function toggleHidden(a: Activity) {
        await fetch(`/api/activities/${a.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ hidden: !a.hidden }),
        });
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

    function isUpcomingByDate(a: Activity): boolean {
        const end = a.endDate ? new Date(a.endDate) : new Date(a.startDate);
        return end >= new Date();
    }

    if (loading) return <p className="text-muted-foreground">Loading...</p>;

    return (
        <div>
            <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
                <div>
                    <h1 className="text-3xl font-bold">Activities</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">{filtered.length} of {activities.length} activities</p>
                </div>
                <Button onClick={() => { setEditing(null); setImageUrl(null); setShowForm(!showForm); }} className="gap-2">
                    <Plus className="w-4 h-4" /> Add Activity
                </Button>
            </div>

            {/* Filters */}
            <div className="border rounded-xl bg-card p-4 mb-6 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Filter className="w-4 h-4" /> Filters
                </div>
                <div className="flex flex-wrap gap-2">
                    {([
                        { key: "this-year" as const, label: `${currentYear} (this year)` },
                        { key: "upcoming" as const, label: "Upcoming" },
                        { key: "past" as const, label: "Past" },
                        { key: "all" as const, label: "All time" },
                    ]).map(p => (
                        <button
                            key={p.key}
                            onClick={() => setDateFilter(p.key)}
                            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                                dateFilter === p.key
                                    ? "bg-primary text-white shadow-sm"
                                    : "bg-muted text-muted-foreground hover:bg-muted/70"
                            }`}
                        >
                            {p.label}
                        </button>
                    ))}
                    {availableYears.filter(y => y !== currentYear).map(y => (
                        <button
                            key={y}
                            onClick={() => setDateFilter(y)}
                            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                                dateFilter === y
                                    ? "bg-primary text-white shadow-sm"
                                    : "bg-muted text-muted-foreground hover:bg-muted/70"
                            }`}
                        >
                            {y}
                        </button>
                    ))}
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                    <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Search by title..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                    <select
                        value={unitFilter}
                        onChange={(e) => setUnitFilter(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                        <option value="ALL">All units</option>
                        {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                </div>
            </div>

            {showForm && (
                <form onSubmit={handleSubmit} className="border rounded-xl p-6 mb-8 space-y-5 bg-card">
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
                            <Input id="year" name="year" type="number" defaultValue={editing?.year || currentYear} required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="totalDays">Total days (for partial attendance)</Label>
                            <Input id="totalDays" name="totalDays" type="number" min="1" defaultValue={editing?.totalDays || ""} placeholder="e.g. 3" />
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

                    {/* Locations with map URLs */}
                    <div className="space-y-3 border-t pt-4">
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                            <MapPin className="w-4 h-4" /> Locations
                        </h3>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="location">Camp / main location</Label>
                                <Input id="location" name="location" defaultValue={editing?.location || ""} placeholder="e.g. Bois de Boulogne" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="locationUrl">Google Maps URL</Label>
                                <Input id="locationUrl" name="locationUrl" type="url" defaultValue={editing?.locationUrl || ""} placeholder="https://maps.google.com/..." />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="dropoffLocation">Dropoff (start) location</Label>
                                <Input id="dropoffLocation" name="dropoffLocation" defaultValue={editing?.dropoffLocation || ""} placeholder="Where families drop off" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="dropoffLocationUrl">Dropoff Google Maps URL</Label>
                                <Input id="dropoffLocationUrl" name="dropoffLocationUrl" type="url" defaultValue={editing?.dropoffLocationUrl || ""} placeholder="https://maps.google.com/..." />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="pickupLocation">Pickup (end) location</Label>
                                <Input id="pickupLocation" name="pickupLocation" defaultValue={editing?.pickupLocation || ""} placeholder="Where families pick up" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="pickupLocationUrl">Pickup Google Maps URL</Label>
                                <Input id="pickupLocationUrl" name="pickupLocationUrl" type="url" defaultValue={editing?.pickupLocationUrl || ""} placeholder="https://maps.google.com/..." />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Description *</Label>
                        <textarea id="description" name="description" defaultValue={editing?.description} required className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="whatToBring">What to bring</Label>
                        <textarea
                            id="whatToBring"
                            name="whatToBring"
                            defaultValue={editing?.whatToBring || ""}
                            placeholder="e.g.&#10;- Sleeping bag&#10;- Hiking boots&#10;- Water bottle&#10;- Warm jacket"
                            className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
                        />
                        <p className="text-xs text-muted-foreground">List the items members should bring. One per line.</p>
                    </div>

                    <div className="flex items-center gap-2 rounded-lg bg-muted/30 border p-3">
                        <input type="checkbox" id="hidden" name="hidden" defaultChecked={editing?.hidden ?? false} className="accent-primary" />
                        <Label htmlFor="hidden" className="cursor-pointer">Hide from public site</Label>
                        <span className="text-xs text-muted-foreground ml-2">Whether the activity is upcoming is determined automatically by date.</span>
                    </div>
                    <div className="flex gap-2">
                        <Button type="submit">{editing ? "Update" : "Create"}</Button>
                        <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditing(null); setImageUrl(null); }}>Cancel</Button>
                    </div>
                </form>
            )}

            <div className="border rounded-xl overflow-hidden overflow-x-auto bg-card">
                <table className="w-full">
                    <thead className="bg-muted/50">
                        <tr>
                            <th className="text-left p-3 text-sm font-medium">Image</th>
                            <th className="text-left p-3 text-sm font-medium">Title</th>
                            <th className="text-left p-3 text-sm font-medium">Unit</th>
                            <th className="text-left p-3 text-sm font-medium">Type</th>
                            <th className="text-left p-3 text-sm font-medium">Date</th>
                            <th className="text-left p-3 text-sm font-medium">Status</th>
                            <th className="text-right p-3 text-sm font-medium">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length === 0 ? (
                            <tr><td colSpan={7} className="p-12 text-center text-muted-foreground">No activities match your filters</td></tr>
                        ) : filtered.map((a) => (
                            <tr key={a.id} className={`border-t ${a.hidden ? "bg-muted/20 opacity-70" : ""}`}>
                                <td className="p-3">
                                    {a.imageUrl ? (
                                        /* eslint-disable-next-line @next/next/no-img-element */
                                        <img src={a.imageUrl} alt={a.title} className="w-16 h-10 object-cover rounded" />
                                    ) : <div className="w-16 h-10 rounded bg-muted flex items-center justify-center text-xs text-muted-foreground">-</div>}
                                </td>
                                <td className="p-3 text-sm font-medium">{a.title}</td>
                                <td className="p-3 text-sm"><span className="px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">{a.unit.name}</span></td>
                                <td className="p-3 text-sm text-muted-foreground">{ACTIVITY_TYPES.find(t => t.value === a.activityType)?.label || a.activityType}</td>
                                <td className="p-3 text-sm text-muted-foreground whitespace-nowrap">{formatDate(a.startDate)}{a.endDate ? ` - ${formatDate(a.endDate)}` : ""}</td>
                                <td className="p-3 text-sm">
                                    <div className="flex flex-col gap-1">
                                        {isUpcomingByDate(a) ? (
                                            <span className="inline-flex w-fit items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                Upcoming
                                            </span>
                                        ) : (
                                            <span className="inline-flex w-fit px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">Past</span>
                                        )}
                                        {a.hidden && (
                                            <span className="inline-flex w-fit items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                                                <EyeOff className="w-3 h-3" /> Hidden
                                            </span>
                                        )}
                                    </div>
                                </td>
                                <td className="p-3 text-right whitespace-nowrap">
                                    <Link href={`/admin/activities/${a.id}/attendance`} title="Attendance">
                                        <Button variant="ghost" size="sm" className="text-primary hover:text-primary"><ClipboardCheck className="w-4 h-4" /></Button>
                                    </Link>
                                    <Button variant="ghost" size="sm" onClick={() => toggleHidden(a)} title={a.hidden ? "Show on site" : "Hide from site"}>
                                        {a.hidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                    </Button>
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
