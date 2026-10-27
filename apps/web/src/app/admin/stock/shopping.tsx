"use client";

import { Button } from "@/components/ui/button";
import { useMemo, useState } from "react";
import { Check, Copy, PackageOpen, ShoppingCart } from "lucide-react";
import { formatMoney, formatTotals } from "@/lib/stock";
import { api, type Request } from "./shared";

type Line = { key: string; name: string; variant: string | null; cost: string | null; sell: string | null; currency: string; quantity: number; ids: string[]; units: Map<string, number> };

/** Requests in one status, added up per item and size. */
function aggregate(list: Request[]): Line[] {
    const lines = new Map<string, Line>();
    for (const r of list) {
        const key = `${r.item.id}|${r.variant ?? ""}`;
        const l: Line = lines.get(key) ?? {
            key, name: r.item.name, variant: r.variant, cost: r.item.costPrice, sell: r.unitPrice,
            currency: r.currency ?? r.item.currency, quantity: 0, ids: [], units: new Map<string, number>(),
        };
        l.quantity += r.quantity;
        l.ids.push(r.id);
        l.units.set(r.unit.name, (l.units.get(r.unit.name) ?? 0) + r.quantity);
        lines.set(key, l);
    }
    return [...lines.values()].sort((a, b) => a.name.localeCompare(b.name) || (a.variant ?? "").localeCompare(b.variant ?? ""));
}

/**
 * The trip to the QG. The QG is a shop, so buying is picking up: approved
 * requests become one list, added up per item and size; ticked "bought", they
 * are ready to hand over, unit by unit. Each person sees the requests they may
 * see — their units', or every unit's with canSeeAllRequests.
 */
