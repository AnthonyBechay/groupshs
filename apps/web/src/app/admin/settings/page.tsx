"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Save, Settings as SettingsIcon, Upload, X, History } from "lucide-react";

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
};

export default function AdminSettingsPage() {
    const [settings, setSettings] = useState<Settings | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState("");
    const [logoUploading, setLogoUploading] = useState(false);
    const [logoUrl, setLogoUrl] = useState<string | null>(null);
    const logoInputRef = useRef<HTMLInputElement>(null);

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
        };

        const res = await fetch("/api/admin/settings", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });

        if (res.ok) {
            const updated = await res.json();
            setSettings(updated);
            setSuccess("Settings saved");
            setTimeout(() => setSuccess(""), 3000);
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

            <form onSubmit={handleSubmit} className="space-y-6">
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
