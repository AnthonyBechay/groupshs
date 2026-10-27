"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEffect, useMemo, useState } from "react";
import { Ban, Check, Loader2, PackageCheck, Plus, Trash2, X } from "lucide-react";
import { STOREKEEPER_NEXT, CAN_GIVE_FROM_STOCK, requestStatusLabel } from "@/lib/stock";
import { unitTheme } from "@/lib/unit-theme";
import { SELECT, StatusPill, api, type Item, type Request, type Unit } from "./shared";

type Member = { id: string; firstName: string; lastName: string; unitId: string; servesUnitId?: string | null };
type Line = { itemId: string; variant: string; quantity: string; note: string };
const EMPTY_LINE: Line = { itemId: "", variant: "", quantity: "1", note: "" };

/**
 * Requests for scouts: a shirt in size M for Karim, three Promesse badges for
 * the unit. Leaders ask and follow; the storekeeper approves, buys them at the
 * QG (see the shopping list) or hands them out from stock.
 */
export function Requests({ requests, catalog, units, scope, onScope, storekeeper, onChanged }: {
    requests: Request[] | null; catalog: Item[]; units: Unit[];
    scope: "open" | "all"; onScope: (s: "open" | "all") => void;
    storekeeper: boolean; onChanged: () => void;
}) {
    const [creating, setCreating] = useState(false);
    const [unitFilter, setUnitFilter] = useState("");
    const shown = (requests ?? []).filter(r => !unitFilter || r.unit.id === unitFilter);

    async function act(r: Request, body: Record<string, unknown>, confirmText?: string) {
        if (confirmText && !confirm(confirmText)) return;
        const res = await api(`/api/admin/stock/requests/${r.id}`, "PATCH", body);
        if (!res.ok) alert(res.data.error || "Could not update");
        onChanged();
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center rounded-full bg-muted/60 border p-1">
                    {(["open", "all"] as const).map(s => (
                        <button key={s} onClick={() => onScope(s)} className={`px-3 py-1 rounded-full text-xs font-semibold ${scope === s ? "bg-background shadow-sm" : "text-muted-foreground"}`}>
                            {s === "open" ? "In progress" : "Everything"}
                        </button>
                    ))}
                </div>
                {units.length > 1 && (
                    <select value={unitFilter} onChange={e => setUnitFilter(e.target.value)} className={SELECT} aria-label="Unit">
                        <option value="">Every unit</option>
                        {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                )}
                <Button onClick={() => setCreating(true)} className="gap-1.5 ml-auto" disabled={catalog.length === 0 || units.length === 0}>
                    <Plus className="w-4 h-4" /> New request
                </Button>
            </div>
            {catalog.length === 0 && (
                <p className="text-xs text-muted-foreground">
                    Nothing can be requested yet{storekeeper ? ": in Inventory, tick \"Leaders can request it\" on the uniform and badge items." : " — the storekeeper has not set up the catalog."}
                </p>
            )}

            {creating && <NewRequest catalog={catalog} units={units} onClose={() => setCreating(false)} onDone={() => { setCreating(false); onChanged(); }} />}

            {requests === null ? (
                <p className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</p>
            ) : shown.length === 0 ? (
                <p className="rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground">No request {scope === "open" ? "in progress" : "yet"}.</p>
            ) : (
                <div className="rounded-2xl border bg-card divide-y overflow-hidden">
                    {shown.map(r => {
                        const theme = unitTheme(r.unit.unitType);
                        const next = r.canProcess ? STOREKEEPER_NEXT[r.status] ?? [] : [];
                        const canGive = r.canProcess && CAN_GIVE_FROM_STOCK.includes(r.status);
                        const enough = r.item.quantity >= r.quantity;
                        return (
                            <div key={r.id} className="px-4 py-3 flex flex-wrap items-center gap-3">
                                <span className={`w-1 self-stretch rounded-full ${theme.dot}`} />
                                <div className="flex-1 min-w-[220px]">
                                    <p className="text-sm font-semibold">
                                        {r.quantity > 1 && `${r.quantity} × `}{r.item.name}{r.variant && <span className="text-muted-foreground font-normal"> · {r.variant}</span>}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {r.member ? `${r.member.firstName} ${r.member.lastName}` : "For the unit"} · {r.unit.name}
                                        {" · "}by {r.requestedByName} on {new Date(r.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                                        {r.fromStock && " · given from stock"}
                                    </p>
                                    {(r.note || r.statusNote) && <p className="text-xs mt-0.5">{r.note}{r.note && r.statusNote ? " · " : ""}{r.statusNote && <em>{r.statusNote}</em>}</p>}
                                </div>
                                <StatusPill status={r.status} />
                                <div className="flex flex-wrap items-center gap-1">
                                    {canGive && (
                                        <Button size="sm" variant="outline" className="gap-1 text-xs" disabled={!enough}
                                            title={enough ? `${r.item.quantity} in stock` : `Only ${r.item.quantity} in stock`}
                                            onClick={() => act(r, { action: "give" }, `Hand out ${r.quantity} × ${r.item.name} from stock? The stock goes down by ${r.quantity}.`)}>
                                            <PackageCheck className="w-3.5 h-3.5" /> From stock ({r.item.quantity})
                                        </Button>
                                    )}
                                    {next.filter(s => s !== "REJECTED").map(s => (
                                        <Button key={s} size="sm" variant="outline" className="gap-1 text-xs" onClick={() => act(r, { action: "move", to: s })}>
                                            <Check className="w-3.5 h-3.5" /> {requestStatusLabel(s)}
                                        </Button>
                                    ))}
                                    {next.includes("REJECTED") && (
                                        <Button size="sm" variant="ghost" className="text-xs text-destructive" onClick={() => {
                                            const note = prompt("Reject this request? Reason (optional):", "");
                                            if (note !== null) act(r, { action: "move", to: "REJECTED", note });
                                        }}>Reject</Button>
                                    )}
                                    {r.canCancel && !r.canProcess && (
                                        <Button size="sm" variant="ghost" className="gap-1 text-xs text-muted-foreground" onClick={() => act(r, { action: "cancel" }, "Cancel this request?")}>
                                            <Ban className="w-3.5 h-3.5" /> Cancel
                                        </Button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function NewRequest({ catalog, units, onClose, onDone }: { catalog: Item[]; units: Unit[]; onClose: () => void; onDone: () => void }) {
    const [unitId, setUnitId] = useState(units.length === 1 ? units[0].id : "");
    const [memberId, setMemberId] = useState("");
    const [members, setMembers] = useState<Member[]>([]);
    const [lines, setLines] = useState<Line[]>([{ ...EMPTY_LINE }]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    // The members list needs the members permission; without it the request
    // is simply for the unit.
    useEffect(() => {
        api<Member[]>("/api/admin/members").then(r => { if (r.ok) setMembers(r.data as Member[]); });
    }, []);
    const unitMembers = useMemo(
        () => members.filter(m => m.unitId === unitId || m.servesUnitId === unitId).sort((a, b) => a.firstName.localeCompare(b.firstName)),
        [members, unitId]
    );
    const setLine = (i: number, patch: Partial<Line>) => setLines(ls => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true); setError("");
        const r = await api("/api/admin/stock/requests", "POST", {
            unitId,
            items: lines.filter(l => l.itemId).map(l => ({ itemId: l.itemId, variant: l.variant, quantity: Number(l.quantity || 1), note: l.note, memberId: memberId || null })),
        });
        setSaving(false);
        if (!r.ok) { setError(r.data.error || "Could not send the request"); return; }
        onDone();
    }

    return (
        <form onSubmit={submit} className="rounded-2xl border-2 border-primary/30 bg-card p-5 space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="font-bold">New request</h2>
                <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground" aria-label="Close"><X className="w-5 h-5" /></button>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
                <label className="space-y-1.5">
                    <span className="text-xs font-medium">Unit</span>
                    <select value={unitId} onChange={e => { setUnitId(e.target.value); setMemberId(""); }} required className={`${SELECT} w-full`}>
                        <option value="">Choose…</option>
                        {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                </label>
                <label className="space-y-1.5">
                    <span className="text-xs font-medium">For</span>
                    <select value={memberId} onChange={e => setMemberId(e.target.value)} disabled={!unitId} className={`${SELECT} w-full disabled:opacity-50`}>
                        <option value="">The unit (no one in particular)</option>
                        {unitMembers.map(m => <option key={m.id} value={m.id}>{m.firstName} {m.lastName}</option>)}
                    </select>
                </label>
            </div>

            <div className="space-y-2">
                {lines.map((l, i) => {
                    const item = catalog.find(c => c.id === l.itemId);
                    return (
                        <div key={i} className="grid sm:grid-cols-[1fr_8rem_5rem_1fr_auto] gap-2 items-end rounded-xl border p-3">
                            <label className="space-y-1 min-w-0">
                                <span className="text-xs font-medium">Item</span>
                                <select value={l.itemId} onChange={e => setLine(i, { itemId: e.target.value, variant: "" })} required className={`${SELECT} w-full`}>
                                    <option value="">Choose…</option>
                                    {catalog.map(c => <option key={c.id} value={c.id}>{c.name}{c.price ? ` (${c.price})` : ""}</option>)}
                                </select>
                            </label>
                            <label className="space-y-1">
                                <span className="text-xs font-medium">Size / option</span>
                                <select value={l.variant} onChange={e => setLine(i, { variant: e.target.value })} disabled={!item?.variants.length} required={!!item?.variants.length} className={`${SELECT} w-full disabled:opacity-50`}>
                                    <option value="">{item?.variants.length ? "Choose…" : "—"}</option>
                                    {item?.variants.map(v => <option key={v} value={v}>{v}</option>)}
                                </select>
                            </label>
                            <label className="space-y-1">
                                <span className="text-xs font-medium">Qty</span>
                                <Input type="number" min={1} max={200} value={l.quantity} onChange={e => setLine(i, { quantity: e.target.value })} className="h-9" />
                            </label>
                            <label className="space-y-1 min-w-0">
                                <span className="text-xs font-medium">Note</span>
                                <Input value={l.note} onChange={e => setLine(i, { note: e.target.value })} placeholder="Optional" className="h-9" />
                            </label>
                            <button type="button" onClick={() => setLines(ls => ls.filter((_, j) => j !== i))} disabled={lines.length === 1} className="h-9 px-2 text-muted-foreground hover:text-destructive disabled:opacity-30" aria-label="Remove">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    );
                })}
                <Button type="button" variant="ghost" size="sm" className="gap-1" onClick={() => setLines(ls => [...ls, { ...EMPTY_LINE }])}>
                    <Plus className="w-4 h-4" /> Another item
                </Button>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2">
                <Button type="submit" disabled={saving || !unitId} className="gap-1.5">{saving && <Loader2 className="w-4 h-4 animate-spin" />} Send request</Button>
                <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            </div>
        </form>
    );
}
