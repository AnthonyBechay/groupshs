"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, ChevronRight, Copy, Inbox, Link2, Loader2, Send } from "lucide-react";
import { compareUnitsByBranch } from "@/lib/scout-config";
import { unitTheme } from "@/lib/unit-theme";
import { useUrlState } from "@/hooks/use-url-state";
import { LINK_VALIDITY_DAYS, DEFAULT_VALIDITY_DAYS } from "@/lib/member-update";
import { familyMessage } from "../family-link-panel";

type Unit = { id: string; name: string; unitType: string };
type Row = {
    id: string; state: string; sentTo: string | null; createdAt: string; expiresAt: string;
    submittedAt: string | null; submittedBy: string | null; reviewedAt: string | null; reviewedByName: string | null;
    createdByName: string | null; changeCount: number; url: string;
    member: { id: string; firstName: string; lastName: string; unit: Unit };
};
type Tab = "SUBMITTED" | "OPEN" | "all";

const date = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
const STATE_LABEL: Record<string, string> = {
    OPEN: "Waiting", SUBMITTED: "To review", APPROVED: "Applied", REJECTED: "Rejected", REVOKED: "Replaced", EXPIRED: "Expired",
};

/**
 * Family updates: what families sent back (to review), the links still out,
 * and a way to send a link to every family of a unit at once.
 */
