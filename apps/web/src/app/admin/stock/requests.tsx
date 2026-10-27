"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEffect, useMemo, useState } from "react";
import {
    Ban, Check, ChevronDown, Home, Loader2, Minus, PackageCheck, Phone, Plus, Search, ShoppingBag, Trash2, UserRound, X,
} from "lucide-react";
import { formatMoney, formatTotals, itemFitsUnit, requestStatusLabel } from "@/lib/stock";
import { unitTheme } from "@/lib/unit-theme";
import { SELECT, StatusPill, api, type Item, type Request, type Unit } from "./shared";

type Member = { id: string; firstName: string; lastName: string; unitId: string; servesUnitId?: string | null; subgroup?: { name: string } | null };
type Stage = "approve" | "qg" | "ready" | "done";

const STAGES: { key: Stage; label: string; statuses: string[] }[] = [
    { key: "approve", label: "To approve", statuses: ["REQUESTED"] },
    { key: "qg", label: "With the QG", statuses: ["APPROVED", "ORDERED"] },
    { key: "ready", label: "Ready to hand over", statuses: ["READY"] },
    { key: "done", label: "Done", statuses: ["DELIVERED", "REJECTED", "CANCELLED"] },
];

const personKey = (r: Request) => r.member?.id ?? `name:${(r.requestedForName ?? "").toLowerCase()}|${r.contactPhone ?? ""}`;
const personName = (r: Request) => (r.member ? `${r.member.firstName} ${r.member.lastName}` : r.requestedForName || "For the unit");
const lineTotal = (r: Request) => formatTotals([{ amount: r.unitPrice, quantity: r.quantity, currency: r.currency }]);
const totalOf = (list: Request[]) => formatTotals(list.map(r => ({ amount: r.unitPrice, quantity: r.quantity, currency: r.currency })));

/**
 * Requests for scouts, the way a leader thinks about them: unit by unit, then
 * child by child, with what it costs. Families' orders from the public page
 * arrive here "to approve" for that unit's maîtrise.
 */
