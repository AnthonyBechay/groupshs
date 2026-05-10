"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { Save, Settings as SettingsIcon } from "lucide-react";

type Settings = {
    groupFoundedYear: number;
    manualUnitCount: number | null;
    manualMemberCount: number | null;
};

export default function AdminSettingsPage() {
    const [settings, setSettings] = useState<Settings | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState("");

    useEffect(() => {
        fetch("/api/admin/settings").then(r => r.json()).then(data => {
            setSettings(data);
            setLoading(false);
        });
    }, []);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (!settings) return;
        setSaving(true);
        setSuccess("");
        const fd = new FormData(e.currentTarget);

        const groupFoundedYear = parseInt(fd.get("groupFoundedYear") as string);
        const unitCountStr = fd.get("manualUnitCount") as string;
        const memberCountStr = fd.get("manualMemberCount") as string;

        const body = {
            groupFoundedYear: isNaN(groupFoundedYear) ? settings.groupFoundedYear : groupFoundedYear,
            manualUnitCount: unitCountStr.trim() === "" ? null : parseInt(unitCountStr),
            manualMemberCount: memberCountStr.trim() === "" ? null : parseInt(memberCountStr),
        };

        const res = await fetch("/api/admin/settings", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });

        if (res.ok) {
            const updated = await res.json();
            setSettings(updated);
            setSuccess("Settings saved successfully");
            setTimeout(() => setSuccess(""), 3000);
        }
        setSaving(false);
    }

    if (loading) return <p className="text-muted-foreground">Loading...</p>;
    if (!settings) return <p className="text-destructive">Failed to load settings</p>;

    const currentYear = new Date().getFullYear();
    const yearsStrong = currentYear - settings.groupFoundedYear;

    return (
        <div className="max-w-2xl">
            <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <SettingsIcon className="w-6 h-6" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold">Site Settings</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">Stats shown on the landing page</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 border rounded-2xl p-8 bg-card">
                <div className="space-y-2">
                    <Label htmlFor="groupFoundedYear">Group founded year *</Label>
                    <Input
                        id="groupFoundedYear"
                        name="groupFoundedYear"
                        type="number"
                        min="1900"
                        max={currentYear}
                        defaultValue={settings.groupFoundedYear}
                        required
                    />
                    <p className="text-xs text-muted-foreground">
                        Currently displays as <span className="font-semibold text-foreground">{yearsStrong}+ years strong</span>
                    </p>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="manualUnitCount">Number of units (manual override)</Label>
                    <Input
                        id="manualUnitCount"
                        name="manualUnitCount"
                        type="number"
                        min="0"
                        placeholder="Leave empty to compute automatically"
                        defaultValue={settings.manualUnitCount ?? ""}
                    />
                    <p className="text-xs text-muted-foreground">Leave empty to count units automatically</p>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="manualMemberCount">Number of members (manual override)</Label>
                    <Input
                        id="manualMemberCount"
                        name="manualMemberCount"
                        type="number"
                        min="0"
                        placeholder="Leave empty to compute automatically"
                        defaultValue={settings.manualMemberCount ?? ""}
                    />
                    <p className="text-xs text-muted-foreground">Leave empty to count members automatically</p>
                </div>

                <div className="rounded-xl bg-muted/30 border p-4 text-sm">
                    <p className="font-semibold mb-1">Activities count is automatic</p>
                    <p className="text-muted-foreground text-xs">All activities since the group was founded are counted dynamically.</p>
                </div>

                <div className="flex items-center gap-3 pt-2">
                    <Button type="submit" disabled={saving} className="gap-2">
                        <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save Settings"}
                    </Button>
                    {success && <span className="text-sm text-emerald-600 font-medium">{success}</span>}
                </div>
            </form>
        </div>
    );
}
