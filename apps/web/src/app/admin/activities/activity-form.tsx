"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useRef } from "react";
import { Upload, X, FileText, ChevronDown, ArrowLeft, Repeat } from "lucide-react";
import { ACTIVITY_TYPES } from "@/lib/scout-config";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { MAX_SESSIONS } from "@/lib/activity-schedule";

type Unit = { id: string; name: string; unitType: string; imageUrl: string | null };
export type ActivityFormData = {
    id: string;
    title: string;
    description: string;
    unitId: string;
    activityType: string;
    startDate: string;
    endDate: string | null;
    recurrence: string | null;
    recurrenceUntil: string | null;
    pickupTime: string | null;
    dropoffTime: string | null;
    pickupLocation: string | null;
    dropoffLocation: string | null;
    location: string | null;
    pickupLocationUrl: string | null;
    dropoffLocationUrl: string | null;
    locationUrl: string | null;
    imageUrl: string | null;
    hidden: boolean;
    totalDays: number | null;
    theme: string | null;
    fee: string | null;
};

const SELECT_CLASS = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm";

/** Most activities start in the morning and end in the afternoon. */
const DEFAULT_DROPOFF_TIME = "08:00";
const DEFAULT_PICKUP_TIME = "17:00";

/**
 * The add / edit form, shown on its own.
 *
 * The three numbered steps are exactly what a circular reads — fill them and
 * the letter writes itself. Everything that only concerns the website sits
 * behind "Website and other options".
 */