export function Requests({ requests, catalog, units, scope, onScope, storekeeper, onChanged }: {
    requests: Request[] | null; catalog: Item[]; units: Unit[];
    scope: "open" | "all"; onScope: (s: "open" | "all") => void;
    storekeeper: boolean; onChanged: () => void;
}) {
    const [stage, setStage] = useState<Stage>("approve");
    const [unitFilter, setUnitFilter] = useState("");
    const [search, setSearch] = useState("");
    const [creating, setCreating] = useState(false);
    const [busy, setBusy] = useState(false);

    const all = requests ?? [];
    const counts = Object.fromEntries(STAGES.map(s => [s.key, all.filter(r => s.statuses.includes(r.status)).length])) as Record<Stage, number>;
    // Land on the first stage with something in it.
    useEffect(() => {
        if (requests && counts[stage] === 0) {
            const first = STAGES.find(s => counts[s.key] > 0 && s.key !== "done");
            // eslint-disable-next-line react-hooks/set-state-in-effect
            if (first) setStage(first.key);
        }
    }, [requests]); // eslint-disable-line react-hooks/exhaustive-deps

    function pickStage(s: Stage) {
        setStage(s);
        if (s === "done" && scope !== "all") onScope("all");
    }

    const q = search.trim().toLowerCase();
    const shown = all.filter(r =>
        STAGES.find(s => s.key === stage)!.statuses.includes(r.status)
        && (!unitFilter || r.unit.id === unitFilter)
        && (!q || [personName(r), r.item.name, r.variant, r.contactName, r.orderRef].some(v => v?.toLowerCase().includes(q))));

    const byUnit = useMemo(() => {
        const m = new Map<string, { unit: Unit; list: Request[] }>();
        for (const r of shown) {
            const g = m.get(r.unit.id) ?? { unit: r.unit, list: [] };
            g.list.push(r);
            m.set(r.unit.id, g);
        }
        return [...m.values()].sort((a, b) => a.unit.name.localeCompare(b.unit.name));
    }, [shown]);

    async function act(r: Request, body: Record<string, unknown>, confirmText?: string) {
        if (confirmText && !confirm(confirmText)) return;
        const res = await api(`/api/admin/stock/requests/${r.id}`, "PATCH", body);
        if (!res.ok) alert(res.data.error || "Could not update");
        onChanged();
    }
    async function bulk(list: Request[], to: string, text: string) {
        if (!confirm(text)) return;
        setBusy(true);
        const res = await api<{ updated: number; skipped: number }>("/api/admin/stock/requests/bulk", "POST", { ids: list.map(r => r.id), to });
        setBusy(false);
        if (!res.ok) alert(res.data.error || "Could not update");
        else if (res.data.skipped) alert(`${res.data.updated} updated, ${res.data.skipped} left as they were.`);
        onChanged();
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex flex-wrap items-center rounded-2xl bg-muted/60 border p-1" role="tablist">
                    {STAGES.map(s => (
                        <button key={s.key} role="tab" aria-selected={stage === s.key} onClick={() => pickStage(s.key)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 ${stage === s.key ? "bg-background shadow-sm" : "text-muted-foreground"}`}>
                            {s.label}
                            {s.key !== "done" && counts[s.key] > 0 && <span className={`text-[10px] px-1.5 rounded-full ${s.key === "approve" ? "bg-amber-500 text-white" : "bg-muted-foreground/20"}`}>{counts[s.key]}</span>}
                        </button>
                    ))}
                </div>
                <div className="relative flex-1 min-w-[180px] max-w-xs">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Scout, family, item, reference…" className="h-9 pl-8" />
                </div>
                <Button onClick={() => setCreating(true)} className="gap-1.5 ml-auto" disabled={catalog.length === 0 || units.length === 0}>
                    <Plus className="w-4 h-4" /> New request
                </Button>
            </div>

            {units.length > 1 && (
                <div className="flex flex-wrap gap-1.5">
                    <Chip active={!unitFilter} onClick={() => setUnitFilter("")}>All units</Chip>
                    {units.map(u => {
                        const n = all.filter(r => r.unit.id === u.id && STAGES.find(s => s.key === stage)!.statuses.includes(r.status)).length;
                        return <Chip key={u.id} active={unitFilter === u.id} onClick={() => setUnitFilter(u.id)} dot={unitTheme(u.unitType).dot}>{u.name}{n > 0 && <span className="opacity-70 ml-1">{n}</span>}</Chip>;
                    })}
                </div>
            )}

            {catalog.length === 0 && (
                <p className="text-xs text-muted-foreground">
                    Nothing can be requested yet{storekeeper ? ": in Inventory, tick \"Leaders can request it\" on uniform and badge items." : " — the storekeeper has not set up the catalog."}
                </p>
            )}

            {requests === null ? (
                <p className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</p>
            ) : byUnit.length === 0 ? (
                <p className="rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground">
                    {stage === "approve" ? "Nothing waiting for approval." : stage === "ready" ? "Nothing waiting to be handed over." : "Nothing here."}
                </p>
            ) : byUnit.map(({ unit, list }) => (
                <UnitCard key={unit.id} unit={unit} list={list} stage={stage} busy={busy} onAct={act} onBulk={bulk} />
            ))}

            {creating && <NewRequest catalog={catalog} units={units} onClose={() => setCreating(false)} onDone={() => { setCreating(false); onChanged(); }} />}
        </div>
    );
}

function UnitCard({ unit, list, stage, busy, onAct, onBulk }: {
    unit: Unit; list: Request[]; stage: Stage; busy: boolean;
    onAct: (r: Request, body: Record<string, unknown>, confirmText?: string) => void;
    onBulk: (list: Request[], to: string, text: string) => void;
}) {
    const [open, setOpen] = useState(true);
    const theme = unitTheme(unit.unitType);
    const people = useMemo(() => {
        const m = new Map<string, Request[]>();
        for (const r of list) m.set(personKey(r), [...(m.get(personKey(r)) ?? []), r]);
        return [...m.values()].sort((a, b) => personName(a[0]).localeCompare(personName(b[0])));
    }, [list]);
    const approvable = list.filter(r => r.next.includes("APPROVED"));
    const deliverable = list.filter(r => r.status === "READY" && r.next.includes("DELIVERED"));
    const total = totalOf(list);

    return (
        <section className="rounded-2xl border bg-card overflow-hidden">
            <div className={`${theme.headerBg} px-4 py-3 flex flex-wrap items-center gap-3`}>
                <button onClick={() => setOpen(o => !o)} className="flex items-center gap-2 flex-1 min-w-[200px] text-left">
                    <ChevronDown className={`w-4 h-4 transition-transform ${open ? "" : "-rotate-90"}`} />
                    <span className={`w-2.5 h-2.5 rounded-full ${theme.dot}`} />
                    <span className="font-bold">{unit.name}</span>
                    <span className="text-xs text-muted-foreground">{people.length} scout{people.length !== 1 ? "s" : ""} · {list.reduce((n, r) => n + r.quantity, 0)} items{total ? ` · ${total}` : ""}</span>
                </button>
                {stage === "approve" && approvable.length > 1 && (
                    <Button size="sm" className="gap-1.5" disabled={busy} onClick={() => onBulk(approvable, "APPROVED", `Approve all ${approvable.length} requests of ${unit.name}?`)}>
                        <Check className="w-4 h-4" /> Approve all
                    </Button>
                )}
                {stage === "ready" && deliverable.length > 1 && (
                    <Button size="sm" variant="outline" className="gap-1.5" disabled={busy} onClick={() => onBulk(deliverable, "DELIVERED", `Mark everything for ${unit.name} as handed over?`)}>
                        <PackageCheck className="w-4 h-4" /> All handed over
                    </Button>
                )}
            </div>
            {open && (
                <div className="divide-y">
                    {people.map(rs => {
                        const first = rs[0];
                        const family = rs.find(r => r.source === "FAMILY");
                        return (
                            <div key={personKey(first)} className="px-4 py-3 space-y-2">
                                <div className="flex flex-wrap items-center gap-2">
                                    {first.member ? <UserRound className="w-4 h-4 text-muted-foreground" /> : first.requestedForName ? <UserRound className="w-4 h-4 text-amber-600" /> : <Home className="w-4 h-4 text-muted-foreground" />}
                                    <span className="font-semibold text-sm">{personName(first)}</span>
                                    {!first.member && first.requestedForName && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800" title="The name typed by the family does not match a member exactly">name not matched</span>}
                                    {family && (
                                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-sky-100 text-sky-800">Family</span>
                                            {family.contactName}
                                            {family.contactPhone && <a href={`tel:${family.contactPhone}`} className="inline-flex items-center gap-0.5 text-primary hover:underline"><Phone className="w-3 h-3" /> {family.contactPhone}</a>}
                                        </span>
                                    )}
                                    <span className="ml-auto text-sm font-bold">{totalOf(rs)}</span>
                                </div>
                                <ul className="space-y-1.5">
                                    {rs.map(r => <RequestLine key={r.id} r={r} onAct={onAct} />)}
                                </ul>
                            </div>
                        );
                    })}
                </div>
            )}
        </section>
    );
}

function RequestLine({ r, onAct }: { r: Request; onAct: (r: Request, body: Record<string, unknown>, confirmText?: string) => void }) {
    const enough = r.item.quantity >= r.quantity;
    const forward = r.next.filter(s => s !== "REJECTED");
    return (
        <li className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg bg-muted/30 px-3 py-2">
            <span className="flex-1 min-w-[180px] text-sm">
                {r.quantity > 1 && <strong>{r.quantity} × </strong>}{r.item.name}
                {r.variant && <span className="text-muted-foreground"> · {r.variant}</span>}
                <span className="block text-[11px] text-muted-foreground">
                    {formatMoney(r.unitPrice, r.currency ?? "USD") ? `${formatMoney(r.unitPrice, r.currency ?? "USD")} each` : "no price"}
                    {" · "}{r.source === "FAMILY" ? "ordered by the family" : `by ${r.requestedByName}`} · {new Date(r.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    {r.orderRef && ` · #${r.orderRef}`}
                    {r.fromStock && " · from stock"}
                </span>
                {(r.note || r.statusNote) && <span className="block text-[11px]">{r.note}{r.note && r.statusNote ? " · " : ""}{r.statusNote && <em>{r.statusNote}</em>}</span>}
            </span>
            <span className="text-sm font-semibold w-16 text-right">{lineTotal(r) ?? "—"}</span>
            <StatusPill status={r.status} />
            <span className="flex flex-wrap items-center gap-1">
                {r.canGive && ["REQUESTED", "APPROVED"].includes(r.status) && (
                    <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" disabled={!enough} title={enough ? `${r.item.quantity} in stock` : `Only ${r.item.quantity} in stock`}
                        onClick={() => onAct(r, { action: "give" }, `Hand out ${r.quantity} × ${r.item.name} from stock? The stock goes down by ${r.quantity}.`)}>
                        <PackageCheck className="w-3.5 h-3.5" /> Stock ({r.item.quantity})
                    </Button>
                )}
                {forward.map(s => (
                    <Button key={s} size="sm" variant={s === "APPROVED" ? "default" : "outline"} className="h-7 gap-1 text-xs" onClick={() => onAct(r, { action: "move", to: s })}>
                        <Check className="w-3.5 h-3.5" /> {s === "DELIVERED" ? "Handed over" : requestStatusLabel(s)}
                    </Button>
                ))}
                {r.next.includes("REJECTED") && (
                    <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={() => {
                        const note = prompt("Reject this request? Reason (optional, shown to the leaders):", "");
                        if (note !== null) onAct(r, { action: "move", to: "REJECTED", note });
                    }}>Reject</Button>
                )}
                {r.canCancel && !r.next.length && (
                    <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs text-muted-foreground" onClick={() => onAct(r, { action: "cancel" }, "Cancel this request?")}>
                        <Ban className="w-3.5 h-3.5" /> Cancel
                    </Button>
                )}
            </span>
        </li>
    );
}

type CartLine = { itemId: string; variant: string; quantity: number };

/** A leader's order, in a side panel: unit → scout → items for that branch → send. */
function NewRequest({ catalog, units, onClose, onDone }: { catalog: Item[]; units: Unit[]; onClose: () => void; onDone: () => void }) {
    const [unitId, setUnitId] = useState(units.length === 1 ? units[0].id : "");
    const [memberId, setMemberId] = useState("");
    const [who, setWho] = useState("");
    const [members, setMembers] = useState<Member[]>([]);
    const [cart, setCart] = useState<CartLine[]>([]);
    const [picked, setPicked] = useState<Record<string, string>>({});
    const [note, setNote] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        api<Member[]>("/api/admin/members").then(r => { if (r.ok) setMembers(r.data as Member[]); });
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => { document.body.style.overflow = prev; };
    }, []);

    const unit = units.find(u => u.id === unitId);
    const offered = useMemo(() => (unit ? catalog.filter(i => itemFitsUnit(i, unit.unitType)) : []), [catalog, unit]);
    const unitMembers = useMemo(() => members
        .filter(m => m.unitId === unitId || m.servesUnitId === unitId)
        .filter(m => !who.trim() || `${m.firstName} ${m.lastName}`.toLowerCase().includes(who.trim().toLowerCase()))
        .sort((a, b) => a.firstName.localeCompare(b.firstName)), [members, unitId, who]);
    const chosen = members.find(m => m.id === memberId);
    const itemOf = (id: string) => catalog.find(i => i.id === id);
    const total = formatTotals(cart.map(l => ({ amount: itemOf(l.itemId)?.sellPrice, quantity: l.quantity, currency: itemOf(l.itemId)?.currency })));

    function add(i: Item) {
        const variant = picked[i.id] ?? "";
        if (i.variants.length && !variant) { setError(`Choose a size / option for "${i.name}"`); return; }
        setError("");
        setCart(c => {
            const at = c.findIndex(l => l.itemId === i.id && l.variant === variant);
            if (at >= 0) return c.map((l, j) => (j === at ? { ...l, quantity: l.quantity + 1 } : l));
            return [...c, { itemId: i.id, variant, quantity: 1 }];
        });
    }
    const setQty = (n: number, q: number) => setCart(c => (q < 1 ? c.filter((_, j) => j !== n) : c.map((l, j) => (j === n ? { ...l, quantity: Math.min(200, q) } : l))));

    async function submit() {
        setSaving(true); setError("");
        const r = await api("/api/admin/stock/requests", "POST", {
            unitId, memberId: memberId || null, items: cart.map(l => ({ ...l, note })),
        });
        setSaving(false);
        if (!r.ok) { setError(r.data.error || "Could not send the request"); return; }
        onDone();
    }

    return (
        <div className="fixed inset-0 z-[60] flex justify-end" role="dialog" aria-modal="true">
            <div className="absolute inset-0 bg-black/40" aria-hidden />
            <div className="relative h-full w-full max-w-2xl bg-background shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
                <div className="flex items-center justify-between gap-3 px-6 py-4 border-b">
                    <h2 className="text-xl font-semibold">New request</h2>
                    <button type="button" onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground" aria-label="Close"><X className="w-5 h-5" /></button>
                </div>
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
                    <div className="space-y-2">
                        <p className="text-sm font-semibold"><span className="text-primary">1</span> Unit</p>
                        <div className="flex flex-wrap gap-1.5">
                            {units.map(u => (
                                <Chip key={u.id} active={unitId === u.id} onClick={() => { setUnitId(u.id); setMemberId(""); setCart([]); }} dot={unitTheme(u.unitType).dot}>{u.name}</Chip>
                            ))}
                        </div>
                    </div>

                    {unit && (
                        <div className="space-y-2">
                            <p className="text-sm font-semibold"><span className="text-primary">2</span> For whom</p>
                            {chosen ? (
                                <div className="flex items-center gap-2 rounded-xl border bg-primary/5 border-primary/20 px-3 py-2">
                                    <UserRound className="w-4 h-4 text-primary" />
                                    <span className="text-sm font-medium flex-1">{chosen.firstName} {chosen.lastName}</span>
                                    <button onClick={() => setMemberId("")} className="text-xs text-muted-foreground hover:text-foreground">Change</button>
                                </div>
                            ) : (
                                <>
                                    <div className="relative">
                                        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                        <Input value={who} onChange={e => setWho(e.target.value)} placeholder="Search a scout… or leave empty for the unit" className="h-9 pl-8" />
                                    </div>
                                    <div className="max-h-40 overflow-y-auto rounded-xl border divide-y">
                                        <button onClick={() => setMemberId("")} className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-2 font-medium">
                                            <Home className="w-4 h-4 text-muted-foreground" /> The unit itself (no one in particular)
                                        </button>
                                        {unitMembers.map(m => (
                                            <button key={m.id} onClick={() => setMemberId(m.id)} className="w-full text-left px-3 py-2 text-sm hover:bg-muted">
                                                {m.firstName} {m.lastName}{m.subgroup?.name && <span className="text-muted-foreground text-xs"> · {m.subgroup.name}</span>}
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {unit && (
                        <div className="space-y-2">
                            <p className="text-sm font-semibold"><span className="text-primary">3</span> Items for {unit.name}</p>
                            {offered.length === 0 ? <p className="text-sm text-muted-foreground">No catalog item is offered to this branch yet.</p> : (
                                <div className="grid sm:grid-cols-2 gap-2">
                                    {offered.map(i => (
                                        <div key={i.id} className="rounded-xl border p-3 space-y-2">
                                            <div className="flex items-start justify-between gap-2">
                                                <span className="text-sm font-semibold">{i.name}</span>
                                                <span className="text-xs font-semibold shrink-0">{formatMoney(i.sellPrice, i.currency) ?? "—"}</span>
                                            </div>
                                            <p className="text-[11px] text-muted-foreground">{i.quantity} in stock</p>
                                            <div className="flex gap-2">
                                                {i.variants.length > 0 && (
                                                    <select value={picked[i.id] ?? ""} onChange={e => setPicked(p => ({ ...p, [i.id]: e.target.value }))} className={`${SELECT} flex-1 min-w-0`}>
                                                        <option value="">Size / option…</option>
                                                        {i.variants.map(v => <option key={v} value={v}>{v}</option>)}
                                                    </select>
                                                )}
                                                <Button type="button" size="sm" variant="outline" className="gap-1 shrink-0" onClick={() => add(i)}><Plus className="w-4 h-4" /> Add</Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="border-t px-6 py-4 bg-card space-y-3">
                    {cart.length > 0 && (
                        <ul className="space-y-1 max-h-40 overflow-y-auto">
                            {cart.map((l, n) => {
                                const i = itemOf(l.itemId)!;
                                return (
                                    <li key={`${l.itemId}|${l.variant}`} className="flex items-center gap-2 text-sm">
                                        <ShoppingBag className="w-3.5 h-3.5 text-muted-foreground" />
                                        <span className="flex-1 truncate">{i.name}{l.variant && <span className="text-muted-foreground"> · {l.variant}</span>}</span>
                                        <button onClick={() => setQty(n, l.quantity - 1)} className="w-6 h-6 rounded border flex items-center justify-center" aria-label="Less">{l.quantity === 1 ? <Trash2 className="w-3 h-3" /> : <Minus className="w-3 h-3" />}</button>
                                        <span className="w-5 text-center font-semibold">{l.quantity}</span>
                                        <button onClick={() => setQty(n, l.quantity + 1)} className="w-6 h-6 rounded border flex items-center justify-center" aria-label="More"><Plus className="w-3 h-3" /></button>
                                        <span className="w-16 text-right font-semibold">{formatTotals([{ amount: i.sellPrice, quantity: l.quantity, currency: i.currency }]) ?? "—"}</span>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                    {cart.length > 0 && <Input value={note} onChange={e => setNote(e.target.value)} placeholder="Note (optional)" className="h-9" />}
                    {error && <p className="text-sm text-destructive">{error}</p>}
                    <div className="flex items-center gap-2">
                        <Button onClick={submit} disabled={saving || !unitId || cart.length === 0} className="gap-1.5">
                            {saving && <Loader2 className="w-4 h-4 animate-spin" />} Send request{total ? ` · ${total}` : ""}
                        </Button>
                        <Button variant="outline" onClick={onClose}>Cancel</Button>
                        <span className="text-xs text-muted-foreground ml-auto">Approved straight away — it goes to the QG list.</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

function Chip({ active, onClick, dot, children }: { active: boolean; onClick: () => void; dot?: string; children: React.ReactNode }) {
    return (
        <button type="button" onClick={onClick}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${active ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:bg-muted/70"}`}>
            {dot && <span className={`w-2 h-2 rounded-full ${dot}`} />}
            {children}
        </button>
    );
}