export default function FamilyUpdatesPage() {
    const { params, setParams } = useUrlState();
    const tab = (["SUBMITTED", "OPEN", "all"].includes(params.get("tab") ?? "") ? params.get("tab") : "SUBMITTED") as Tab;
    const unitId = params.get("unit") ?? "";
    const [units, setUnits] = useState<Unit[]>([]);
    const [rows, setRows] = useState<Row[] | null>(null);

    useEffect(() => {
        fetch("/api/admin/units").then(r => (r.ok ? r.json() : [])).then((u: Unit[]) =>
            setUnits(u.filter(x => !["ALL", "ARCHIVE"].includes(x.unitType)).sort(compareUnitsByBranch)));
    }, []);

    const load = useCallback(async () => {
        setRows(null);
        const q = new URLSearchParams({ status: tab });
        if (unitId) q.set("unitId", unitId);
        const res = await fetch(`/api/admin/update-requests?${q}`);
        setRows(res.ok ? await res.json() : []);
    }, [tab, unitId]);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { load(); }, [load]);

    return (
        <div className="space-y-5">
            <Link href="/admin/members" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary">
                <ArrowLeft className="w-4 h-4" /> Members
            </Link>
            <div>
                <h1 className="text-3xl font-bold flex items-center gap-2"><Inbox className="w-7 h-7 text-primary" /> Family updates</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Families fill in their child&apos;s file through a private link. Their answers wait here until a leader applies them.
                </p>
            </div>

            <div className="flex flex-wrap gap-1.5">
                <Chip active={!unitId} onClick={() => setParams({ unit: null })}>All units</Chip>
                {units.map(u => (
                    <Chip key={u.id} active={unitId === u.id} onClick={() => setParams({ unit: u.id })} dot={unitTheme(u.unitType).dot}>{u.name}</Chip>
                ))}
            </div>

            <BulkLinks units={units} unitId={unitId} onDone={load} />

            <div className="inline-flex items-center rounded-full bg-muted/60 border p-1">
                {([["SUBMITTED", "To review"], ["OPEN", "Waiting for families"], ["all", "Everything"]] as const).map(([k, label]) => (
                    <button
                        key={k}
                        onClick={() => setParams({ tab: k === "SUBMITTED" ? null : k })}
                        className={`px-3.5 py-1.5 rounded-full text-sm font-semibold transition-all ${tab === k ? "bg-background shadow-sm" : "text-muted-foreground"}`}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {rows === null ? (
                <p className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</p>
            ) : rows.length === 0 ? (
                <p className="rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground">
                    {tab === "SUBMITTED" ? "Nothing to review." : tab === "OPEN" ? "No link is waiting for a family." : "No link sent yet."}
                </p>
            ) : (
                <div className="rounded-2xl border bg-card divide-y overflow-hidden">
                    {rows.map(r => {
                        const theme = unitTheme(r.member.unit.unitType);
                        const reviewable = r.state === "SUBMITTED";
                        const body = (
                            <>
                                <span className={`w-1 self-stretch rounded-full ${theme.dot}`} />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold">{r.member.firstName} {r.member.lastName}</p>
                                    <p className="text-xs text-muted-foreground truncate">
                                        {r.member.unit.name}
                                        {reviewable
                                            ? ` · ${r.changeCount} change${r.changeCount !== 1 ? "s" : ""} from ${r.submittedBy} · ${date(r.submittedAt!)}`
                                            : r.state === "OPEN"
                                                ? ` · sent ${date(r.createdAt)}${r.sentTo ? ` to ${r.sentTo}` : ""} · until ${date(r.expiresAt)}`
                                                : r.reviewedAt ? ` · ${STATE_LABEL[r.state]?.toLowerCase()} by ${r.reviewedByName} on ${date(r.reviewedAt)}` : ` · ${date(r.createdAt)}`}
                                    </p>
                                </div>
                                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{STATE_LABEL[r.state] ?? r.state}</span>
                            </>
                        );
                        return reviewable || r.state !== "OPEN" ? (
                            <Link key={r.id} href={reviewable ? `/admin/members/updates/${r.id}` : `/admin/members/${r.member.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40">
                                {body}
                                <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
                            </Link>
                        ) : (
                            <div key={r.id} className="flex items-center gap-3 px-4 py-3">
                                {body}
                                <CopyButton text={familyMessage(r.member.firstName, r.url, r.expiresAt)} label="Copy message" />
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

/** One link per family of a unit, ready to paste into the parents' chat. */
function BulkLinks({ units, unitId, onDone }: { units: Unit[]; unitId: string; onDone: () => void }) {
    const [open, setOpen] = useState(false);
    const [target, setTarget] = useState(unitId);
    const [only, setOnly] = useState<"missing" | "all">("missing");
    const [days, setDays] = useState<number>(DEFAULT_VALIDITY_DAYS);
    const [busy, setBusy] = useState(false);
    const [result, setResult] = useState<{ created: number; skipped: number; links: { name: string; url: string; expiresAt: string }[] } | null>(null);
     
    useEffect(() => { setTarget(unitId); }, [unitId]);

    const allText = useMemo(() => result?.links.map(l => `${l.name}: ${l.url}`).join("\n") ?? "", [result]);

    async function run() {
        if (!target) return;
        const unit = units.find(u => u.id === target);
        if (!confirm(`Create a link for ${only === "all" ? "every member" : "every member with an incomplete file"} of ${unit?.name}? Any link already open for them is replaced.`)) return;
        setBusy(true);
        const res = await fetch("/api/admin/update-requests", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ unitId: target, only, days }),
        });
        setBusy(false);
        if (!res.ok) { alert((await res.json().catch(() => ({}))).error || "Could not create the links"); return; }
        setResult(await res.json());
        onDone();
    }

    if (!open) {
        return (
            <Button variant="outline" className="gap-2" onClick={() => setOpen(true)}>
                <Send className="w-4 h-4" /> Send links to a whole unit
            </Button>
        );
    }

    return (
        <div className="rounded-2xl border bg-card p-5 space-y-4">
            <h2 className="font-bold flex items-center gap-2"><Link2 className="w-4 h-4 text-primary" /> Links for a whole unit</h2>
            <div className="flex flex-wrap items-center gap-2">
                <select value={target} onChange={e => setTarget(e.target.value)} className="h-9 rounded-md border border-input bg-background px-2 text-sm">
                    <option value="">Choose a unit…</option>
                    {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
                <select value={only} onChange={e => setOnly(e.target.value as "missing" | "all")} className="h-9 rounded-md border border-input bg-background px-2 text-sm">
                    <option value="missing">Only files missing essentials</option>
                    <option value="all">Every member</option>
                </select>
                <select value={days} onChange={e => setDays(Number(e.target.value))} className="h-9 rounded-md border border-input bg-background px-2 text-sm">
                    {LINK_VALIDITY_DAYS.map(d => <option key={d} value={d}>Valid {d} days</option>)}
                </select>
                <Button onClick={run} disabled={!target || busy} className="gap-1.5">
                    {busy && <Loader2 className="w-4 h-4 animate-spin" />} Create links
                </Button>
            </div>
            {result && (
                <div className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm"><strong>{result.created}</strong> link{result.created !== 1 ? "s" : ""} created{result.skipped ? `, ${result.skipped} skipped (complete, or a link is already out)` : ""}.</p>
                        {result.links.length > 0 && <CopyButton text={allText} label="Copy all" />}
                    </div>
                    {result.links.length > 0 && (
                        <div className="rounded-xl border divide-y max-h-80 overflow-y-auto">
                            {result.links.map(l => (
                                <div key={l.url} className="flex items-center gap-3 px-3 py-2">
                                    <span className="flex-1 text-sm truncate">{l.name}</span>
                                    <CopyButton text={familyMessage(l.name.split(" ")[0], l.url, l.expiresAt)} label="Copy message" />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function CopyButton({ text, label }: { text: string; label: string }) {
    const [done, setDone] = useState(false);
    return (
        <Button
            type="button" size="sm" variant="outline" className="gap-1.5 shrink-0"
            onClick={async () => {
                try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500); }
                catch { prompt("Copy this:", text); }
            }}
        >
            {done ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} {label}
        </Button>
    );
}

function Chip({ active, onClick, dot, children }: { active: boolean; onClick: () => void; dot?: string; children: React.ReactNode }) {
    return (
        <button
            onClick={onClick}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${active ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:bg-muted/70"}`}
        >
            {dot && <span className={`w-2 h-2 rounded-full ${dot}`} />}
            {children}
        </button>
    );
}
