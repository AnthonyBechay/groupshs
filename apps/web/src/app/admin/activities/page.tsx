"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Trash2, Plus, Pencil, Upload, X, Eye, EyeOff, MapPin, Filter, Search, ClipboardCheck, FileText, ChevronDown } from "lucide-react";
import Link from "next/link";
import { ACTIVITY_TYPES } from "@/lib/scout-config";
import { useUrlState } from "@/hooks/use-url-state";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { rememberActivitiesList } from "@/lib/activities-list";
import { ActivityCoverFallback } from "@/components/activity-cover-fallback";

type Unit = { id: string; name: string; unitType: string; imageUrl: string | null };
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
    theme: string | null;
    fee: string | null;
};

type DateFilter = "this-year" | "all" | "upcoming" | "past" | number;

export default function AdminActivitiesPage() {
    const [activities, setActivities] = useState<Activity[]>([]);
    const [units, setUnits] = useState<Unit[]>([]);
    const [loading, setLoading] = useState(true);
    // The form opened from this page: "new", or the activity being edited.
    const [opened, setOpened] = useState<Activity | "new" | null>(null);

    // Filters live in the URL: this page links out to Attendance and Circulars,
    // and coming Back used to reset them to their defaults.
    const currentYear = new Date().getFullYear();
    const { params, setParams } = useUrlState();
    const whenParam = params.get("when");
    const dateFilter: DateFilter =
        whenParam === "all" || whenParam === "upcoming" || whenParam === "past" ? whenParam
            : whenParam && /^\d{4}$/.test(whenParam) ? Number(whenParam)
            : "this-year";
    const setDateFilter = (next: DateFilter) =>
        setParams({ when: next === "this-year" ? null : String(next) });
    const unitFilter = params.get("unit") ?? "ALL";
    const setUnitFilter = (next: string) => setParams({ unit: next === "ALL" ? null : next });
    // Hidden activities are drafts or retired ones; they clutter the list, so
    // they are only shown on request.
    const showHidden = params.get("hidden") === "1";
    const [search, setSearch] = useState("");

    // `?edit=<id>` opens that activity's form directly — the circulars page
    // links here so a missing fee can be fixed where it belongs. `return=1`
    // means "go back where you came from when done".
    const editParam = params.get("edit");
    const linked = editParam ? activities.find(a => a.id === editParam) ?? null : null;
    const returning = opened === null && linked !== null && params.get("return") === "1";
    const formTarget: Activity | "new" | null = opened ?? linked;

    const fetchData = useCallback(async () => {
        const [actRes, unitRes] = await Promise.all([
            fetch("/api/activities?includeHidden=true"),
            fetch("/api/admin/units"),
        ]);
        setActivities(await actRes.json());
        setUnits(await unitRes.json());
        setLoading(false);
    }, []);

    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { fetchData(); }, [fetchData]);

    // Remember the list as filtered, without the one-off form parameters.
    const listQuery = useMemo(() => {
        const q = new URLSearchParams(params.toString());
        q.delete("edit"); q.delete("return");
        return q.toString();
    }, [params]);
    useEffect(() => {
        rememberActivitiesList(listQuery);
    }, [listQuery]);

    const availableYears = useMemo(() => {
        const years = new Set<number>();
        activities.forEach(a => years.add(a.year));
        return Array.from(years).sort((a, b) => b - a);
    }, [activities]);

    const hiddenCount = useMemo(() => activities.filter(a => a.hidden).length, [activities]);
    const unitImage = useMemo(() => new Map(units.map(u => [u.id, u.imageUrl])), [units]);

    const filtered = useMemo(() => {
        const now = new Date();
        return activities.filter(a => {
            if (a.hidden && !showHidden) return false;
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
    }, [activities, unitFilter, search, dateFilter, currentYear, showHidden]);

    /** Close a form that is staying on this page (saved or cancelled). */
    function closeForm() {
        setOpened(null);
        if (editParam) setParams({ edit: null, return: null });
        fetchData();
    }

    async function handleDelete(id: string) {
        if (!confirm("Delete this activity? Its attendance and circulars are deleted with it.")) return;
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
                <Button onClick={() => (formTarget ? closeForm() : setOpened("new"))} className="gap-2">
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
                {hiddenCount > 0 && (
                    <label className="flex items-center gap-2 text-xs text-muted-foreground w-fit cursor-pointer">
                        <input
                            type="checkbox"
                            className="accent-primary"
                            checked={showHidden}
                            onChange={e => setParams({ hidden: e.target.checked ? "1" : null })}
                        />
                        Show hidden activities ({hiddenCount})
                    </label>
                )}
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

            {formTarget && (
                <ActivityForm
                    // A fresh form (and fresh unsaved-changes state) per activity.
                    key={formTarget === "new" ? "new" : formTarget.id}
                    editing={formTarget === "new" ? null : formTarget}
                    units={units}
                    returning={returning}
                    onDone={closeForm}
                />
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
                            <tr><td colSpan={7} className="p-12 text-center text-muted-foreground">
                                No activities match your filters
                                {!showHidden && hiddenCount > 0 && " (hidden ones are not shown)"}
                            </td></tr>
                        ) : filtered.map((a) => (
                            <tr key={a.id} className={`border-t ${a.hidden ? "bg-muted/20 opacity-70" : ""}`}>
                                <td className="p-3">
                                    {a.imageUrl ? (
                                        /* eslint-disable-next-line @next/next/no-img-element */
                                        <img src={a.imageUrl} alt={a.title} className="w-16 h-10 object-cover rounded" />
                                    ) : (
                                        <div className="w-16 h-10 rounded relative overflow-hidden">
                                            <ActivityCoverFallback logoUrl={unitImage.get(a.unitId)} />
                                        </div>
                                    )}
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
                                    <Link href={`/admin/activities/${a.id}/circulars`} title="Circulars">
                                        <Button variant="ghost" size="sm" className="text-primary hover:text-primary"><FileText className="w-4 h-4" /></Button>
                                    </Link>
                                    <Link href={`/admin/activities/${a.id}/attendance`} title="Attendance">
                                        <Button variant="ghost" size="sm" className="text-primary hover:text-primary"><ClipboardCheck className="w-4 h-4" /></Button>
                                    </Link>
                                    <Button variant="ghost" size="sm" onClick={() => toggleHidden(a)} title={a.hidden ? "Show on site" : "Hide from site"}>
                                        {a.hidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => { setOpened(a); window.scrollTo({ top: 0, behavior: "smooth" }); }}><Pencil className="w-4 h-4" /></Button>
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

const SELECT_CLASS = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm";

/**
 * The add / edit form.
 *
 * Only what every activity needs is on show; map links, the poster and the
 * rarely-touched settings sit behind "More options", because the full list of
 * fields at once made a simple day out look like a tax return.
 */
function ActivityForm({ editing, units, returning, onDone }: {
    editing: Activity | null;
    units: Unit[];
    /** Opened from another page that expects the user back when done. */
    returning: boolean;
    onDone: () => void;
}) {
    const [imageUrl, setImageUrl] = useState<string | null>(editing?.imageUrl ?? null);
    const [uploading, setUploading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [dirty, setDirty] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { leaveTo, leaveBack } = useUnsavedChanges(dirty, "This activity has unsaved changes. Leave and discard them?");

    const hasExtras = !!(editing && (editing.imageUrl || editing.hidden || editing.totalDays
        || editing.locationUrl || editing.dropoffLocationUrl || editing.pickupLocationUrl));

    async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        const formData = new FormData();
        formData.append("file", file);
        try {
            const res = await fetch("/api/upload", { method: "POST", body: formData });
            const data = await res.json();
            if (!res.ok) { alert(data.error || "Upload failed"); return; }
            setImageUrl(data.url);
            setDirty(true);
        } catch {
            alert("Upload failed");
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    }

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        // Which of the two submit buttons was pressed.
        const toCircular = ((e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null)?.value === "circular";
        const fd = new FormData(e.currentTarget);
        const startDate = fd.get("startDate") as string;

        const body = {
            title: fd.get("title"),
            description: fd.get("description"),
            unitId: fd.get("unitId"),
            activityType: fd.get("activityType"),
            startDate,
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
            // The year the activity is filed under follows its start date.
            year: parseInt(startDate.slice(0, 4)),
            totalDays: fd.get("totalDays") ? parseInt(fd.get("totalDays") as string) : null,
            theme: fd.get("theme") || null,
            fee: fd.get("fee") || null,
            // "What to bring" is no longer asked here — it is written on the
            // circular. Not sending it keeps whatever an older activity has.
        };

        setSaving(true);
        const res = await fetch(editing ? `/api/activities/${editing.id}` : "/api/activities", {
            method: editing ? "PUT" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });
        const saved = await res.json().catch(() => ({}));
        setSaving(false);
        if (!res.ok) { alert(saved.error || "Could not save the activity"); return; }

        if (returning) leaveBack();
        else if (toCircular) leaveTo(`/admin/activities/${saved.id}/circulars`);
        else onDone();
    }

    return (
        <form
            onSubmit={handleSubmit}
            onInput={() => setDirty(true)}
            onChange={() => setDirty(true)}
            className="border rounded-xl p-6 mb-8 space-y-6 bg-card"
        >
            <h2 className="text-lg font-semibold">{editing ? `Edit: ${editing.title}` : "New Activity"}</h2>

            <FormGroup title="The activity">
                <div className="grid md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="title">Title *</Label>
                        <Input id="title" name="title" defaultValue={editing?.title} required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="unitId">Unit *</Label>
                        <select id="unitId" name="unitId" defaultValue={editing?.unitId || ""} required className={SELECT_CLASS}>
                            <option value="">Select unit...</option>
                            {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                        </select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="activityType">Type *</Label>
                        <select id="activityType" name="activityType" defaultValue={editing?.activityType || "OTHER"} required className={SELECT_CLASS}>
                            {ACTIVITY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                    </div>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="description">Description *</Label>
                    <textarea id="description" name="description" defaultValue={editing?.description} required rows={2} className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="A sentence or two, shown on the website." />
                </div>
            </FormGroup>

            <FormGroup title="When and where" icon={<MapPin className="w-4 h-4" />}>
                <div className="grid md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="startDate">Start date *</Label>
                        <Input id="startDate" name="startDate" type="date" defaultValue={editing ? new Date(editing.startDate).toISOString().slice(0, 10) : ""} required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="endDate">End date</Label>
                        <Input id="endDate" name="endDate" type="date" defaultValue={editing?.endDate ? new Date(editing.endDate).toISOString().slice(0, 10) : ""} />
                        <p className="text-xs text-muted-foreground">Leave empty for a single day.</p>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="location">Location</Label>
                        <Input id="location" name="location" defaultValue={editing?.location || ""} placeholder="Where it takes place" />
                    </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                    <div className="rounded-lg border p-3 space-y-3">
                        <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Drop-off (start)</div>
                        <div className="grid grid-cols-[7.5rem_1fr] gap-3">
                            <Input id="dropoffTime" name="dropoffTime" type="time" defaultValue={editing?.dropoffTime || ""} aria-label="Drop-off time" />
                            <Input id="dropoffLocation" name="dropoffLocation" defaultValue={editing?.dropoffLocation || ""} placeholder="Where families drop off" aria-label="Drop-off place" />
                        </div>
                    </div>
                    <div className="rounded-lg border p-3 space-y-3">
                        <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Pick-up (end)</div>
                        <div className="grid grid-cols-[7.5rem_1fr] gap-3">
                            <Input id="pickupTime" name="pickupTime" type="time" defaultValue={editing?.pickupTime || ""} aria-label="Pick-up time" />
                            <Input id="pickupLocation" name="pickupLocation" defaultValue={editing?.pickupLocation || ""} placeholder="Same place if left empty" aria-label="Pick-up place" />
                        </div>
                    </div>
                </div>
            </FormGroup>

            <FormGroup title="For the circular" icon={<FileText className="w-4 h-4" />}>
                <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="theme">Theme</Label>
                        <Input id="theme" name="theme" defaultValue={editing?.theme || ""} placeholder="e.g. Voyager vers la Flamme" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="fee">Fee</Label>
                        <Input id="fee" name="fee" defaultValue={editing?.fee || ""} placeholder="e.g. $25" />
                    </div>
                </div>
                <p className="text-xs text-muted-foreground">
                    Both optional. What to bring, and the rest of the letter, are written on the circular itself.
                </p>
            </FormGroup>

            <details className="group border-t pt-4" open={hasExtras}>
                <summary className="cursor-pointer list-none flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground">
                    <ChevronDown className="w-4 h-4 transition-transform group-open:rotate-180" />
                    More options
                    <span className="font-normal text-xs">— poster, map links, visibility</span>
                </summary>
                <div className="mt-4 space-y-5">
                    <div className="space-y-2">
                        <Label>Poster or graphic (optional)</Label>
                        <p className="text-xs text-muted-foreground">
                            A fun visual for the activity, if you made one. It is the picture shown on the website; without it the unit&apos;s logo is used.
                        </p>
                        <div className="flex items-center gap-3">
                            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                            <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="gap-2">
                                <Upload className="w-4 h-4" /> {uploading ? "Uploading..." : imageUrl ? "Replace" : "Upload"}
                            </Button>
                            {imageUrl && (
                                <>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={imageUrl} alt="Poster" className="w-24 h-14 object-cover rounded-md border" />
                                    <Button type="button" variant="ghost" size="sm" onClick={() => { setImageUrl(null); setDirty(true); }} className="text-destructive">
                                        <X className="w-4 h-4" />
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="grid md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="locationUrl">Location map link</Label>
                            <Input id="locationUrl" name="locationUrl" type="url" defaultValue={editing?.locationUrl || ""} placeholder="https://maps.google.com/..." />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="dropoffLocationUrl">Drop-off map link</Label>
                            <Input id="dropoffLocationUrl" name="dropoffLocationUrl" type="url" defaultValue={editing?.dropoffLocationUrl || ""} placeholder="https://maps.google.com/..." />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="pickupLocationUrl">Pick-up map link</Label>
                            <Input id="pickupLocationUrl" name="pickupLocationUrl" type="url" defaultValue={editing?.pickupLocationUrl || ""} placeholder="https://maps.google.com/..." />
                        </div>
                    </div>

                    <div className="grid md:grid-cols-3 gap-4 items-end">
                        <div className="space-y-2">
                            <Label htmlFor="totalDays">Days counted for attendance</Label>
                            <Input id="totalDays" name="totalDays" type="number" min="1" defaultValue={editing?.totalDays || ""} placeholder="e.g. 3" />
                        </div>
                        <label className="md:col-span-2 flex items-center gap-2 rounded-lg bg-muted/30 border p-3 text-sm cursor-pointer">
                            <input type="checkbox" id="hidden" name="hidden" defaultChecked={editing?.hidden ?? false} className="accent-primary" />
                            Hide from the public site
                            <span className="text-xs text-muted-foreground">(for a draft, or an internal activity)</span>
                        </label>
                    </div>
                </div>
            </details>

            <div className="flex flex-wrap gap-2 border-t pt-4">
                <Button type="submit" value="save" disabled={saving}>{saving ? "Saving..." : editing ? "Update" : "Create"}</Button>
                {!returning && (
                    <Button type="submit" value="circular" variant="outline" disabled={saving} className="gap-2">
                        <FileText className="w-4 h-4" /> {editing ? "Update & open circulars" : "Create & generate circular"}
                    </Button>
                )}
                <Button type="button" variant="ghost" onClick={() => (returning ? leaveBack() : onDone())}>Cancel</Button>
            </div>
        </form>
    );
}

function FormGroup({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
    return (
        <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">{icon}{title}</h3>
            {children}
        </div>
    );
}
