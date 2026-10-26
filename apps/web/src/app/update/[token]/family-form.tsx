"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { CheckCircle2, Loader2, Lock, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { BLOOD_TYPES, FAMILY_FIELD_GROUPS, type FieldDef, type Medication, type Sibling } from "@/lib/member-update";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";

type Step = "verify" | "form" | "done";
const EMPTY_MED: Medication = { name: "", dosage: "", timeToTake: "", startDate: "", endDate: "" };
const EMPTY_SIB: Sibling = { name: "", schoolClass: "", unitName: "" };

export function FamilyForm({ token, firstName, unitName, needsDob, expiresAt }: {
    token: string; firstName: string; unitName: string; needsDob: boolean; expiresAt: string;
}) {
    const [step, setStep] = useState<Step>("verify");
    const [dob, setDob] = useState("");
    const [fields, setFields] = useState<Record<string, string>>({});
    const [meds, setMeds] = useState<Medication[]>([]);
    const [sibs, setSibs] = useState<Sibling[]>([]);
    const [consent, setConsent] = useState(false);
    const [name, setName] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [dirty, setDirty] = useState(false);
    useUnsavedChanges(dirty && step === "form", "Your answers are not sent yet. Leave and lose them?");

    const api = (body: object) => fetch(`/api/family-update/${encodeURIComponent(token)}`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dob, ...body }),
    });

    async function open(e?: React.FormEvent) {
        e?.preventDefault();
        setBusy(true); setError("");
        const res = await api({ action: "open" });
        const d = await res.json().catch(() => ({}));
        setBusy(false);
        if (!res.ok) { setError(d.error || "Something went wrong"); return; }
        setFields(Object.fromEntries(Object.entries(d.fields as Record<string, string | number | null>).map(([k, v]) => [k, v == null ? "" : String(v)])));
        setMeds(d.medications);
        setSibs(d.siblings ?? []);
        setStep("form");
        window.scrollTo({ top: 0 });
    }

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        setBusy(true); setError("");
        const res = await api({
            action: "submit", submittedBy: name, fields, consent,
            medications: meds.filter(m => m.name.trim()),
            siblings: sibs.filter(s => s.name.trim()),
        });
        const d = await res.json().catch(() => ({}));
        setBusy(false);
        if (!res.ok) { setError(d.error || "Something went wrong"); return; }
        setDirty(false);
        setStep("done");
        window.scrollTo({ top: 0 });
    }

    const set = (k: string, v: string) => { setFields(f => ({ ...f, [k]: v })); setDirty(true); };
    const setMed = (i: number, patch: Partial<Medication>) => { setMeds(ms => ms.map((m, j) => (j === i ? { ...m, ...patch } : m))); setDirty(true); };
    const setSib = (i: number, patch: Partial<Sibling>) => { setSibs(ss => ss.map((s, j) => (j === i ? { ...s, ...patch } : s))); setDirty(true); };
    const until = new Date(expiresAt).toLocaleDateString("en-GB", { day: "numeric", month: "long" });

    if (step === "done") {
        return (
            <div className="text-center py-16">
                <CheckCircle2 className="w-14 h-14 text-emerald-600 mx-auto mb-4" />
                <h1 className="text-2xl font-bold">Thank you!</h1>
                <p className="text-muted-foreground mt-2">
                    {firstName}&apos;s leader will check your answers and update the file. You can close this page.
                </p>
            </div>
        );
    }

    if (step === "verify") {
        return (
            <form onSubmit={open} className="bg-card border rounded-3xl p-6 md:p-8 space-y-5">
                <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-primary">Group SHS · {unitName}</p>
                    <h1 className="text-2xl md:text-3xl font-black mt-1">{firstName}&apos;s scout file</h1>
                    <p className="text-sm text-muted-foreground mt-2">
                        The purpose is to make sure {firstName}&apos;s basic health and allergy information is up to date,
                        along with the contacts we call if needed. It is only used by the leaders, to look after your child during activities.
                    </p>
                    <p className="text-xs text-muted-foreground mt-2 rounded-lg bg-muted/60 px-3 py-2">
                        This link is for {firstName}&apos;s family only and can be sent once. It works until {until}.
                        If you need another one, just tell your child&apos;s leader.
                    </p>
                </div>
                {needsDob ? (
                    <div className="space-y-2">
                        <Label htmlFor="dob" className="flex items-center gap-1.5"><Lock className="w-3.5 h-3.5" /> To continue, enter {firstName}&apos;s date of birth</Label>
                        <Input id="dob" type="date" required value={dob} onChange={e => setDob(e.target.value)} className="max-w-xs" />
                    </div>
                ) : null}
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button type="submit" disabled={busy || (needsDob && !dob)} className="gap-2">
                    {busy && <Loader2 className="w-4 h-4 animate-spin" />} Open the file
                </Button>
            </form>
        );
    }

    return (
        <form onSubmit={submit} className="space-y-5">
            <div>
                <p className="text-xs font-bold uppercase tracking-widest text-primary">Group SHS · {unitName}</p>
                <h1 className="text-2xl md:text-3xl font-black mt-1">{firstName}&apos;s scout file</h1>
                <p className="text-sm text-muted-foreground mt-1">Correct anything that is wrong and fill in what is missing. Leave a field empty if it does not apply.</p>
            </div>

            {FAMILY_FIELD_GROUPS.map(g => (
                <section key={g.title} className="bg-card border rounded-2xl p-5 space-y-4">
                    <h2 className="font-bold">{g.title}</h2>
                    <div className="grid sm:grid-cols-2 gap-4">
                        {g.fields.map(f => <FieldInput key={f.key} f={f} value={fields[f.key] ?? ""} onChange={v => set(f.key, v)} />)}
                    </div>
                    {g.title === "Family" && (
                        <div className="border-t pt-4 space-y-3">
                            <div>
                                <h3 className="text-sm font-semibold">Brothers and sisters in the group</h3>
                                <p className="text-xs text-muted-foreground">Only those who are scouts with us too.</p>
                            </div>
                            {sibs.map((s, i) => (
                                <div key={i} className="grid grid-cols-2 sm:grid-cols-[1fr_8rem_9rem_auto] gap-2 items-end rounded-xl border p-3">
                                    <Field label="Name"><Input value={s.name} onChange={e => setSib(i, { name: e.target.value })} /></Field>
                                    <Field label="Class"><Input value={s.schoolClass} onChange={e => setSib(i, { schoolClass: e.target.value })} /></Field>
                                    <Field label="Unit"><Input value={s.unitName} onChange={e => setSib(i, { unitName: e.target.value })} placeholder="e.g. Meute Hathi" /></Field>
                                    <button type="button" onClick={() => { setSibs(ss => ss.filter((_, j) => j !== i)); setDirty(true); }} className="h-10 px-2 text-muted-foreground hover:text-destructive" aria-label="Remove">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                            <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => { setSibs(ss => [...ss, { ...EMPTY_SIB }]); setDirty(true); }}>
                                <Plus className="w-4 h-4" /> Add a brother or sister
                            </Button>
                        </div>
                    )}
                    {g.title === "Medical" && (
                        <div className="border-t pt-4 space-y-3">
                            <div>
                                <h3 className="text-sm font-semibold">Current treatment</h3>
                                <p className="text-xs text-muted-foreground">Medicines {firstName} must take during scout activities.</p>
                            </div>
                            {meds.map((m, i) => (
                                <div key={i} className="grid grid-cols-2 sm:grid-cols-[1fr_8rem_7rem_auto] gap-2 items-end rounded-xl border p-3">
                                    <Field label="Medicine"><Input value={m.name} onChange={e => setMed(i, { name: e.target.value })} /></Field>
                                    <Field label="Dosage"><Input value={m.dosage} onChange={e => setMed(i, { dosage: e.target.value })} /></Field>
                                    <Field label="When"><Input value={m.timeToTake} onChange={e => setMed(i, { timeToTake: e.target.value })} placeholder="08:00" /></Field>
                                    <span className="hidden sm:block" />
                                    <Field label="From"><Input type="date" value={m.startDate} onChange={e => setMed(i, { startDate: e.target.value })} /></Field>
                                    <Field label="Until"><Input type="date" value={m.endDate} onChange={e => setMed(i, { endDate: e.target.value })} /></Field>
                                    <button type="button" onClick={() => { setMeds(ms => ms.filter((_, j) => j !== i)); setDirty(true); }} className="h-10 px-2 text-muted-foreground hover:text-destructive" aria-label="Remove">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                            <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => { setMeds(ms => [...ms, { ...EMPTY_MED }]); setDirty(true); }}>
                                <Plus className="w-4 h-4" /> Add a medicine
                            </Button>
                        </div>
                    )}
                </section>
            ))}

            <section className="bg-card border rounded-2xl p-5 space-y-4">
                <label className="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" checked={consent} onChange={e => { setConsent(e.target.checked); setDirty(true); }} className="accent-primary mt-1" />
                    <span className="text-sm">
                        I authorize the leaders of Group SHS to take the necessary measures, including medical care, should {firstName} need it during an activity.
                    </span>
                </label>
                <Field label="Your name *">
                    <Input value={name} onChange={e => setName(e.target.value)} required placeholder="e.g. Rita Khoury (mother)" />
                </Field>
                <p className="text-xs text-muted-foreground flex items-start gap-1.5">
                    <ShieldCheck className="w-4 h-4 shrink-0 text-primary" />
                    Nothing changes right away: a leader reviews your answers first.
                </p>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button type="submit" disabled={busy} className="gap-2 w-full sm:w-auto">
                    {busy && <Loader2 className="w-4 h-4 animate-spin" />} Send to the leaders
                </Button>
            </section>
        </form>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return <div className="space-y-1.5 min-w-0"><Label className="text-xs">{label}</Label>{children}</div>;
}

function FieldInput({ f, value, onChange }: { f: FieldDef; value: string; onChange: (v: string) => void }) {
    const input = f.type === "textarea" ? (
        <textarea value={value} onChange={e => onChange(e.target.value)} rows={2} className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="None" />
    ) : f.type === "blood" ? (
        <select value={value} onChange={e => onChange(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
            <option value="">Don&apos;t know</option>
            {BLOOD_TYPES.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
    ) : f.type === "number" ? (
        <Input type="number" min={0} max={20} inputMode="numeric" value={value} onChange={e => onChange(e.target.value)} />
    ) : (
        <Input type={f.type === "tel" ? "tel" : f.type} value={value} onChange={e => onChange(e.target.value)} />
    );
    return (
        <div className={`space-y-1.5 min-w-0 ${f.type === "textarea" ? "sm:col-span-2" : ""}`}>
            <Label className="text-xs">{f.label}</Label>
            {input}
            {f.hint && <p className="text-[11px] text-muted-foreground">{f.hint}</p>}
        </div>
    );
}
