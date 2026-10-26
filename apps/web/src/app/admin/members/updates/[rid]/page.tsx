"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Loader2, X } from "lucide-react";
import { FAMILY_FIELD_GROUPS, type Medication, type SubmittedChanges } from "@/lib/member-update";

type Data = {
    id: string; state: string; submittedAt: string | null; submittedBy: string | null;
    reviewedAt: string | null; reviewedByName: string | null; reviewNote: string | null; appliedFields: string[];
    changes: SubmittedChanges;
    member: Record<string, unknown> & { id: string; firstName: string; lastName: string; consentSignedAt: string | null; unit: { name: string } };
    currentMedications: Medication[];
};

const show = (v: unknown) => (v == null || v === "" ? <span className="italic text-muted-foreground">empty</span> : String(v));
const medLine = (m: Medication) => [m.name, m.dosage, m.timeToTake].filter(Boolean).join(" · ");

/**
 * Review one family's answers: every change next to what the file says now,
 * each ticked by default. Apply keeps the ticked ones; the rest are dropped.
 */
export default function ReviewUpdatePage() {
    const { rid } = useParams<{ rid: string }>();
    const router = useRouter();
    const [data, setData] = useState<Data | null>(null);
    const [error, setError] = useState("");
    const [keep, setKeep] = useState<Set<string>>(new Set());
    const [note, setNote] = useState("");
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        fetch(`/api/admin/update-requests/${rid}`).then(async r => {
            if (!r.ok) { setError((await r.json().catch(() => ({}))).error || "Could not load"); return; }
            const d: Data = await r.json();
            setData(d);
            const all = Object.keys(d.changes.fields ?? {});
            if (d.changes.medications) all.push("medications");
            if (d.changes.consent) all.push("consent");
            setKeep(new Set(all));
        });
    }, [rid]);

    const groups = useMemo(() => {
        if (!data) return [];
        const changed = data.changes.fields ?? {};
        return FAMILY_FIELD_GROUPS
            .map(g => ({ title: g.title, fields: g.fields.filter(f => f.key in changed) }))
            .filter(g => g.fields.length > 0);
    }, [data]);

    if (error) return <p className="text-destructive">{error}</p>;
    if (!data) return <p className="text-muted-foreground">Loading…</p>;

    const toggle = (k: string) => setKeep(prev => { const n = new Set(prev); if (n.has(k)) n.delete(k); else n.add(k); return n; });
    const reviewable = data.state === "SUBMITTED";
    const total = Object.keys(data.changes.fields ?? {}).length + (data.changes.medications ? 1 : 0) + (data.changes.consent ? 1 : 0);

    async function decide(action: "apply" | "reject") {
        if (action === "apply" && keep.size === 0 && !confirm("Nothing is ticked: this rejects the whole submission. Continue?")) return;
        if (action === "reject" && !confirm("Reject everything the family sent?")) return;
        setBusy(true);
        const res = await fetch(`/api/admin/update-requests/${rid}`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                action, note,
                fields: [...keep].filter(k => k !== "medications" && k !== "consent"),
                medications: keep.has("medications"),
                consent: keep.has("consent"),
            }),
        });
        setBusy(false);
        if (!res.ok) { alert((await res.json().catch(() => ({}))).error || "Could not save"); return; }
        router.push("/admin/members/updates");
    }

    return (
        <div className="max-w-3xl mx-auto space-y-5">
            <Link href="/admin/members/updates" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary">
                <ArrowLeft className="w-4 h-4" /> Family updates
            </Link>
            <div>
                <h1 className="text-2xl md:text-3xl font-bold">{data.member.firstName} {data.member.lastName}</h1>
                <p className="text-sm text-muted-foreground">
                    {data.member.unit.name} · {total} change{total !== 1 ? "s" : ""} sent by <strong className="text-foreground">{data.submittedBy}</strong>
                    {data.submittedAt && ` on ${new Date(data.submittedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long" })}`}
                </p>
                {!reviewable && (
                    <p className="mt-2 text-sm rounded-lg bg-muted px-3 py-2">
                        Already {data.state === "APPROVED" ? "applied" : "handled"}{data.reviewedByName ? ` by ${data.reviewedByName}` : ""}.
                        {data.reviewNote ? ` Note: ${data.reviewNote}` : ""}
                    </p>
                )}
            </div>

            {groups.map(g => (
                <section key={g.title} className="rounded-2xl border bg-card overflow-hidden">
                    <h2 className="px-4 py-2.5 border-b bg-muted/30 text-xs font-bold uppercase tracking-wider">{g.title}</h2>
                    <div className="divide-y">
                        {g.fields.map(f => (
                            <ChangeRow
                                key={f.key}
                                label={f.label}
                                before={show(data.member[f.key])}
                                after={show(data.changes.fields[f.key])}
                                checked={keep.has(f.key)}
                                applied={data.appliedFields.includes(f.key)}
                                disabled={!reviewable}
                                onToggle={() => toggle(f.key)}
                            />
                        ))}
                    </div>
                </section>
            ))}

            {data.changes.medications && (
                <section className="rounded-2xl border bg-card overflow-hidden">
                    <h2 className="px-4 py-2.5 border-b bg-muted/30 text-xs font-bold uppercase tracking-wider">Current treatment</h2>
                    <ChangeRow
                        label="Medicines"
                        before={data.currentMedications.length ? <ul className="space-y-0.5">{data.currentMedications.map((m, i) => <li key={i}>{medLine(m)}</li>)}</ul> : show(null)}
                        after={data.changes.medications.length ? <ul className="space-y-0.5">{data.changes.medications.map((m, i) => <li key={i}>{medLine(m)}</li>)}</ul> : <span className="italic">no treatment</span>}
                        checked={keep.has("medications")}
                        applied={data.appliedFields.includes("medications")}
                        disabled={!reviewable}
                        onToggle={() => toggle("medications")}
                    />
                </section>
            )}

            {data.changes.consent && (
                <section className="rounded-2xl border bg-card overflow-hidden">
                    <ChangeRow
                        label="Medical authorization"
                        before={data.member.consentSignedAt ? `Signed ${new Date(data.member.consentSignedAt).toLocaleDateString("en-GB")}` : show(null)}
                        after="Given by the family"
                        checked={keep.has("consent")}
                        applied={data.appliedFields.includes("consent")}
                        disabled={!reviewable}
                        onToggle={() => toggle("consent")}
                    />
                </section>
            )}

            {reviewable && (
                <div className="sticky bottom-4 z-10 rounded-xl border bg-card shadow-lg p-3 flex flex-wrap items-center gap-2">
                    <input
                        value={note}
                        onChange={e => setNote(e.target.value)}
                        placeholder="Note (optional)"
                        className="h-9 flex-1 min-w-[180px] rounded-md border border-input bg-background px-3 text-sm"
                    />
                    <Button variant="outline" className="gap-1.5 text-destructive" onClick={() => decide("reject")} disabled={busy}>
                        <X className="w-4 h-4" /> Reject all
                    </Button>
                    <Button className="gap-1.5" onClick={() => decide("apply")} disabled={busy}>
                        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        Apply {keep.size} of {total}
                    </Button>
                </div>
            )}
        </div>
    );
}

function ChangeRow({ label, before, after, checked, applied, disabled, onToggle }: {
    label: string; before: React.ReactNode; after: React.ReactNode;
    checked: boolean; applied: boolean; disabled: boolean; onToggle: () => void;
}) {
    return (
        <label className={`grid grid-cols-[auto_1fr] sm:grid-cols-[auto_10rem_1fr_auto_1fr] gap-x-3 gap-y-1 items-start px-4 py-3 ${disabled ? "" : "cursor-pointer hover:bg-muted/30"}`}>
            <input type="checkbox" checked={disabled ? applied : checked} disabled={disabled} onChange={onToggle} className="accent-primary mt-1" />
            <span className="text-sm font-semibold">{label}</span>
            <span className="col-start-2 sm:col-start-auto text-sm text-muted-foreground line-through decoration-muted-foreground/40 whitespace-pre-line">{before}</span>
            <ArrowRight className="hidden sm:block w-4 h-4 text-muted-foreground mt-0.5" />
            <span className="col-start-2 sm:col-start-auto text-sm font-medium whitespace-pre-line">{after}</span>
        </label>
    );
}
