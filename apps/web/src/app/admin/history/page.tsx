"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect, useRef } from "react";
import {
    Plus, Pencil, Trash2, ArrowUp, ArrowDown, X, Upload,
    BookOpen, Users, Trophy, Clock, Zap, Target, ImageIcon,
    FileText, AlignLeft,
} from "lucide-react";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Format a stored ISO date as "Month YYYY" */
function formatMonthYear(iso: string) {
    const d = new Date(iso);
    return d.toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
}

/** Convert stored ISO date to "YYYY-MM" for <input type="month"> */
function toMonthInput(iso: string) {
    return new Date(iso).toISOString().slice(0, 7);
}

// ─── Types ────────────────────────────────────────────────────────────────────

type Milestone = {
    id: string;
    date: string;
    title: string;
    description: string | null;
    longDescription: string | null;
    challenges: string | null;
    motivations: string | null;
    unitCount: number | null;
    memberCount: number | null;
    imageUrls: string[];
    sortOrder: number;
};

type Ancien = {
    id: string;
    name: string;
    lastRole: string;
    yearsActive: string | null;
    photoUrl: string | null;
    bio: string | null;
    sortOrder: number;
};

// ─── Section label helper ─────────────────────────────────────────────────────

function SectionLabel({ icon, label, sublabel }: { icon: React.ReactNode; label: string; sublabel?: string }) {
    return (
        <div className="flex items-start gap-2">
            <span className="mt-0.5 shrink-0">{icon}</span>
            <div>
                <span className="text-sm font-semibold">{label}</span>
                {sublabel && <p className="text-xs text-muted-foreground mt-0.5">{sublabel}</p>}
            </div>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminHistoryPage() {
    const [tab, setTab] = useState<"milestones" | "anciens">("milestones");

    return (
        <div className="max-w-4xl">
            <div className="mb-8">
                <h1 className="text-3xl font-bold flex items-center gap-2">
                    <BookOpen className="w-7 h-7 text-primary" /> History
                </h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                    Manage the group&apos;s history timeline and Anciens directory.
                </p>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-8 border-b">
                <button
                    onClick={() => setTab("milestones")}
                    className={`px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                        tab === "milestones"
                            ? "border-primary text-primary"
                            : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                >
                    <span className="flex items-center gap-2"><Trophy className="w-4 h-4" /> Milestones</span>
                </button>
                <button
                    onClick={() => setTab("anciens")}
                    className={`px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                        tab === "anciens"
                            ? "border-primary text-primary"
                            : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                >
                    <span className="flex items-center gap-2"><Users className="w-4 h-4" /> Anciens</span>
                </button>
            </div>

            {tab === "milestones" ? <MilestonesTab /> : <AnciensTab />}
        </div>
    );
}

// ─── Milestones Tab ───────────────────────────────────────────────────────────

function MilestonesTab() {
    const [milestones, setMilestones] = useState<Milestone[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState<Milestone | null>(null);
    const [imageUrls, setImageUrls] = useState<string[]>([]);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    async function fetchMilestones() {
        const res = await fetch("/api/admin/history/milestones");
        if (res.ok) setMilestones(await res.json());
        setLoading(false);
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { fetchMilestones(); }, []);

    async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const files = Array.from(e.target.files ?? []);
        if (!files.length) return;
        setUploading(true);
        try {
            const uploaded = await Promise.all(files.map(async (file) => {
                const fd = new FormData();
                fd.append("file", file);
                const res = await fetch("/api/upload", { method: "POST", body: fd });
                if (res.ok) {
                    const { url } = await res.json();
                    return url as string;
                }
                return null;
            }));
            setImageUrls(prev => [...prev, ...(uploaded.filter(Boolean) as string[])]);
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    }

    function removeImage(idx: number) {
        setImageUrls(prev => prev.filter((_, i) => i !== idx));
    }

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const body = {
            date: fd.get("date"),
            title: fd.get("title"),
            description: fd.get("description") || null,
            longDescription: fd.get("longDescription") || null,
            challenges: fd.get("challenges") || null,
            motivations: fd.get("motivations") || null,
            unitCount: fd.get("unitCount") || null,
            memberCount: fd.get("memberCount") || null,
            imageUrls,
        };
        const url = editing
            ? `/api/admin/history/milestones/${editing.id}`
            : "/api/admin/history/milestones";
        await fetch(url, {
            method: editing ? "PUT" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });
        closeForm();
        fetchMilestones();
    }

    async function handleDelete(id: string) {
        if (!confirm("Delete this milestone?")) return;
        await fetch(`/api/admin/history/milestones/${id}`, { method: "DELETE" });
        fetchMilestones();
    }

    function startEdit(m: Milestone) {
        setEditing(m);
        setImageUrls(m.imageUrls ?? []);
        setShowForm(true);
        setTimeout(() => document.getElementById("milestone-form")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    }

    function startCreate() {
        setEditing(null);
        setImageUrls([]);
        setShowForm(true);
        setTimeout(() => document.getElementById("milestone-form")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    }

    function closeForm() {
        setShowForm(false);
        setEditing(null);
        setImageUrls([]);
    }

    async function move(idx: number, dir: -1 | 1) {
        const target = idx + dir;
        if (target < 0 || target >= milestones.length) return;
        const next = [...milestones];
        [next[idx], next[target]] = [next[target], next[idx]];
        setMilestones(next);
        await fetch("/api/admin/history/milestones/reorder", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ids: next.map(m => m.id) }),
        });
    }

    if (loading) return <p className="text-muted-foreground">Loading...</p>;

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <p className="text-sm text-muted-foreground">
                    Add milestones in the group&apos;s public history timeline. Reorder with the arrows.
                </p>
                <Button onClick={startCreate} className="gap-2 shrink-0">
                    <Plus className="w-4 h-4" /> Add Milestone
                </Button>
            </div>

            {/* ── Form ── */}
            {showForm && (
                <div id="milestone-form" className="border rounded-2xl p-6 mb-8 bg-card space-y-6">
                    <div className="flex justify-between items-center">
                        <h2 className="text-lg font-semibold">
                            {editing ? "Edit milestone" : "New milestone"}
                        </h2>
                        <button type="button" onClick={closeForm} className="text-muted-foreground hover:text-foreground p-1">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Row 1: date + title */}
                        <div className="grid md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="date" className="flex items-center gap-1.5">
                                    <Clock className="w-3.5 h-3.5 text-primary" /> Month & Year *
                                </Label>
                                <Input
                                    id="date" name="date" type="month" required
                                    defaultValue={editing ? toMonthInput(editing.date) : ""}
                                />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="title">Milestone Title *</Label>
                                <Input
                                    id="title" name="title" required
                                    defaultValue={editing?.title ?? ""}
                                    placeholder="e.g. First summer camp in the mountains"
                                />
                            </div>
                        </div>

                        {/* Row 2: stats */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="unitCount" className="flex items-center gap-1.5">
                                    <Trophy className="w-3.5 h-3.5 text-primary" /> Units at this milestone
                                </Label>
                                <Input
                                    id="unitCount" name="unitCount" type="number" min="0"
                                    defaultValue={editing?.unitCount ?? ""}
                                    placeholder="e.g. 3"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="memberCount" className="flex items-center gap-1.5">
                                    <Users className="w-3.5 h-3.5 text-primary" /> Members at this milestone
                                </Label>
                                <Input
                                    id="memberCount" name="memberCount" type="number" min="0"
                                    defaultValue={editing?.memberCount ?? ""}
                                    placeholder="e.g. 45"
                                />
                            </div>
                        </div>

                        {/* Short caption */}
                        <div className="space-y-2">
                            <Label htmlFor="description">
                                <SectionLabel
                                    icon={<FileText className="w-3.5 h-3.5 text-primary" />}
                                    label="Short Caption"
                                    sublabel="2–3 sentences shown on the timeline card"
                                />
                            </Label>
                            <textarea
                                id="description" name="description"
                                defaultValue={editing?.description ?? ""}
                                rows={3}
                                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-y"
                                placeholder="A brief sentence summarising what happened and why it matters..."
                            />
                        </div>

                        {/* Long description */}
                        <div className="space-y-2">
                            <Label htmlFor="longDescription">
                                <SectionLabel
                                    icon={<AlignLeft className="w-3.5 h-3.5 text-primary" />}
                                    label="Full Story"
                                    sublabel="Detailed account — shown in the expanded section of the milestone"
                                />
                            </Label>
                            <textarea
                                id="longDescription" name="longDescription"
                                defaultValue={editing?.longDescription ?? ""}
                                rows={5}
                                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-y"
                                placeholder="Tell the full story: who was involved, how it unfolded, what was memorable..."
                            />
                        </div>

                        {/* Challenges */}
                        <div className="rounded-xl border border-orange-200 dark:border-orange-800/60 bg-orange-50/40 dark:bg-orange-950/20 p-4 space-y-2">
                            <Label htmlFor="challenges">
                                <SectionLabel
                                    icon={<Zap className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />}
                                    label="Challenges & Obstacles"
                                    sublabel="One bullet per line — each line becomes a separate bullet point"
                                />
                            </Label>
                            <textarea
                                id="challenges" name="challenges"
                                defaultValue={editing?.challenges ?? ""}
                                rows={4}
                                className="flex w-full rounded-md border border-orange-200 dark:border-orange-800/60 bg-background px-3 py-2 text-sm resize-y font-mono"
                                placeholder={"Funding was limited in the first year\nFinding a suitable camp location took months\nCoordinating volunteer leaders across multiple units"}
                            />
                        </div>

                        {/* Motivations */}
                        <div className="rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/40 dark:bg-emerald-950/20 p-4 space-y-2">
                            <Label htmlFor="motivations">
                                <SectionLabel
                                    icon={<Target className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />}
                                    label="Motivations & Goals"
                                    sublabel="One bullet per line — each line becomes a separate bullet point"
                                />
                            </Label>
                            <textarea
                                id="motivations" name="motivations"
                                defaultValue={editing?.motivations ?? ""}
                                rows={4}
                                className="flex w-full rounded-md border border-emerald-200 dark:border-emerald-800/60 bg-background px-3 py-2 text-sm resize-y font-mono"
                                placeholder={"Build a stronger sense of brotherhood among units\nGive members their first outdoor leadership experience\nEstablish a lasting annual tradition"}
                            />
                        </div>

                        {/* Images */}
                        <div className="space-y-3">
                            <Label>
                                <SectionLabel
                                    icon={<ImageIcon className="w-3.5 h-3.5 text-primary" />}
                                    label="Photos"
                                    sublabel="Upload multiple images — they appear as a gallery in the timeline"
                                />
                            </Label>
                            <div className="flex items-center gap-3">
                                <input
                                    ref={fileInputRef} type="file" accept="image/*" multiple
                                    onChange={handleImageUpload} className="hidden"
                                />
                                <Button
                                    type="button" variant="outline"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={uploading} className="gap-2"
                                >
                                    <Upload className="w-4 h-4" />
                                    {uploading ? "Uploading…" : "Add photos"}
                                </Button>
                                {imageUrls.length > 0 && (
                                    <span className="text-xs text-muted-foreground">
                                        {imageUrls.length} photo{imageUrls.length !== 1 ? "s" : ""} added
                                    </span>
                                )}
                            </div>
                            {imageUrls.length > 0 && (
                                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                                    {imageUrls.map((url, i) => (
                                        <div key={i} className="relative group aspect-square">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                                src={url} alt={`Photo ${i + 1}`}
                                                className="w-full h-full object-cover rounded-lg border"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => removeImage(i)}
                                                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="flex gap-2 pt-2 border-t">
                            <Button type="submit">{editing ? "Update Milestone" : "Create Milestone"}</Button>
                            <Button type="button" variant="outline" onClick={closeForm}>Cancel</Button>
                        </div>
                    </form>
                </div>
            )}

            {/* ── List ── */}
            {milestones.length === 0 ? (
                <div className="text-center py-20 border border-dashed rounded-2xl bg-muted/30">
                    <Trophy className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                    <p className="text-muted-foreground mb-4">No milestones yet.</p>
                    <Button onClick={startCreate} className="gap-2"><Plus className="w-4 h-4" /> Add Milestone</Button>
                </div>
            ) : (
                <div className="space-y-3">
                    {milestones.map((m, idx) => (
                        <div key={m.id} className="border rounded-2xl bg-card p-4 flex items-start gap-4 hover:border-primary/30 transition-colors">
                            {/* Reorder */}
                            <div className="flex flex-col gap-1 shrink-0 mt-1">
                                <button
                                    onClick={() => move(idx, -1)} disabled={idx === 0}
                                    className="w-7 h-7 rounded-md border bg-background hover:bg-muted disabled:opacity-30 flex items-center justify-center"
                                >
                                    <ArrowUp className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    onClick={() => move(idx, 1)} disabled={idx === milestones.length - 1}
                                    className="w-7 h-7 rounded-md border bg-background hover:bg-muted disabled:opacity-30 flex items-center justify-center"
                                >
                                    <ArrowDown className="w-3.5 h-3.5" />
                                </button>
                            </div>

                            {/* Thumbnail grid (up to 3 images) */}
                            {m.imageUrls?.length > 0 && (
                                <div className="hidden sm:flex gap-1 shrink-0">
                                    {m.imageUrls.slice(0, 3).map((url, i) => (
                                        /* eslint-disable-next-line @next/next/no-img-element */
                                        <img
                                            key={i} src={url} alt=""
                                            className="w-14 h-14 object-cover rounded-lg border"
                                        />
                                    ))}
                                    {m.imageUrls.length > 3 && (
                                        <div className="w-14 h-14 rounded-lg border bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground">
                                            +{m.imageUrls.length - 3}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                                    <span className="text-xs font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full">
                                        {formatMonthYear(m.date)}
                                    </span>
                                    {m.unitCount != null && (
                                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                                            <Trophy className="w-3 h-3" /> {m.unitCount} unit{m.unitCount !== 1 ? "s" : ""}
                                        </span>
                                    )}
                                    {m.memberCount != null && (
                                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                                            <Users className="w-3 h-3" /> {m.memberCount} member{m.memberCount !== 1 ? "s" : ""}
                                        </span>
                                    )}
                                    {m.challenges && (
                                        <span className="text-xs text-orange-600 dark:text-orange-400 flex items-center gap-1">
                                            <Zap className="w-3 h-3" /> challenges
                                        </span>
                                    )}
                                    {m.motivations && (
                                        <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                            <Target className="w-3 h-3" /> motivations
                                        </span>
                                    )}
                                </div>
                                <h3 className="font-bold text-base">{m.title}</h3>
                                {m.description && (
                                    <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">{m.description}</p>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="flex gap-1 shrink-0">
                                <Button variant="ghost" size="sm" onClick={() => startEdit(m)}>
                                    <Pencil className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => handleDelete(m.id)} className="text-destructive">
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Anciens Tab ──────────────────────────────────────────────────────────────

function AnciensTab() {
    const [anciens, setAnciens] = useState<Ancien[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState<Ancien | null>(null);
    const [photoUrl, setPhotoUrl] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    async function fetchAnciens() {
        const res = await fetch("/api/admin/history/anciens");
        if (res.ok) setAnciens(await res.json());
        setLoading(false);
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { fetchAnciens(); }, []);

    async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        const fd = new FormData();
        fd.append("file", file);
        try {
            const res = await fetch("/api/upload", { method: "POST", body: fd });
            if (res.ok) {
                const { url } = await res.json();
                setPhotoUrl(url);
            }
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    }

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const body = {
            name: fd.get("name"),
            lastRole: fd.get("lastRole"),
            yearsActive: fd.get("yearsActive") || null,
            bio: fd.get("bio") || null,
            photoUrl,
        };
        const url = editing
            ? `/api/admin/history/anciens/${editing.id}`
            : "/api/admin/history/anciens";
        await fetch(url, {
            method: editing ? "PUT" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });
        closeForm();
        fetchAnciens();
    }

    async function handleDelete(id: string) {
        if (!confirm("Remove this ancien from the directory?")) return;
        await fetch(`/api/admin/history/anciens/${id}`, { method: "DELETE" });
        fetchAnciens();
    }

    function startEdit(a: Ancien) {
        setEditing(a);
        setPhotoUrl(a.photoUrl);
        setShowForm(true);
    }

    function startCreate() {
        setEditing(null);
        setPhotoUrl(null);
        setShowForm(true);
    }

    function closeForm() {
        setShowForm(false);
        setEditing(null);
        setPhotoUrl(null);
    }

    async function move(idx: number, dir: -1 | 1) {
        const target = idx + dir;
        if (target < 0 || target >= anciens.length) return;
        const next = [...anciens];
        [next[idx], next[target]] = [next[target], next[idx]];
        setAnciens(next);
        await fetch("/api/admin/history/anciens/reorder", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ids: next.map(a => a.id) }),
        });
    }

    if (loading) return <p className="text-muted-foreground">Loading...</p>;

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <p className="text-sm text-muted-foreground">
                    Manage the private Anciens directory — visible only to logged-in admins.
                </p>
                <Button onClick={startCreate} className="gap-2 shrink-0">
                    <Plus className="w-4 h-4" /> Add Ancien
                </Button>
            </div>

            {showForm && (
                <form onSubmit={handleSubmit} className="border rounded-2xl p-6 mb-8 space-y-4 bg-card">
                    <div className="flex justify-between items-center">
                        <h2 className="text-lg font-semibold">{editing ? "Edit ancien" : "New ancien"}</h2>
                        <button type="button" onClick={closeForm} className="text-muted-foreground hover:text-foreground">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Full Name *</Label>
                            <Input id="name" name="name" defaultValue={editing?.name ?? ""} placeholder="Jean Dupont" required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="lastRole">Last Role *</Label>
                            <Input id="lastRole" name="lastRole" defaultValue={editing?.lastRole ?? ""} placeholder="Chef de Groupe" required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="yearsActive" className="flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-primary" /> Years Active
                            </Label>
                            <Input id="yearsActive" name="yearsActive" defaultValue={editing?.yearsActive ?? ""} placeholder="2014–2019" />
                        </div>
                        <div className="space-y-2">
                            <Label>Photo (optional)</Label>
                            <div className="flex items-center gap-3">
                                <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                                <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="gap-2">
                                    <Upload className="w-4 h-4" />
                                    {uploading ? "Uploading…" : photoUrl ? "Change photo" : "Upload photo"}
                                </Button>
                                {photoUrl && (
                                    <Button type="button" variant="ghost" size="sm" onClick={() => setPhotoUrl(null)} className="text-destructive">
                                        <X className="w-4 h-4" />
                                    </Button>
                                )}
                            </div>
                            {photoUrl && (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img src={photoUrl} alt="Preview" className="w-16 h-16 object-cover rounded-full border mt-2" />
                            )}
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="bio">Short bio (optional)</Label>
                            <textarea
                                id="bio" name="bio" defaultValue={editing?.bio ?? ""}
                                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-y"
                                placeholder="A few words about their contribution to the group..."
                            />
                        </div>
                    </div>

                    <div className="flex gap-2 pt-1">
                        <Button type="submit">{editing ? "Update" : "Add Ancien"}</Button>
                        <Button type="button" variant="outline" onClick={closeForm}>Cancel</Button>
                    </div>
                </form>
            )}

            {anciens.length === 0 ? (
                <div className="text-center py-20 border border-dashed rounded-2xl bg-muted/30">
                    <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                    <p className="text-muted-foreground mb-4">No anciens yet.</p>
                    <Button onClick={startCreate} className="gap-2"><Plus className="w-4 h-4" /> Add Ancien</Button>
                </div>
            ) : (
                <div className="space-y-3">
                    {anciens.map((a, idx) => (
                        <div key={a.id} className="border rounded-2xl bg-card p-4 flex items-center gap-4 hover:border-primary/30 transition-colors">
                            <div className="flex flex-col gap-1 shrink-0">
                                <button onClick={() => move(idx, -1)} disabled={idx === 0} className="w-7 h-7 rounded-md border bg-background hover:bg-muted disabled:opacity-30 flex items-center justify-center">
                                    <ArrowUp className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => move(idx, 1)} disabled={idx === anciens.length - 1} className="w-7 h-7 rounded-md border bg-background hover:bg-muted disabled:opacity-30 flex items-center justify-center">
                                    <ArrowDown className="w-3.5 h-3.5" />
                                </button>
                            </div>
                            {a.photoUrl ? (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img src={a.photoUrl} alt={a.name} className="w-12 h-12 rounded-full object-cover border shrink-0" />
                            ) : (
                                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                    <span className="text-primary font-bold text-sm">
                                        {a.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                                    </span>
                                </div>
                            )}
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-base">{a.name}</p>
                                <p className="text-sm text-primary font-medium">{a.lastRole}</p>
                                {a.yearsActive && (
                                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                        <Clock className="w-3 h-3" /> {a.yearsActive}
                                    </p>
                                )}
                            </div>
                            <div className="flex gap-1 shrink-0">
                                <Button variant="ghost" size="sm" onClick={() => startEdit(a)}><Pencil className="w-4 h-4" /></Button>
                                <Button variant="ghost" size="sm" onClick={() => handleDelete(a.id)} className="text-destructive"><Trash2 className="w-4 h-4" /></Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
