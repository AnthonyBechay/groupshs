"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Check, Copy, Inbox, Link2, Loader2, MessageCircle, X } from "lucide-react";
import { LINK_VALIDITY_DAYS, DEFAULT_VALIDITY_DAYS } from "@/lib/member-update";

type LinkRow = {
    id: string; state: string; url: string; sentTo: string | null;
    createdAt: string; expiresAt: string; submittedAt: string | null; submittedBy: string | null;
};

const STATE: Record<string, { label: string; cls: string }> = {
    OPEN: { label: "Waiting for the family", cls: "bg-sky-100 text-sky-800" },
    SUBMITTED: { label: "To review", cls: "bg-amber-100 text-amber-800" },
    APPROVED: { label: "Applied", cls: "bg-emerald-100 text-emerald-800" },
    REJECTED: { label: "Rejected", cls: "bg-muted text-muted-foreground" },
    REVOKED: { label: "Replaced", cls: "bg-muted text-muted-foreground" },
    EXPIRED: { label: "Expired", cls: "bg-muted text-muted-foreground" },
};

const date = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

/** WhatsApp text a leader can send as-is. */
export function familyMessage(firstName: string, url: string, expiresAt: string) {
    return [
        `Hello! Could you please check and complete ${firstName}'s scout file?`,
        `The purpose is to make sure ${firstName}'s basic health and allergy information is up to date, so the leaders can look after them during activities. It takes a few minutes:`,
        url,
        `This link is for ${firstName}'s family only and can be used once (until ${date(expiresAt)}). If you need another one, just tell us. Thank you!`,
    ].join("\n\n");
}

/**
 * On a member's page: send the family a link to fill in the file, see where
 * the last one stands, and jump to reviewing what they sent.
 */
export function FamilyLinkPanel({ memberId, firstName }: { memberId: string; firstName: string }) {
    const [links, setLinks] = useState<LinkRow[]>([]);
    const [days, setDays] = useState<number>(DEFAULT_VALIDITY_DAYS);
    const [sentTo, setSentTo] = useState("");
    const [busy, setBusy] = useState(false);
    const [copied, setCopied] = useState<string | null>(null);

    const load = useCallback(async () => {
        const res = await fetch(`/api/admin/members/${memberId}/update-requests`);
        if (res.ok) setLinks(await res.json());
    }, [memberId]);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { load(); }, [load]);

    async function create() {
        setBusy(true);
        const res = await fetch(`/api/admin/members/${memberId}/update-requests`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ days, sentTo }),
        });
        setBusy(false);
        if (!res.ok) { alert((await res.json().catch(() => ({}))).error || "Could not create the link"); return; }
        setSentTo("");
        load();
    }

    async function revoke(id: string) {
        if (!confirm("Stop this link from working?")) return;
        await fetch(`/api/admin/update-requests/${id}`, {
            method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "revoke" }),
        });
        load();
    }

    async function copy(text: string, key: string) {
        try { await navigator.clipboard.writeText(text); setCopied(key); setTimeout(() => setCopied(null), 1500); }
        catch { prompt("Copy this:", text); }
    }

    const latest = links[0];
    const open = latest?.state === "OPEN" ? latest : null;

    return (
        <div className="rounded-2xl border bg-card p-5 mb-6 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h2 className="font-bold flex items-center gap-2"><Link2 className="w-4 h-4 text-primary" /> Ask the family to fill the file</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        A private link for the parents: contacts, doctor, allergies, treatment. Nothing changes until you review it.
                    </p>
                </div>
                {latest && <span className={`text-[11px] font-bold px-2 py-1 rounded-full ${STATE[latest.state]?.cls}`}>{STATE[latest.state]?.label}</span>}
            </div>

            {latest?.state === "SUBMITTED" && (
                <Link href={`/admin/members/updates/${latest.id}`} className="flex items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/20 p-3 hover:bg-amber-100/60">
                    <Inbox className="w-5 h-5 text-amber-700" />
                    <span className="flex-1 text-sm"><strong>{latest.submittedBy}</strong> sent answers on {date(latest.submittedAt!)}.</span>
                    <span className="text-sm font-semibold text-amber-800">Review →</span>
                </Link>
            )}

            {open ? (
                <div className="rounded-xl border bg-muted/20 p-3 space-y-2">
                    <p className="text-xs text-muted-foreground">
                        Sent {date(open.createdAt)}{open.sentTo ? ` to ${open.sentTo}` : ""} · works until {date(open.expiresAt)}
                    </p>
                    <div className="flex flex-wrap gap-2">
                        <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={() => copy(open.url, "url")}>
                            {copied === "url" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} Copy link
                        </Button>
                        <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={() => copy(familyMessage(firstName, open.url, open.expiresAt), "msg")}>
                            {copied === "msg" ? <Check className="w-4 h-4" /> : <MessageCircle className="w-4 h-4" />} Copy message
                        </Button>
                        <a href={`https://wa.me/?text=${encodeURIComponent(familyMessage(firstName, open.url, open.expiresAt))}`} target="_blank" rel="noopener noreferrer">
                            <Button type="button" size="sm" variant="outline" className="gap-1.5"><MessageCircle className="w-4 h-4" /> WhatsApp</Button>
                        </a>
                        <Button type="button" size="sm" variant="ghost" className="gap-1.5 text-destructive ml-auto" onClick={() => revoke(open.id)}>
                            <X className="w-4 h-4" /> Stop link
                        </Button>
                    </div>
                </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-2">
                <input
                    value={sentTo}
                    onChange={e => setSentTo(e.target.value)}
                    placeholder="Sent to (optional), e.g. Mother"
                    className="h-9 rounded-md border border-input bg-background px-3 text-sm w-52"
                />
                <select value={days} onChange={e => setDays(Number(e.target.value))} className="h-9 rounded-md border border-input bg-background px-2 text-sm">
                    {LINK_VALIDITY_DAYS.map(d => <option key={d} value={d}>Valid {d} days</option>)}
                </select>
                <Button type="button" size="sm" onClick={create} disabled={busy} className="gap-1.5">
                    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
                    {open ? "Replace with a new link" : "Create link"}
                </Button>
            </div>
        </div>
    );
}
