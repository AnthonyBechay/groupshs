"use client";

import { Button } from "@/components/ui/button";
import { useState, useEffect, useCallback } from "react";
import { History, Undo2, ChevronDown } from "lucide-react";

type Batch = {
    batchId: string; batchLabel: string | null; moveDate: string; notes: string | null;
    memberCount: number; revertedCount: number; members: string[];
    fullyReverted: boolean; partiallyReverted: boolean;
};

const COLLAPSED = 5;

/**
 * Every batch ever run — age promotions and maîtrise transfers alike — with a
 * revert. Shown under both tabs so undoing a transfer does not mean hunting for
 * it on another screen.
 *
 * `refreshKey` changes whenever the parent runs a new batch, so the list
 * reloads without the parent having to own its state.
 */
export function BatchHistory({ refreshKey = 0, filter, onReverted }: {
    refreshKey?: number;
    /** Narrow to one kind of batch, matched on its label. */
    filter?: (label: string) => boolean;
    onReverted?: () => void;
}) {
    const [batches, setBatches] = useState<Batch[]>([]);
    const [expanded, setExpanded] = useState(false);
    const [busy, setBusy] = useState<string | null>(null);

    const load = useCallback(async () => {
        const res = await fetch("/api/admin/transitions/batches");
        if (res.ok) setBatches(await res.json());
    }, []);

     
    useEffect(() => { load(); }, [load, refreshKey]);

    const list = filter ? batches.filter(b => filter(b.batchLabel ?? "")) : batches;
    const visible = expanded ? list : list.slice(0, COLLAPSED);

    async function revert(batch: Batch) {
        setBusy(batch.batchId);
        try {
            const dry = await fetch(`/api/admin/transitions/batches/${batch.batchId}/revert`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ dryRun: true }),
            });
            const plan = await dry.json();
            if (!plan.willRevert) { alert(plan.error || "This batch cannot be reverted."); return; }

            const lines = [
                `Undo "${batch.batchLabel ?? "transition"}"?`,
                "",
                `${plan.willRevert.length} member(s) go back to their previous unit, role, sub-group and progressions.`,
            ];
            if (plan.skipped?.length) {
                lines.push("", `${plan.skipped.length} will be SKIPPED:`);
                for (const s of plan.skipped.slice(0, 8)) lines.push(`  • ${s.name} — ${s.reason}`);
            }
            if (!confirm(lines.join("\n"))) return;

            const res = await fetch(`/api/admin/transitions/batches/${batch.batchId}/revert`, { method: "POST" });
            const data = await res.json();
            if (!res.ok) { alert(data.error || "Revert failed"); return; }
            await load();
            onReverted?.();
        } finally {
            setBusy(null);
        }
    }

    return (
        <div className="rounded-2xl border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
                <h2 className="text-sm font-bold flex items-center gap-2">
                    <History className="w-4 h-4 text-primary" /> History
                </h2>
                <span className="text-xs text-muted-foreground">Every change here can be undone</span>
            </div>
            {list.length === 0 ? (
                <p className="p-6 text-sm text-muted-foreground text-center">Nothing has been run yet.</p>
            ) : (
                <div className="divide-y">
                    {visible.map(b => (
                        <div key={b.batchId} className={`p-4 flex flex-wrap items-center gap-3 ${b.fullyReverted ? "opacity-60" : ""}`}>
                            <div className="flex-1 min-w-[220px]">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-semibold text-sm">{b.batchLabel ?? "Transition"}</span>
                                    {b.fullyReverted && (
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">UNDONE</span>
                                    )}
                                    {b.partiallyReverted && (
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">PARTLY UNDONE</span>
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    {new Date(b.moveDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                                    {" · "}{b.memberCount} member{b.memberCount !== 1 ? "s" : ""}
                                    {b.notes && ` · ${b.notes}`}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1 truncate">
                                    {b.members.join(", ")}{b.memberCount > b.members.length ? " …" : ""}
                                </p>
                            </div>
                            {!b.fullyReverted && (
                                <Button
                                    variant="outline" size="sm" className="gap-1.5"
                                    disabled={busy === b.batchId}
                                    onClick={() => revert(b)}
                                >
                                    <Undo2 className="w-3.5 h-3.5" /> Undo
                                </Button>
                            )}
                        </div>
                    ))}
                </div>
            )}
            {list.length > COLLAPSED && (
                <button
                    type="button"
                    onClick={() => setExpanded(e => !e)}
                    className="w-full px-4 py-2.5 border-t text-xs font-medium text-primary hover:bg-muted/30 flex items-center justify-center gap-1"
                >
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} />
                    {expanded ? "Show fewer" : `Show all ${list.length}`}
                </button>
            )}
        </div>
    );
}
