"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, History } from "lucide-react";

type Change = {
    id: string; field: string; label: string; oldValue: string | null; newValue: string | null;
    source: "ADMIN" | "FAMILY"; changedByName: string | null; createdAt: string;
};

const when = (iso: string) => new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

/**
 * Who changed what on this file, and when — leaders' edits and family answers
 * alike. Edits saved together are shown together.
 */
export function MemberChangeHistory({ memberId }: { memberId: string }) {
    const [rows, setRows] = useState<Change[] | null>(null);
    const [open, setOpen] = useState(false);

    useEffect(() => {
        fetch(`/api/admin/members/${memberId}/history`).then(r => (r.ok ? r.json() : [])).then(setRows);
    }, [memberId]);

    // One entry per save: same person, same minute.
    const batches = useMemo(() => {
        const out: { key: string; at: string; by: string | null; source: Change["source"]; items: Change[] }[] = [];
        for (const c of rows ?? []) {
            const key = `${c.changedByName}|${c.source}|${c.createdAt.slice(0, 16)}`;
            const last = out.at(-1);
            if (last?.key === key) last.items.push(c);
            else out.push({ key, at: c.createdAt, by: c.changedByName, source: c.source, items: [c] });
        }
        return out;
    }, [rows]);

    if (!rows || rows.length === 0) return null;

    return (
        <div className="rounded-2xl border bg-card overflow-hidden mt-6">
            <button type="button" onClick={() => setOpen(o => !o)} className="w-full px-5 py-4 flex items-center gap-2 text-left">
                <History className="w-4 h-4 text-primary" />
                <span className="font-bold flex-1">Change history <span className="font-normal text-muted-foreground">({rows.length})</span></span>
                <span className="text-xs text-muted-foreground hidden sm:inline">Last: {when(rows[0].createdAt)} by {rows[0].changedByName ?? "—"}</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`} />
            </button>
            {open && (
                <div className="divide-y border-t">
                    {batches.map(b => (
                        <div key={b.key + b.items[0].id} className="px-5 py-3">
                            <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-2">
                                <span className={`font-bold px-1.5 py-0.5 rounded ${b.source === "FAMILY" ? "bg-sky-100 text-sky-800" : "bg-muted text-foreground"}`}>
                                    {b.source === "FAMILY" ? "Family" : "Leader"}
                                </span>
                                {b.by ?? "Unknown"} · {when(b.at)}
                            </p>
                            <ul className="space-y-1">
                                {b.items.map(c => (
                                    <li key={c.id} className="text-sm grid sm:grid-cols-[11rem_1fr] gap-x-3">
                                        <span className="font-medium">{c.label}</span>
                                        <span className="whitespace-pre-line">
                                            <span className="text-muted-foreground line-through decoration-muted-foreground/40">{c.oldValue ?? "empty"}</span>
                                            {" → "}
                                            <span>{c.newValue ?? <em className="text-muted-foreground">empty</em>}</span>
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
