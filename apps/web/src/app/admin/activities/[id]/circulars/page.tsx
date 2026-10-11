"use client";

import { Button } from "@/components/ui/button";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Check, AlertTriangle, FileText, FileDown, Pencil, Trash2, Sparkles, Plus } from "lucide-react";
import type { CircularContext, CircularContent } from "@/lib/circular/types";
import { TEMPLATES, TEMPLATE_BY_KEY, type TemplateKey } from "@/lib/circular/templates";
import { formatDate, formatDateRange, formatTime } from "@/lib/circular/format";
import { activitiesListHref } from "@/lib/activities-list";

type CircularRow = {
    id: string;
    reference: string;
    template: string;
    title: string;
    issueDate: string;
    updatedAt: string;
    content: CircularContent;
};
type Payload = { context: CircularContext; recommended: TemplateKey; circulars: CircularRow[] };

/** Today in the browser's own timezone, as YYYY-MM-DD. */
function localToday(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function ActivityCircularsPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const [data, setData] = useState<Payload | null>(null);
    const [error, setError] = useState("");
    const [creating, setCreating] = useState<TemplateKey | null>(null);

    const load = useCallback(async () => {
        const res = await fetch(`/api/admin/activities/${id}/circulars`);
        if (!res.ok) {
            setError((await res.json().catch(() => ({}))).error || "Could not load the circulars");
            return;
        }
        setData(await res.json());
    }, [id]);

    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { load(); }, [load]);

    async function create(template: TemplateKey) {
        setCreating(template);
        const res = await fetch(`/api/admin/activities/${id}/circulars`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ template, issueDate: localToday() }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
            alert(json.error || "Could not create the circular");
            setCreating(null);
            return;
        }
        router.push(`/admin/activities/${id}/circulars/${json.id}`);
    }

    async function remove(c: CircularRow) {
        if (!confirm(`Delete circular ${c.reference}? Its number becomes free again only if it was the last one.`)) return;
        const res = await fetch(`/api/admin/circulars/${c.id}`, { method: "DELETE" });
        if (!res.ok) alert("Could not delete the circular");
        load();
    }

    if (error) {
        return (
            <div className="max-w-xl">
                <BackLink />
                <p className="text-destructive mt-4">{error}</p>
            </div>
        );
    }
    if (!data) return <p className="text-muted-foreground">Loading...</p>;

    const { context: ctx, circulars, recommended } = data;
    const a = ctx.activity;

    // What a circular prints, and where each piece is filled in. Shown up front
    // so nobody discovers a missing fee from a "[fee]" in the finished letter.
    // Each link opens the exact form where the value lives; saving there comes
    // straight back here.
    const editActivity = `/admin/activities?edit=${a.id}&return=1`;
    const editUnit = `/admin/units?edit=${ctx.unit.id}&return=1`;
    const editSettings = "/admin/settings?return=1#circulars";
    const checks: { label: string; value: string; fix: string; href: string; optional?: boolean }[] = [
        { label: "Dates", value: formatDateRange(a.startDate, a.endDate), fix: "Activity", href: editActivity },
        { label: "Location", value: a.location ?? "", fix: "Activity", href: editActivity },
        { label: "Drop-off", value: [formatTime(a.startTime), a.startPlace].filter(Boolean).join(" · "), fix: "Activity", href: editActivity },
        { label: "Pick-up", value: [formatTime(a.endTime), a.endPlace ?? a.startPlace].filter(Boolean).join(" · "), fix: "Activity", href: editActivity },
        { label: "Theme", value: a.theme ?? "", fix: "Activity", href: editActivity, optional: true },
        { label: "Fee", value: a.fee ?? "", fix: "Activity", href: editActivity },
        { label: "Contact persons", value: ctx.unit.contacts.map(c => [c.role, c.name].filter(Boolean).join(" ")).join(", "), fix: "Unit", href: editUnit },
        { label: "Unit logo (right)", value: ctx.unit.logoUrl ? "Uploaded" : "", fix: "Unit", href: editUnit },
        { label: "Association logo (left)", value: ctx.group.associationLogoUrl ? "Uploaded" : "", fix: "Settings", href: editSettings },
        { label: "Year motto", value: ctx.group.motto, fix: "Settings", href: editSettings, optional: true },
        { label: "Stamp", value: ctx.group.stampUrl ? "Uploaded" : "", fix: "Settings", href: editSettings, optional: true },
    ];

    return (
        <div className="max-w-5xl">
            <BackLink />
            <div className="flex items-start gap-3 mt-3 mb-8">
                <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <FileText className="w-6 h-6" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold">Circulars</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        {a.title} · {ctx.unit.name} · {formatDateRange(a.startDate, a.endDate)}
                    </p>
                </div>
            </div>

            {/* Existing circulars */}
            {circulars.length > 0 && (
                <section className="mb-8">
                    <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-3">Circulars for this activity</h2>
                    <div className="border rounded-2xl bg-card divide-y">
                        {circulars.map(c => (
                            <div key={c.id} className="p-4 flex flex-wrap items-center gap-3">
                                <div className="min-w-0 flex-1">
                                    <Link href={`/admin/activities/${id}/circulars/${c.id}`} className="font-semibold hover:text-primary">
                                        {c.title}
                                    </Link>
                                    <div className="text-xs text-muted-foreground mt-0.5">
                                        <span className="font-mono font-bold text-foreground">Ref. {c.reference}</span>
                                        {" · "}{formatDate(c.issueDate)}
                                        {" · "}{TEMPLATE_BY_KEY[c.template]?.name ?? c.template}
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Link href={`/admin/activities/${id}/circulars/${c.id}`}>
                                        <Button variant="outline" size="sm" className="gap-1.5"><Pencil className="w-3.5 h-3.5" /> Edit</Button>
                                    </Link>
                                    <a href={`/api/admin/circulars/${c.id}/file?format=pdf&download=1`}>
                                        <Button variant="ghost" size="sm" className="gap-1.5"><FileDown className="w-3.5 h-3.5" /> PDF</Button>
                                    </a>
                                    <a href={`/api/admin/circulars/${c.id}/file?format=docx&download=1`}>
                                        <Button variant="ghost" size="sm" className="gap-1.5"><FileDown className="w-3.5 h-3.5" /> Word</Button>
                                    </a>
                                    <Button variant="ghost" size="sm" onClick={() => remove(c)} className="text-destructive hover:text-destructive">
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Template picker */}
            <section className="mb-8">
                <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-1">
                    {circulars.length ? "Create another circular" : "Create a circular"}
                </h2>
                <p className="text-sm text-muted-foreground mb-3">
                    Pick the kind of letter. It opens already filled with this activity&apos;s details; you can change any word of it.
                </p>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {TEMPLATES.map(t => {
                        const isRecommended = t.key === recommended;
                        return (
                            <button
                                key={t.key}
                                onClick={() => create(t.key)}
                                disabled={creating !== null}
                                className={`text-left rounded-2xl border p-4 bg-card transition-all hover:border-primary hover:shadow-md disabled:opacity-60 ${
                                    isRecommended ? "border-primary/60 ring-1 ring-primary/20" : ""
                                }`}
                            >
                                <div className="flex items-center justify-between gap-2 mb-1.5">
                                    <span className="font-semibold">{t.name}</span>
                                    {isRecommended ? (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 rounded-full px-2 py-0.5">
                                            <Sparkles className="w-3 h-3" /> Suggested
                                        </span>
                                    ) : (
                                        <Plus className="w-4 h-4 text-muted-foreground" />
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    {creating === t.key ? "Creating..." : t.description}
                                </p>
                            </button>
                        );
                    })}
                </div>
            </section>

            {/* Readiness */}
            <section>
                <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-1">What the circular reads</h2>
                <p className="text-sm text-muted-foreground mb-3">
                    These are picked up automatically. Anything missing can also be typed directly on the circular.
                </p>
                <div className="border rounded-2xl bg-card divide-y">
                    {checks.map(c => (
                        <div key={c.label} className="px-4 py-2.5 flex items-center gap-3 text-sm">
                            {c.value ? (
                                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                            ) : (
                                <AlertTriangle className={`w-4 h-4 shrink-0 ${c.optional ? "text-muted-foreground/50" : "text-amber-500"}`} />
                            )}
                            <span className="w-44 shrink-0 font-medium">{c.label}</span>
                            <span className={`flex-1 min-w-0 truncate ${c.value ? "text-muted-foreground" : c.optional ? "text-muted-foreground/60" : "text-amber-700"}`}>
                                {c.value || (c.optional ? "Not set (optional)" : "Not set")}
                            </span>
                            <Link href={c.href} className={`text-xs font-bold hover:underline shrink-0 ${c.value ? "text-muted-foreground" : "text-primary"}`}>
                                {c.value ? "Change" : `Set in ${c.fix}`}
                            </Link>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}

function BackLink() {
    // Back to the list as it was filtered. Read after mount: sessionStorage
    // does not exist while the page is rendered on the server.
    const [href, setHref] = useState("/admin/activities");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { setHref(activitiesListHref()); }, []);
    return (
        <Link href={href} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary">
            <ArrowLeft className="w-4 h-4" /> Activities
        </Link>
    );
}