export function ShoppingList({ requests, storekeeper, onChanged }: { requests: Request[]; storekeeper: boolean; onChanged: () => void }) {
    const [busy, setBusy] = useState(false);
    const toBuy = useMemo(() => aggregate(requests.filter(r => r.status === "APPROVED" && r.next.includes("READY"))), [requests]);
    const ready = requests.filter(r => r.status === "READY");
    const readyByUnit = useMemo(() => {
        const m = new Map<string, Request[]>();
        for (const r of ready) m.set(r.unit.name, [...(m.get(r.unit.name) ?? []), r]);
        return [...m.entries()].sort(([a], [b]) => a.localeCompare(b));
    }, [ready]);
    const waiting = requests.filter(r => r.status === "REQUESTED").length;
    const unpaid = (list: Request[]) => list.filter(r => !r.paid).length;

    async function bulk(ids: string[], to: string, text: string) {
        if (!confirm(text)) return;
        setBusy(true);
        const r = await api("/api/admin/stock/requests/bulk", "POST", { ids, to });
        setBusy(false);
        if (!r.ok) alert(r.data.error || "Could not update");
        onChanged();
    }

    const listText = toBuy.map(l => `${l.quantity} × ${l.name}${l.variant ? ` (${l.variant})` : ""}`).join("\n");
    // What the trip costs the group, and what families will pay back.
    const cost = (ls: Line[]) => formatTotals(ls.map(l => ({ amount: l.cost, quantity: l.quantity, currency: l.currency })));
    const sell = (ls: Line[]) => formatTotals(ls.map(l => ({ amount: l.sell, quantity: l.quantity, currency: l.currency })));

    return (
        <div className="space-y-6">
            {waiting > 0 && (
                <p className="text-sm rounded-xl bg-sky-50 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-900 px-4 py-2.5">
                    {waiting} request{waiting !== 1 ? "s" : ""} still waiting for approval in the Requests tab. They join this list once approved.
                </p>
            )}

            <Section
                icon={ShoppingCart} title="To bring from the QG" count={toBuy.reduce((n, l) => n + l.quantity, 0)}
                summary={toBuy.length > 0 && [storekeeper && cost(toBuy) && `costs ${cost(toBuy)}`, sell(toBuy) && `families pay ${sell(toBuy)}`].filter(Boolean).join(" · ")}
                actions={toBuy.length > 0 && (
                    <>
                        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => navigator.clipboard.writeText(listText).catch(() => prompt("Copy this:", listText))}>
                            <Copy className="w-4 h-4" /> Copy list
                        </Button>
                        <Button size="sm" className="gap-1.5" disabled={busy} onClick={() => bulk(toBuy.flatMap(l => l.ids), "READY", "Mark everything on this list as bought? It moves to \"ready to hand over\".")}>
                            <Check className="w-4 h-4" /> All bought
                        </Button>
                    </>
                )}
            >
                {toBuy.length === 0 ? <Empty>Nothing to bring from the QG.</Empty> : toBuy.map(l => (
                    <AggregateRow key={l.key} line={l} storekeeper={storekeeper} action={
                        <Button size="sm" variant="ghost" className="text-xs gap-1" disabled={busy} onClick={() => bulk(l.ids, "READY", `Mark ${l.quantity} × ${l.name}${l.variant ? ` (${l.variant})` : ""} as bought?`)}>
                            <Check className="w-3.5 h-3.5" /> Bought
                        </Button>
                    } />
                ))}
            </Section>

            <Section icon={PackageOpen} title="Ready to hand over" count={ready.reduce((n, r) => n + r.quantity, 0)}>
                {readyByUnit.length === 0 ? <Empty>Nothing waiting to be handed over.</Empty> : readyByUnit.map(([unit, list]) => (
                    <div key={unit} className="px-4 py-3">
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                            <p className="text-sm font-bold">{unit}{unpaid(list) > 0 && <span className="ml-2 text-xs font-semibold text-amber-700">{unpaid(list)} unpaid</span>}</p>
                            {list.some(r => r.next.includes("DELIVERED")) && (
                                <Button size="sm" variant="outline" className="text-xs gap-1" disabled={busy} onClick={() => bulk(list.filter(r => r.next.includes("DELIVERED")).map(r => r.id), "DELIVERED", `Mark everything for ${unit} as handed over?`)}>
                                    <Check className="w-3.5 h-3.5" /> All handed over
                                </Button>
                            )}
                        </div>
                        <ul className="text-sm space-y-0.5">
                            {list.map(r => (
                                <li key={r.id} className="flex items-center gap-2">
                                    <span className="flex-1">
                                        {r.quantity > 1 && `${r.quantity} × `}{r.item.name}{r.variant && ` · ${r.variant}`}
                                        <span className="text-muted-foreground"> · {r.member ? `${r.member.firstName} ${r.member.lastName}` : r.requestedForName || "the unit"}</span>
                                        {!r.paid && <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-800">unpaid</span>}
                                    </span>
                                    {r.next.includes("DELIVERED") && (
                                        <Button size="sm" variant="ghost" className="h-7 text-xs" disabled={busy} onClick={() => bulk([r.id], "DELIVERED", "Mark as handed over?")}>Handed over</Button>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </Section>
        </div>
    );
}

function Section({ icon: Icon, title, count, summary, actions, children }: {
    icon: typeof ShoppingCart; title: string; count: number; summary?: string | false; actions?: React.ReactNode; children: React.ReactNode;
}) {
    return (
        <section className="rounded-2xl border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b bg-muted/30 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-bold flex items-center gap-2 flex-wrap">
                    <Icon className="w-4 h-4 text-primary" /> {title} <span className="font-normal text-muted-foreground">({count})</span>
                    {summary && <span className="font-normal text-xs text-muted-foreground">· {summary}</span>}
                </h2>
                <div className="flex gap-2">{actions}</div>
            </div>
            <div className="divide-y">{children}</div>
        </section>
    );
}

function AggregateRow({ line, action, storekeeper }: { line: Line; action: React.ReactNode; storekeeper: boolean }) {
    return (
        <div className="px-4 py-2.5 flex items-center gap-3">
            <span className="w-12 text-lg font-black text-right">{line.quantity}</span>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">
                    {line.name}{line.variant && <span className="font-normal text-muted-foreground"> · {line.variant}</span>}
                    {storekeeper && line.cost && <span className="font-normal text-muted-foreground"> · {formatMoney(line.cost, line.currency)} each at the QG</span>}
                </p>
                <p className="text-xs text-muted-foreground truncate">{[...line.units.entries()].map(([u, n]) => `${u}: ${n}`).join(" · ")}</p>
            </div>
            {action}
        </div>
    );
}

function Empty({ children }: { children: React.ReactNode }) {
    return <p className="px-4 py-6 text-sm text-muted-foreground text-center">{children}</p>;
}