export function ActivityForm({ editing, units, closeByBack, onDone, defaultUnitId }: {
    editing: ActivityFormData | null;
    /** Pre-selected unit for a new activity (the unit being viewed). */
    defaultUnitId?: string;
    units: Unit[];
    /** The form has its own history entry (or the user was sent here): close by going back. */
    closeByBack: boolean;
    onDone: () => void;
}) {
    const [imageUrl, setImageUrl] = useState<string | null>(editing?.imageUrl ?? null);
    // A weekly reunion repeats by nature; any other type can be made to repeat.
    const [repeats, setRepeats] = useState(!!editing?.recurrence);
    const [uploading, setUploading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [dirty, setDirty] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { leaveTo, leaveBack } = useUnsavedChanges(dirty, "This activity has unsaved changes. Leave and discard them?");

    const close = () => (closeByBack ? leaveBack() : onDone());

    const hasExtras = !!(editing && (editing.description || editing.imageUrl || editing.hidden || editing.totalDays
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
            description: fd.get("description") || "",
            unitId: fd.get("unitId"),
            activityType: fd.get("activityType"),
            startDate,
            endDate: repeats ? null : fd.get("endDate") || null,
            recurrence: repeats ? "WEEKLY" : null,
            recurrenceUntil: repeats ? fd.get("recurrenceUntil") || null : null,
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

        // Replacing: the form just submitted must not be one Back press away
        // from the circulars page, ready to create the activity a second time.
        if (toCircular) leaveTo(`/admin/activities/${saved.id}/circulars`, { replace: true });
        // A new activity opens on its own page, where its sessions are.
        else if (!editing) leaveTo(`/admin/activities/${saved.id}`, { replace: true });
        else close();
    }

    return (
        <form
            onSubmit={handleSubmit}
            onInput={() => setDirty(true)}
            onChange={() => setDirty(true)}
            className="max-w-3xl mx-auto"
        >
            <button type="button" onClick={close} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary mb-3">
                <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <h1 className="text-3xl font-bold mb-6">{editing ? editing.title : "New activity"}</h1>

            <div className="border rounded-2xl bg-card divide-y">
                <Step n="1" title="What">
                    <div className="grid sm:grid-cols-[1fr_11rem_9rem] gap-3">
                        <Field label="Title" htmlFor="title">
                            <Input id="title" name="title" defaultValue={editing?.title} required autoFocus={!editing} placeholder="e.g. Summer Camp" />
                        </Field>
                        <Field label="Unit" htmlFor="unitId">
                            <select id="unitId" name="unitId" defaultValue={editing?.unitId || defaultUnitId || ""} required className={SELECT_CLASS}>
                                <option value="">Select...</option>
                                {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                            </select>
                        </Field>
                        <Field label="Type" htmlFor="activityType">
                            <select
                                id="activityType" name="activityType" defaultValue={editing?.activityType || "OTHER"} required className={SELECT_CLASS}
                                onChange={e => { if (e.target.value === "REUNION") setRepeats(true); }}
                            >
                                {ACTIVITY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                            </select>
                        </Field>
                    </div>
                </Step>

                <Step n="2" title="When and where">
                    <label className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-colors ${repeats ? "border-primary/40 bg-primary/5" : "hover:bg-muted/30"}`}>
                        <input type="checkbox" checked={repeats} onChange={e => { setRepeats(e.target.checked); setDirty(true); }} className="accent-primary mt-0.5" />
                        <span>
                            <span className="text-sm font-semibold flex items-center gap-1.5"><Repeat className="w-4 h-4" /> Repeats every week</span>
                            <span className="block text-xs text-muted-foreground">
                                Created once; each week gets its own programme and attendance, and any single week can be cancelled.
                            </span>
                        </span>
                    </label>
                    <div className="grid sm:grid-cols-[10rem_10rem_1fr] gap-3">
                        <Field label={repeats ? "First session" : "From"} htmlFor="startDate">
                            <Input id="startDate" name="startDate" type="date" defaultValue={editing ? new Date(editing.startDate).toISOString().slice(0, 10) : ""} required />
                        </Field>
                        {repeats ? (
                            <Field label="Last session" htmlFor="recurrenceUntil" hint={`Up to ${MAX_SESSIONS} weeks`}>
                                <Input id="recurrenceUntil" name="recurrenceUntil" type="date" required defaultValue={editing?.recurrenceUntil ? new Date(editing.recurrenceUntil).toISOString().slice(0, 10) : ""} />
                            </Field>
                        ) : (
                            <Field label="To" htmlFor="endDate" hint="Empty = one day">
                                <Input id="endDate" name="endDate" type="date" defaultValue={editing?.endDate ? new Date(editing.endDate).toISOString().slice(0, 10) : ""} />
                            </Field>
                        )}
                        <Field label="Location" htmlFor="location">
                            <Input id="location" name="location" defaultValue={editing?.location || ""} placeholder="Where it takes place" />
                        </Field>
                    </div>
                    <div className="grid sm:grid-cols-[10rem_1fr] gap-3">
                        <Field label="Drop-off at" htmlFor="dropoffTime">
                            <Input id="dropoffTime" name="dropoffTime" type="time" defaultValue={editing ? editing.dropoffTime || "" : DEFAULT_DROPOFF_TIME} />
                        </Field>
                        <Field label="Drop-off place" htmlFor="dropoffLocation">
                            <Input id="dropoffLocation" name="dropoffLocation" defaultValue={editing?.dropoffLocation || ""} placeholder="Where families bring the children" />
                        </Field>
                        <Field label="Pick-up at" htmlFor="pickupTime">
                            <Input id="pickupTime" name="pickupTime" type="time" defaultValue={editing ? editing.pickupTime || "" : DEFAULT_PICKUP_TIME} />
                        </Field>
                        <Field label="Pick-up place" htmlFor="pickupLocation">
                            <Input id="pickupLocation" name="pickupLocation" defaultValue={editing?.pickupLocation || ""} placeholder="Leave empty if it is the same place" />
                        </Field>
                    </div>
                </Step>

                <Step n="3" title="Theme and fee" note="optional">
                    <div className="grid sm:grid-cols-[1fr_10rem] gap-3">
                        <Field label="Theme" htmlFor="theme">
                            <Input id="theme" name="theme" defaultValue={editing?.theme || ""} placeholder="e.g. Voyager vers la Flamme" />
                        </Field>
                        <Field label="Fee" htmlFor="fee">
                            <Input id="fee" name="fee" defaultValue={editing?.fee || ""} placeholder="e.g. $25" />
                        </Field>
                    </div>
                </Step>

                <details className="group" open={hasExtras}>
                    <summary className="cursor-pointer list-none flex items-center gap-2 px-5 py-3.5 text-sm font-semibold text-muted-foreground hover:text-foreground">
                        <ChevronDown className="w-4 h-4 transition-transform group-open:rotate-180" />
                        Website and other options
                    </summary>
                    <div className="px-5 pb-5 space-y-4">
                        <Field label="Description on the website" htmlFor="description">
                            <textarea id="description" name="description" defaultValue={editing?.description} rows={2} className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                        </Field>

                        <Field label="Poster or graphic" hint="A fun visual, if you made one. Without it the unit's logo is shown.">
                            <div className="flex items-center gap-3">
                                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                                <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="gap-2">
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
                        </Field>

                        <div className="grid sm:grid-cols-3 gap-3">
                            <Field label="Location map link" htmlFor="locationUrl">
                                <Input id="locationUrl" name="locationUrl" type="url" defaultValue={editing?.locationUrl || ""} placeholder="https://maps..." />
                            </Field>
                            <Field label="Drop-off map link" htmlFor="dropoffLocationUrl">
                                <Input id="dropoffLocationUrl" name="dropoffLocationUrl" type="url" defaultValue={editing?.dropoffLocationUrl || ""} placeholder="https://maps..." />
                            </Field>
                            <Field label="Pick-up map link" htmlFor="pickupLocationUrl">
                                <Input id="pickupLocationUrl" name="pickupLocationUrl" type="url" defaultValue={editing?.pickupLocationUrl || ""} placeholder="https://maps..." />
                            </Field>
                        </div>

                        <div className="grid sm:grid-cols-[10rem_1fr] gap-3 items-end">
                            <Field label="Attendance days" htmlFor="totalDays">
                                <Input id="totalDays" name="totalDays" type="number" min="1" defaultValue={editing?.totalDays || ""} placeholder="e.g. 3" />
                            </Field>
                            <label className="flex items-center gap-2 h-10 rounded-md border px-3 text-sm cursor-pointer">
                                <input type="checkbox" id="hidden" name="hidden" defaultChecked={editing?.hidden ?? false} className="accent-primary" />
                                Hide from the public site
                            </label>
                        </div>
                    </div>
                </details>
            </div>

            <div className="sticky bottom-4 z-10 mt-5 flex flex-wrap items-center gap-2 bg-card border rounded-xl px-3 py-2 shadow-lg">
                <Button type="submit" value="circular" disabled={saving} className="gap-2">
                    <FileText className="w-4 h-4" /> {saving ? "Saving..." : editing ? "Save & open circulars" : "Create & generate circular"}
                </Button>
                <Button type="submit" value="save" variant="outline" disabled={saving}>{editing ? "Save" : "Create only"}</Button>
                <Button type="button" variant="ghost" onClick={close} className="ml-auto">Cancel</Button>
            </div>
        </form>
    );
}

function Step({ n, title, note, children }: { n: string; title: string; note?: string; children: React.ReactNode }) {
    return (
        <div className="p-5 space-y-3">
            <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">{n}</span>
                <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">{title}</h2>
                {note && <span className="text-xs text-muted-foreground/70">— {note}</span>}
            </div>
            {children}
        </div>
    );
}

function Field({ label, htmlFor, hint, children }: { label: string; htmlFor?: string; hint?: string; children: React.ReactNode }) {
    return (
        <div className="space-y-1.5 min-w-0">
            <Label htmlFor={htmlFor} className="text-xs">{label}</Label>
            {children}
            {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
        </div>
    );
}
