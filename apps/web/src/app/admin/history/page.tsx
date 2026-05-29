"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect, useRef } from "react";
import {
    Plus, Pencil, Trash2, ArrowUp, ArrowDown, X, Upload,
    Users, Trophy, Clock, Zap, Target, ImageIcon,
    FileText, AlignLeft, Star, Phone, Mail, Briefcase, Shield,
} from "lucide-react";
import { ANCIEN_SCOUT_ROLES } from "@/lib/scout-config";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Format a stored ISO date as "Month YYYY" */
function formatMonthYear(iso: string) {
    const d = new Date(iso);
    return d.toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
}

/** Convert stored ISO date to "YYYY-MM-DD" for <input type="date"> */
function toDateInput(iso: string) {
    return new Date(iso).toISOString().slice(0, 10);
}

// ─── Types ────────────────────────────────────────────────────────────────────

type Milestone = {
    id: string;
    type: "milestone" | "achievement";
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

type ScoutRoleEntry = { role: string; startYear: string; endYear: string };
type ProfessionEntry = { title: string; organization: string; url: string; details: string };

type Ancien = {
    id: string;
    name: string;
    joinedYear: number | null;
    leftYear: number | null;
    progression: string[];
    scoutRoles: ScoutRoleEntry[];
    professions: ProfessionEntry[];
    phone: string | null;
    email: string | null;
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
                    <Trophy className="w-7 h-7 text-primary" /> Milestones
                </h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                    Manage the group&apos;s milestones, achievements, and Anciens directory.
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
    const [milestoneType, setMilestoneType] = useState<"milestone" | "achievement">("milestone");
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
                fd.append("folder", "milestones");
                fd.append("maxWidth", "1200");
                fd.append("maxHeight", "800");
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
            type: milestoneType,
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
        setMilestoneType(m.type ?? "milestone");
        setImageUrls(m.imageUrls ?? []);
        setShowForm(true);
        setTimeout(() => document.getElementById("milestone-form")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    }

    function startCreate() {
        setEditing(null);
        setMilestoneType("milestone");
        setImageUrls([]);
        setShowForm(true);
        setTimeout(() => document.getElementById("milestone-form")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    }

    function closeForm() {
        setShowForm(false);
        setEditing(null);
        setMilestoneType("milestone");
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
                        {/* Type toggle */}
                        <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-muted">
                            <button
                                type="button"
                                onClick={() => setMilestoneType("milestone")}
                                className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                                    milestoneType === "milestone"
                                        ? "bg-card shadow text-primary border border-primary/20"
                                        : "text-muted-foreground hover:text-foreground"
                                }`}
                            >
                                <Trophy className="w-4 h-4" /> Major Milestone
                            </button>
                            <button
                                type="button"
                                onClick={() => setMilestoneType("achievement")}
                                className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                                    milestoneType === "achievement"
                                        ? "bg-card shadow text-amber-600 dark:text-amber-400 border border-amber-300/40 dark:border-amber-700/40"
                                        : "text-muted-foreground hover:text-foreground"
                                }`}
                            >
                                <Star className="w-4 h-4" /> Achievement
                            </button>
                        </div>
                        {milestoneType === "achievement" && (
                            <p className="text-xs text-muted-foreground bg-muted/60 rounded-lg px-3 py-2">
                                Achievements appear smaller on the public timeline — ideal for notable moments that aren&apos;t as significant as a full milestone.
                            </p>
                        )}

                        {/* Row 1: date + title */}
                        <div className="grid md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="date" className="flex items-center gap-1.5">
                                    <Clock className="w-3.5 h-3.5 text-primary" /> Date *
                                </Label>
                                <Input
                                    id="date" name="date" type="date" required
                                    defaultValue={editing ? toDateInput(editing.date) : ""}
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
                        <div key={m.id} className={`border rounded-2xl bg-card p-4 flex items-start gap-4 transition-colors ${
                            m.type === "achievement"
                                ? "hover:border-amber-300/60 dark:hover:border-amber-700/60"
                                : "hover:border-primary/30"
                        }`}>
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
                                    {/* Type badge */}
                                    {m.type === "achievement" ? (
                                        <span className="text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                                            <Star className="w-3 h-3" /> Achievement
                                        </span>
                                    ) : (
                                        <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                                            <Trophy className="w-3 h-3" /> Milestone
                                        </span>
                                    )}
                                    <span className="text-xs text-muted-foreground">
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

const PROGRESSION_OPTIONS = ["Première veille", "Départ"] as const;

function emptyRole(): ScoutRoleEntry { return { role: "", startYear: "", endYear: "" }; }
function emptyProfession(): ProfessionEntry { return { title: "", organization: "", url: "", details: "" }; }

function AnciensTab() {
    const [anciens, setAnciens] = useState<Ancien[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState<Ancien | null>(null);

    // form state
    const [photoUrl, setPhotoUrl] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [progression, setProgression] = useState<string[]>([]);
    const [scoutRoles, setScoutRoles] = useState<ScoutRoleEntry[]>([emptyRole()]);
    const [professions, setProfessions] = useState<ProfessionEntry[]>([emptyProfession()]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const formRef = useRef<HTMLFormElement>(null);

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
        fd.append("preserveAlpha", "true");
        try {
            const res = await fetch("/api/upload", { method: "POST", body: fd });
            if (res.ok) setPhotoUrl((await res.json()).url);
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    }

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const cleanRoles = scoutRoles.filter(r => r.role.trim());
        const cleanProfs = professions.filter(p => p.title.trim() || p.organization.trim());
        const body = {
            name: fd.get("name"),
            joinedYear: fd.get("joinedYear") ? Number(fd.get("joinedYear")) : null,
            leftYear: fd.get("leftYear") ? Number(fd.get("leftYear")) : null,
            progression,
            scoutRoles: cleanRoles.map(r => ({
                role: r.role,
                startYear: r.startYear ? Number(r.startYear) : null,
                endYear: r.endYear ? Number(r.endYear) : null,
            })),
            professions: cleanProfs.map(p => ({
                title: p.title,
                organization: p.organization,
                url: p.url || null,
                details: p.details || null,
            })),
            phone: fd.get("phone") || null,
            email: fd.get("email") || null,
            bio: fd.get("bio") || null,
            photoUrl,
        };
        const url = editing ? `/api/admin/history/anciens/${editing.id}` : "/api/admin/history/anciens";
        await fetch(url, { method: editing ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        closeForm();
        fetchAnciens();
    }

    async function handleDelete(id: string) {
        if (!confirm("Remove this ancien?")) return;
        await fetch(`/api/admin/history/anciens/${id}`, { method: "DELETE" });
        fetchAnciens();
    }

    function startEdit(a: Ancien) {
        setEditing(a);
        setPhotoUrl(a.photoUrl);
        setProgression(a.progression ?? []);
        setScoutRoles(a.scoutRoles?.length ? a.scoutRoles.map(r => ({
            role: r.role ?? "",
            startYear: r.startYear != null ? String(r.startYear) : "",
            endYear: r.endYear != null ? String(r.endYear) : "",
        })) : [emptyRole()]);
        setProfessions(a.professions?.length ? a.professions.map(p => ({
            title: p.title ?? "",
            organization: p.organization ?? "",
            url: p.url ?? "",
            details: p.details ?? "",
        })) : [emptyProfession()]);
        setShowForm(true);
        setTimeout(() => document.getElementById("ancien-form")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    }

    function startCreate() {
        setEditing(null);
        setPhotoUrl(null);
        setProgression([]);
        setScoutRoles([emptyRole()]);
        setProfessions([emptyProfession()]);
        setShowForm(true);
        setTimeout(() => document.getElementById("ancien-form")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    }

    function closeForm() {
        setShowForm(false);
        setEditing(null);
        setPhotoUrl(null);
        setProgression([]);
        setScoutRoles([emptyRole()]);
        setProfessions([emptyProfession()]);
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

    // helpers for dynamic lists
    function updateRole(i: number, field: keyof ScoutRoleEntry, val: string) {
        setScoutRoles(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: val } : r));
    }
    function updateProfession(i: number, field: keyof ProfessionEntry, val: string) {
        setProfessions(prev => prev.map((p, idx) => idx === i ? { ...p, [field]: val } : p));
    }
    function toggleProgression(opt: string) {
        setProgression(prev => prev.includes(opt) ? prev.filter(p => p !== opt) : [...prev, opt]);
    }

    if (loading) return <p className="text-muted-foreground">Loading...</p>;

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <p className="text-sm text-muted-foreground">
                    Manage the Anciens directory — visible only to logged-in admins.
                </p>
                <Button onClick={startCreate} className="gap-2 shrink-0">
                    <Plus className="w-4 h-4" /> Add Ancien
                </Button>
            </div>

            {/* ── Form ── */}
            {showForm && (
                <form id="ancien-form" ref={formRef} onSubmit={handleSubmit}
                    className="border rounded-2xl p-6 mb-8 space-y-6 bg-card">
                    <div className="flex justify-between items-center">
                        <h2 className="text-lg font-semibold">{editing ? "Edit ancien" : "New ancien"}</h2>
                        <button type="button" onClick={closeForm} className="text-muted-foreground hover:text-foreground">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* ── Name + Photo ── */}
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Full Name *</Label>
                            <Input id="name" name="name" required defaultValue={editing?.name ?? ""} placeholder="Jean Dupont" />
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
                                    <Button type="button" variant="ghost" size="sm" onClick={() => setPhotoUrl(null)} className="text-destructive"><X className="w-4 h-4" /></Button>
                                )}
                            </div>
                            {photoUrl && (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img src={photoUrl} alt="Preview" className="w-16 h-16 object-cover rounded-full border mt-2" />
                            )}
                        </div>
                    </div>

                    {/* ── Contact ── */}
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="phone" className="flex items-center gap-1.5">
                                <Phone className="w-3.5 h-3.5 text-primary" /> Phone
                            </Label>
                            <Input id="phone" name="phone" type="tel" defaultValue={editing?.phone ?? ""} placeholder="+961 xx xxx xxx" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email" className="flex items-center gap-1.5">
                                <Mail className="w-3.5 h-3.5 text-primary" /> Email
                            </Label>
                            <Input id="email" name="email" type="email" defaultValue={editing?.email ?? ""} placeholder="jean@example.com" />
                        </div>
                    </div>

                    {/* ── Scouting dates ── */}
                    <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
                        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" /> Scouting Period
                        </p>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="joinedYear" className="text-xs">Year joined</Label>
                                <Input id="joinedYear" name="joinedYear" type="number" min="1990" max="2100"
                                    defaultValue={editing?.joinedYear ?? ""} placeholder="e.g. 2010" />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="leftYear" className="text-xs">Year left</Label>
                                <Input id="leftYear" name="leftYear" type="number" min="1990" max="2100"
                                    defaultValue={editing?.leftYear ?? ""} placeholder="e.g. 2018" />
                            </div>
                        </div>
                    </div>

                    {/* ── Progression ── */}
                    <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
                        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                            <Star className="w-3.5 h-3.5 text-amber-500" /> Scout Progression
                        </p>
                        <div className="flex flex-wrap gap-3">
                            {PROGRESSION_OPTIONS.map(opt => (
                                <label key={opt} className="flex items-center gap-2 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={progression.includes(opt)}
                                        onChange={() => toggleProgression(opt)}
                                        className="w-4 h-4 rounded border-gray-300 text-primary"
                                    />
                                    <span className="text-sm font-medium">{opt}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* ── Scout Roles ── */}
                    <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                                <Shield className="w-3.5 h-3.5 text-primary" /> Scout Roles Held
                            </p>
                            <Button type="button" variant="outline" size="sm" className="h-7 text-xs gap-1"
                                onClick={() => setScoutRoles(p => [...p, emptyRole()])}>
                                <Plus className="w-3 h-3" /> Add role
                            </Button>
                        </div>
                        <div className="space-y-2">
                            {scoutRoles.map((r, i) => (
                                <div key={i} className="grid grid-cols-[1fr_auto_auto_auto] gap-2 items-center">
                                    <select
                                        value={r.role}
                                        onChange={e => updateRole(i, "role", e.target.value)}
                                        className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                    >
                                        <option value="">— Select role —</option>
                                        {ANCIEN_SCOUT_ROLES.map(({ group, options }) => (
                                            <optgroup key={group} label={group}>
                                                {options.map(o => (
                                                    <option key={o.value} value={o.value}>{o.label}</option>
                                                ))}
                                            </optgroup>
                                        ))}
                                    </select>
                                    <Input
                                        className="w-24"
                                        placeholder="From"
                                        type="number" min="1990" max="2100"
                                        value={r.startYear}
                                        onChange={e => updateRole(i, "startYear", e.target.value)}
                                    />
                                    <Input
                                        className="w-24"
                                        placeholder="To"
                                        type="number" min="1990" max="2100"
                                        value={r.endYear}
                                        onChange={e => updateRole(i, "endYear", e.target.value)}
                                    />
                                    <button type="button" onClick={() => setScoutRoles(p => p.filter((_, idx) => idx !== i))}
                                        className="text-muted-foreground hover:text-destructive transition-colors p-1 disabled:opacity-30"
                                        disabled={scoutRoles.length === 1}>
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                        <p className="text-[11px] text-muted-foreground">Add roles in chronological order. Leave "To" empty for a current/final role.</p>
                    </div>

                    {/* ── Current Professions ── */}
                    <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                                <Briefcase className="w-3.5 h-3.5 text-primary" /> Current Professions
                            </p>
                            <Button type="button" variant="outline" size="sm" className="h-7 text-xs gap-1"
                                onClick={() => setProfessions(p => [...p, emptyProfession()])}>
                                <Plus className="w-3 h-3" /> Add
                            </Button>
                        </div>
                        <div className="space-y-4">
                            {professions.map((p, i) => (
                                <div key={i} className="border rounded-xl bg-background p-3 space-y-2">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs font-semibold text-muted-foreground">Position {i + 1}</span>
                                        <button type="button"
                                            onClick={() => setProfessions(prev => prev.filter((_, idx) => idx !== i))}
                                            className="text-muted-foreground hover:text-destructive transition-colors disabled:opacity-30"
                                            disabled={professions.length === 1}>
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <div className="grid md:grid-cols-2 gap-2">
                                        <Input placeholder="Job title / Role" value={p.title}
                                            onChange={e => updateProfession(i, "title", e.target.value)} />
                                        <Input placeholder="Company / Organization" value={p.organization}
                                            onChange={e => updateProfession(i, "organization", e.target.value)} />
                                    </div>
                                    <Input placeholder="Website URL (optional)" type="url" value={p.url}
                                        onChange={e => updateProfession(i, "url", e.target.value)} />
                                    <Input placeholder="Additional details (optional)" value={p.details}
                                        onChange={e => updateProfession(i, "details", e.target.value)} />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* ── Bio ── */}
                    <div className="space-y-2">
                        <Label htmlFor="bio">Bio / Notes (optional)</Label>
                        <textarea
                            id="bio" name="bio" defaultValue={editing?.bio ?? ""}
                            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-y"
                            placeholder="A few words about their contribution to the group..."
                        />
                    </div>

                    <div className="flex gap-2 pt-1 border-t">
                        <Button type="submit">{editing ? "Update" : "Add Ancien"}</Button>
                        <Button type="button" variant="outline" onClick={closeForm}>Cancel</Button>
                    </div>
                </form>
            )}

            {/* ── List ── */}
            {anciens.length === 0 ? (
                <div className="text-center py-20 border border-dashed rounded-2xl bg-muted/30">
                    <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                    <p className="text-muted-foreground mb-4">No anciens yet.</p>
                    <Button onClick={startCreate} className="gap-2"><Plus className="w-4 h-4" /> Add Ancien</Button>
                </div>
            ) : (
                <div className="space-y-3">
                    {anciens.map((a, idx) => (
                        <div key={a.id} className="border rounded-2xl bg-card p-4 flex items-start gap-4 hover:border-primary/30 transition-colors">
                            <div className="flex flex-col gap-1 shrink-0 mt-1">
                                <button onClick={() => move(idx, -1)} disabled={idx === 0} className="w-7 h-7 rounded-md border bg-background hover:bg-muted disabled:opacity-30 flex items-center justify-center"><ArrowUp className="w-3.5 h-3.5" /></button>
                                <button onClick={() => move(idx, 1)} disabled={idx === anciens.length - 1} className="w-7 h-7 rounded-md border bg-background hover:bg-muted disabled:opacity-30 flex items-center justify-center"><ArrowDown className="w-3.5 h-3.5" /></button>
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
                                {(a.joinedYear || a.leftYear) && (
                                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {a.joinedYear ?? "?"} → {a.leftYear ?? "present"}
                                    </p>
                                )}
                                {a.scoutRoles?.length > 0 && (
                                    <p className="text-xs text-primary font-medium mt-0.5">
                                        {a.scoutRoles.map((r: ScoutRoleEntry) => r.role).filter(Boolean).join(" · ")}
                                    </p>
                                )}
                                <div className="flex flex-wrap gap-1 mt-1">
                                    {a.progression?.map((p: string) => (
                                        <span key={p} className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                                            ★ {p}
                                        </span>
                                    ))}
                                    {a.professions?.length > 0 && (
                                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                                            {a.professions.length} profession{a.professions.length !== 1 ? "s" : ""}
                                        </span>
                                    )}
                                </div>
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
