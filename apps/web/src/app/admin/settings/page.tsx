"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Save, Settings as SettingsIcon, Upload, X, History, ArrowUpRight, Info } from "lucide-react";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";

const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];

type Settings = {
    groupFoundedYear: number;
    manualUnitCount: number | null;
    manualMemberCount: number | null;
    logoUrl: string | null;
    footerDescription: string | null;
    footerAddress: string | null;
    footerPhone: string | null;
    footerEmail: string | null;
    aboutTitle: string | null;
    aboutSubtitle: string | null;
    aboutIntro: string | null;
    aboutMission: string | null;
    fiscalYearStartMonth: number;
    ageLouveteauxToEclaireurs: number;
    ageEclaireursToRoutiers: number;
    ageLouvettesToEclaireuses: number;
    ageEclaireusesToPionnieres: number;
};

export default function AdminSettingsPage() {
    const [settings, setSettings] = useState<Settings | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState("");
    const [logoUploading, setLogoUploading] = useState(false);
    const [logoUrl, setLogoUrl] = useState<string | null>(null);
    const logoInputRef = useRef<HTMLInputElement>(null);
    const [dirty, setDirty] = useState(false);

    // Warn before navigating away with unsaved edits.
    useUnsavedChanges(dirty, "You have unsaved settings. Leave and discard them?");

    useEffect(() => {
        fetch("/api/admin/settings").then(r => r.json()).then(data => {
            setSettings(data);
            setLogoUrl(data.logoUrl ?? null);
            setLoading(false);
        });
    }, []);

    async function uploadLogo(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        setLogoUploading(true);
        const fd = new FormData();
        fd.append("file", file);
        fd.append("preserveAlpha", "true");
        try {
            const res = await fetch("/api/upload", { method: "POST", body: fd });
            const json = await res.json();
            if (res.ok) setLogoUrl(json.url);
            else alert(json.error || "Upload failed");
        } finally {
            setLogoUploading(false);
            if (logoInputRef.current) logoInputRef.current.value = "";
        }
    }

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (!settings) return;
        setSaving(true);
        setSuccess("");
        const fd = new FormData(e.currentTarget);

        const num = (v: string | null) => v && v.trim() !== "" ? parseInt(v) : null;

        const body = {
            groupFoundedYear: parseInt(fd.get("groupFoundedYear") as string) || settings.groupFoundedYear,
            manualUnitCount: num(fd.get("manualUnitCount") as string),
            manualMemberCount: num(fd.get("manualMemberCount") as string),
            logoUrl,
            footerDescription: (fd.get("footerDescription") as string) || null,
            footerAddress: (fd.get("footerAddress") as string) || null,
            footerPhone: (fd.get("footerPhone") as string) || null,
            footerEmail: (fd.get("footerEmail") as string) || null,
            aboutTitle: (fd.get("aboutTitle") as string) || null,
            aboutSubtitle: (fd.get("aboutSubtitle") as string) || null,
            aboutIntro: (fd.get("aboutIntro") as string) || null,
            aboutMission: (fd.get("aboutMission") as string) || null,
            fiscalYearStartMonth: parseInt(fd.get("fiscalYearStartMonth") as string) || settings.fiscalYearStartMonth,
            ageLouveteauxToEclaireurs: parseInt(fd.get("ageLouveteauxToEclaireurs") as string) || settings.ageLouveteauxToEclaireurs,
            ageEclaireursToRoutiers: parseInt(fd.get("ageEclaireursToRoutiers") as string) || settings.ageEclaireursToRoutiers,
            ageLouvettesToEclaireuses: parseInt(fd.get("ageLouvettesToEclaireuses") as string) || settings.ageLouvettesToEclaireuses,
            ageEclaireusesToPionnieres: parseInt(fd.get("ageEclaireusesToPionnieres") as string) || settings.ageEclaireusesToPionnieres,
        };

        const res = await fetch("/api/admin/settings", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });

        if (res.ok) {
            const updated = await res.json();
            setSettings(updated);
            setDirty(false);
            setSuccess("Settings saved");
            setTimeout(() => setSuccess(""), 3000);
        } else {
            const err = await res.json().catch(() => ({}));
            alert(err.error || "Could not save the settings");
        }
        setSaving(false);
    }

    if (loading) return <p className="text-muted-foreground">Loading...</p>;
    if (!settings) return <p className="text-destructive">Failed to load settings</p>;

    const currentYear = new Date().getFullYear();
    const yearsStrong = currentYear - settings.groupFoundedYear;

    return (
        <div className="max-w-3xl">
            <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <SettingsIcon className="w-6 h-6" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold">Site Settings</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">Site-wide content, branding, stats and footer info</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} onChange={() => setDirty(true)} className="space-y-6">
                {/* Branding */}
                <Card title="Branding">
                    <div className="space-y-2">
                        <Label>Group Logo</Label>
                        <div className="flex items-center gap-4">
                            <div className="w-20 h-20 rounded-xl border flex items-center justify-center overflow-hidden">
                                {logoUrl ? (
                                    /* eslint-disable-next-line @next/next/no-img-element */
                                    <img src={logoUrl} alt="Logo" className="w-full h-full object-contain p-1" />
                                ) : (
                                    <span className="text-xs text-muted-foreground text-center px-2">No logo</span>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <input ref={logoInputRef} type="file" accept="image/png,image/svg+xml,image/webp" onChange={uploadLogo} className="hidden" />
                                <Button type="button" variant="outline" onClick={() => logoInputRef.current?.click()} disabled={logoUploading} className="gap-2">
                                    <Upload className="w-4 h-4" /> {logoUploading ? "Uploading..." : logoUrl ? "Change logo" : "Upload logo"}
                                </Button>
                                {logoUrl && (
                                    <Button type="button" variant="ghost" onClick={() => setLogoUrl(null)} className="text-destructive">
                                        <X className="w-4 h-4" />
                                    </Button>
                                )}
                            </div>
                        </div>
                        <p className="text-xs text-muted-foreground">Use a PNG or SVG with a transparent background. Transparency is preserved (no white box).</p>
                    </div>
                </Card>

                {/* Stats */}
                <Card title="Landing stats">
                    <div className="space-y-2">
                        <Label htmlFor="groupFoundedYear">Group founded year</Label>
                        <Input id="groupFoundedYear" name="groupFoundedYear" type="number" min="1900" max={currentYear} defaultValue={settings.groupFoundedYear} required />
                        <p className="text-xs text-muted-foreground">Displays as <strong>{yearsStrong}+ years strong</strong></p>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="manualUnitCount">Number of units override (optional)</Label>
                        <Input id="manualUnitCount" name="manualUnitCount" type="number" min="0" placeholder="Leave empty to compute" defaultValue={settings.manualUnitCount ?? ""} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="manualMemberCount">Number of members override (optional)</Label>
                        <Input id="manualMemberCount" name="manualMemberCount" type="number" min="0" placeholder="Leave empty to compute" defaultValue={settings.manualMemberCount ?? ""} />
                    </div>
                </Card>

                {/* Age transitions */}
                <Card title="Moving up between branches" extra={
                    <Link href="/admin/transitions" className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-1">
                        Run a transition <ArrowUpRight className="w-3 h-3" />
                    </Link>
                }>
                    <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 flex items-start gap-2.5">
                        <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        <p className="text-xs text-muted-foreground">
                            A member is due to move up when they reach the age below <strong className="text-foreground">at any point
                            during the fiscal year</strong>. Example: with a September start and an age of 12, a Louveteau turning 12
                            between 1 September and 31 August is due to join the Eclaireurs.
                            The maîtrise is never moved by age.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="fiscalYearStartMonth">Fiscal year starts in</Label>
                        <select
                            id="fiscalYearStartMonth"
                            name="fiscalYearStartMonth"
                            defaultValue={settings.fiscalYearStartMonth}
                            className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                        >
                            {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                        </select>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-5 pt-1">
                        {/* Boys */}
                        <div className="space-y-3 rounded-xl border p-4 bg-background">
                            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Boys</h3>
                            <div className="space-y-2">
                                <Label htmlFor="ageLouveteauxToEclaireurs" className="text-xs font-normal">
                                    Louveteaux → Eclaireurs at age
                                </Label>
                                <Input id="ageLouveteauxToEclaireurs" name="ageLouveteauxToEclaireurs" type="number" min="5" max="30" defaultValue={settings.ageLouveteauxToEclaireurs} required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="ageEclaireursToRoutiers" className="text-xs font-normal">
                                    Eclaireurs → Routiers at age
                                </Label>
                                <Input id="ageEclaireursToRoutiers" name="ageEclaireursToRoutiers" type="number" min="5" max="30" defaultValue={settings.ageEclaireursToRoutiers} required />
                            </div>
                        </div>

                        {/* Girls */}
                        <div className="space-y-3 rounded-xl border p-4 bg-background">
                            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Girls</h3>
                            <div className="space-y-2">
                                <Label htmlFor="ageLouvettesToEclaireuses" className="text-xs font-normal">
                                    Louvettes → Eclaireuses at age
                                </Label>
                                <Input id="ageLouvettesToEclaireuses" name="ageLouvettesToEclaireuses" type="number" min="5" max="30" defaultValue={settings.ageLouvettesToEclaireuses} required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="ageEclaireusesToPionnieres" className="text-xs font-normal">
                                    Eclaireuses → Pionnieres at age
                                </Label>
                                <Input id="ageEclaireusesToPionnieres" name="ageEclaireusesToPionnieres" type="number" min="5" max="30" defaultValue={settings.ageEclaireusesToPionnieres} required />
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Footer */}
                <Card title="Footer content">
                    <div className="space-y-2">
                        <Label htmlFor="footerDescription">Description paragraph</Label>
                        <textarea id="footerDescription" name="footerDescription" defaultValue={settings.footerDescription ?? ""} rows={3} className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="Short description shown in the website footer." />
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="footerAddress">Address</Label>
                            <Input id="footerAddress" name="footerAddress" defaultValue={settings.footerAddress ?? ""} placeholder="Ain Saade, Metn, Lebanon" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="footerPhone">Phone / contact line</Label>
                            <Input id="footerPhone" name="footerPhone" defaultValue={settings.footerPhone ?? ""} placeholder="CG Johnny Saad - 71 297 333" />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="footerEmail">Email</Label>
                            <Input id="footerEmail" name="footerEmail" type="email" defaultValue={settings.footerEmail ?? ""} placeholder="info@groupshs.org" />
                        </div>
                    </div>
                </Card>

                {/* About page intro */}
                <Card title="About page intro" extra={
                    <Link href="/admin/about" className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-1">
                        Manage timeline <History className="w-3 h-3" />
                    </Link>
                }>
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="aboutTitle">Hero title</Label>
                            <Input id="aboutTitle" name="aboutTitle" defaultValue={settings.aboutTitle ?? ""} placeholder="Our Story" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="aboutSubtitle">Hero subtitle</Label>
                            <Input id="aboutSubtitle" name="aboutSubtitle" defaultValue={settings.aboutSubtitle ?? ""} placeholder="A journey since 2014" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="aboutIntro">Intro paragraph</Label>
                        <textarea id="aboutIntro" name="aboutIntro" defaultValue={settings.aboutIntro ?? ""} rows={4} className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="aboutMission">Mission paragraph</Label>
                        <textarea id="aboutMission" name="aboutMission" defaultValue={settings.aboutMission ?? ""} rows={4} className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                    </div>
                </Card>

                <div className="sticky bottom-4 z-10 flex justify-end">
                    <div className="flex items-center gap-3 bg-card border rounded-xl px-3 py-2 shadow-lg">
                        {success && <span className="text-sm text-emerald-600 font-medium">{success}</span>}
                        <Button type="submit" disabled={saving} className="gap-2">
                            <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save"}
                        </Button>
                    </div>
                </div>
            </form>
        </div>
    );
}

function Card({ title, children, extra }: { title: string; children: React.ReactNode; extra?: React.ReactNode }) {
    return (
        <div className="border rounded-2xl bg-card p-6 space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">{title}</h2>
                {extra}
            </div>
            {children}
        </div>
    );
}
