"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
    Ban, Check, ChevronDown, CircleDollarSign, Home, Link2, Loader2, Minus, PackageCheck, Pencil, Plus, Search, ShoppingBag,
    ShoppingCart, Trash2, UserRound, X,
} from "lucide-react";
import { formatMoney, formatTotals, itemFitsUnit } from "@/lib/stock";
import { unitTheme } from "@/lib/unit-theme";
import { SELECT, StatusPill, api, type Item, type Request, type Unit } from "./shared";

type Member = { id: string; firstName: string; lastName: string; unitId: string; servesUnitId?: string | null; subgroup?: { name: string } | null };
type Stage = "approve" | "qg" | "ready" | "done";
type Act = (r: Request, body: Record<string, unknown>, confirmText?: string) => Promise<boolean>;
type Bulk = (list: Request[], body: Record<string, unknown>, text?: string) => Promise<void>;

/** The QG is a shop: approved → brought from the QG (bought) → handed to the scout. */
const STAGES: { key: Stage; label: string; statuses: string[] }[] = [
    { key: "approve", label: "To approve", statuses: ["REQUESTED"] },
    { key: "qg", label: "To bring from the QG", statuses: ["APPROVED"] },
    { key: "ready", label: "Ready to hand over", statuses: ["READY"] },
    { key: "done", label: "Done", statuses: ["DELIVERED", "REJECTED", "CANCELLED"] },
];

// One family order, or one scout: a matched member groups everything for them;
// an unmatched name groups by what the family typed and its order reference.
const personKey = (r: Request) => r.member?.id ?? `name:${(r.requestedForName ?? "").toLowerCase()}|${r.requestedForName ? r.orderRef ?? "" : ""}`;
const personName = (r: Request) => (r.member ? `${r.member.firstName} ${r.member.lastName}` : r.requestedForName || "For the unit");
const lineTotal = (r: Request) => formatTotals([{ amount: r.unitPrice, quantity: r.quantity, currency: r.currency }]);
const totalOf = (list: Request[]) => formatTotals(list.map(r => ({ amount: r.unitPrice, quantity: r.quantity, currency: r.currency })));
const billable = (r: Request) => !["REJECTED", "CANCELLED"].includes(r.status);
const unpaidOf = (list: Request[]) => list.filter(r => billable(r) && !r.paid);
const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

/**
 * Requests for scouts, the way a leader thinks about them: unit by unit, then
 * child by child, with what it costs and whether it is paid. Families' orders
 * from the public page arrive here "to approve" for that unit's maîtrise.
 */
export function Requests({ requests, catalog, units, scope, onScope, storekeeper, onChanged }: {
    requests: Request[] | null; catalog: Item[]; units: Unit[];
    scope: "open" | "all"; onScope: (s: "open" | "all") => void;
    storekeeper: boolean; onChanged: () => void;
}) {
    const [stage, setStage] = useState<Stage>("approve");
    const [unitFilter, setUnitFilter] = useState("");
    const [search, setSearch] = useState("");
    const [unpaidOnly, setUnpaidOnly] = useState(false);
    const [creating, setCreating] = useState(false);
    const [busy, setBusy] = useState(false);
    const [members, setMembers] = useState<Member[] | null>(null);

    // Loaded the first time someone needs to pick a scout, not on every visit.
    const loadMembers = useCallback(() => {
        if (members) return;
        setMembers([]);
        api<Member[]>("/api/admin/members").then(r => setMembers(r.ok ? (r.data as Member[]) : []));
    }, [members]);

    const all = useMemo(() => requests ?? [], [requests]);
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

    // Units the user leads, plus any other unit whose requests they can see.
    const unitChips = useMemo(() => {
        const m = new Map(units.map(u => [u.id, u]));
        for (const r of all) if (!m.has(r.unit.id)) m.set(r.unit.id, r.unit);
        return [...m.values()];
    }, [units, all]);

    const inStage = (r: Request) => STAGES.find(s => s.key === stage)!.statuses.includes(r.status);
    const q = fold(search);
    const shown = all.filter(r =>
        inStage(r)
        && (!unitFilter || r.unit.id === unitFilter)
        && (!unpaidOnly || (billable(r) && !r.paid))
        && (!q || [personName(r), r.requestedForName, r.item.name, r.variant, r.orderRef].some(v => v && fold(v).includes(q))));

    const byUnit = useMemo(() => {
        const m = new Map<string, { unit: Unit; list: Request[] }>();
        for (const r of shown) {
            const g = m.get(r.unit.id) ?? { unit: r.unit, list: [] };
            g.list.push(r);
            m.set(r.unit.id, g);
        }
        return [...m.values()].sort((a, b) => a.unit.name.localeCompare(b.unit.name));
    }, [shown]);

    const act: Act = async (r, body, confirmText) => {
        if (confirmText && !confirm(confirmText)) return false;
        const res = await api(`/api/admin/stock/requests/${r.id}`, "PATCH", body);
        if (!res.ok) alert(res.data.error || "Could not update");
        onChanged();
        return res.ok;
    };
    const bulk: Bulk = async (list, body, text) => {
        if (text && !confirm(text)) return;
        setBusy(true);
        const res = await api<{ updated: number; skipped: number }>("/api/admin/stock/requests/bulk", "POST", { ids: list.map(r => r.id), ...body });
        setBusy(false);
        if (!res.ok) alert(res.data.error || "Could not update");
        else if (res.data.skipped) alert(`${res.data.updated} updated, ${res.data.skipped} left as they were.`);
        onChanged();
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
                <div className="w-full sm:w-auto overflow-x-auto -mx-1 px-1">
                    <div className="inline-flex items-center rounded-2xl bg-muted/60 border p-1 whitespace-nowrap" role="tablist">
                        {STAGES.map(s => (
                            <button key={s.key} role="tab" aria-selected={stage === s.key} onClick={() => pickStage(s.key)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 ${stage === s.key ? "bg-background shadow-sm" : "text-muted-foreground"}`}>
                                {s.label}
                                {s.key !== "done" && counts[s.key] > 0 && <span className={`text-[10px] px-1.5 rounded-full ${s.key === "approve" ? "bg-sky-600 text-white" : "bg-muted-foreground/20"}`}>{counts[s.key]}</span>}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="relative flex-1 min-w-[180px] sm:max-w-xs">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Scout, item, reference…" className="h-9 pl-8" />
                </div>
                <button type="button" onClick={() => setUnpaidOnly(v => !v)} aria-pressed={unpaidOnly}
                    className={`h-9 px-3 rounded-md border text-xs font-semibold inline-flex items-center gap-1.5 ${unpaidOnly ? "bg-amber-100 border-amber-300 text-amber-900" : "hover:bg-muted"}`}>
                    <CircleDollarSign className="w-4 h-4" /> Unpaid only
                </button>
                {units.length > 0 && (
                    <Button onClick={() => { loadMembers(); setCreating(true); }} className="gap-1.5 sm:ml-auto" disabled={catalog.length === 0}>
                        <Plus className="w-4 h-4" /> New request
                    </Button>
                )}
            </div>

            {unitChips.length > 1 && (
                <div className="flex flex-wrap gap-1.5">
                    <Chip active={!unitFilter} onClick={() => setUnitFilter("")}>All units</Chip>
                    {unitChips.map(u => {
                        const n = all.filter(r => r.unit.id === u.id && inStage(r)).length;
                        return <Chip key={u.id} active={unitFilter === u.id} onClick={() => setUnitFilter(u.id)} dot={unitTheme(u.unitType).dot}>{u.name}{n > 0 && <span className="opacity-70 ml-1">{n}</span>}</Chip>;
                    })}
                </div>
            )}

            {catalog.length === 0 && (
                <p className="text-xs text-muted-foreground">
                    Nothing can be requested yet{storekeeper ? ": in Inventory, tick \"Leaders can request it\" on uniform and badge items." : ". The storekeeper has not set up the catalog."}
                </p>
            )}

            {requests === null ? (
                <p className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</p>
            ) : byUnit.length === 0 ? (
                <p className="rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground">
                    {unpaidOnly ? "Nothing unpaid here." : stage === "approve" ? "Nothing waiting for approval." : stage === "qg" ? "Nothing to bring from the QG." : stage === "ready" ? "Nothing waiting to be handed over." : "Nothing here."}
                </p>
            ) : byUnit.map(({ unit, list }) => (
                <UnitCard key={unit.id} unit={unit} list={list} stage={stage} busy={busy} catalog={catalog}
                    members={members} loadMembers={loadMembers} onAct={act} onBulk={bulk} onChanged={onChanged} />
            ))}

            {creating && (
                <NewRequest catalog={catalog} units={units} members={members ?? []}
                    onClose={() => setCreating(false)} onDone={() => { setCreating(false); onChanged(); }} />
            )}
        </div>
    );
}

function UnitCard({ unit, list, stage, busy, catalog, members, loadMembers, onAct, onBulk, onChanged }: {
    unit: Unit; list: Request[]; stage: Stage; busy: boolean; catalog: Item[];
    members: Member[] | null; loadMembers: () => void;
    onAct: Act; onBulk: Bulk; onChanged: () => void;
}) {
    const [open, setOpen] = useState(true);
    const theme = unitTheme(unit.unitType);
    const people = useMemo(() => {
        const m = new Map<string, Request[]>();
        for (const r of list) m.set(personKey(r), [...(m.get(personKey(r)) ?? []), r]);
        return [...m.values()].sort((a, b) => Number(!!a[0].member) - Number(!!b[0].member) || personName(a[0]).localeCompare(personName(b[0])));
    }, [list]);
    const approvable = list.filter(r => r.next.includes("APPROVED"));
    const buyable = list.filter(r => r.next.includes("READY"));
    const deliverable = list.filter(r => r.next.includes("DELIVERED"));
    const total = totalOf(list.filter(billable));
    const unpaid = totalOf(unpaidOf(list));

    return (
        <section className="rounded-2xl border bg-card overflow-hidden">
            <div className={`${theme.headerBg} px-3 sm:px-4 py-3 flex flex-wrap items-center gap-2 sm:gap-3`}>
                <button onClick={() => setOpen(o => !o)} className="flex items-center gap-2 flex-1 min-w-[200px] text-left">
                    <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${open ? "" : "-rotate-90"}`} />
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${theme.dot}`} />
                    <span className="font-bold">{unit.name}</span>
                    <span className="text-xs text-muted-foreground">
                        {people.length} scout{people.length !== 1 ? "s" : ""} · {list.reduce((n, r) => n + r.quantity, 0)} items{total ? ` · ${total}` : ""}
                        {unpaid && <span className="text-amber-700 font-semibold"> · {unpaid} unpaid</span>}
                    </span>
                </button>
                {stage === "approve" && approvable.length > 1 && (
                    <Button size="sm" className="gap-1.5" disabled={busy} onClick={() => onBulk(approvable, { to: "APPROVED" }, `Approve all ${approvable.length} requests of ${unit.name}?`)}>
                        <Check className="w-4 h-4" /> Approve all
                    </Button>
                )}
                {stage === "qg" && buyable.length > 1 && (
                    <Button size="sm" className="gap-1.5" disabled={busy} onClick={() => onBulk(buyable, { to: "READY" }, `Mark everything for ${unit.name} as bought at the QG?`)}>
                        <ShoppingCart className="w-4 h-4" /> All bought
                    </Button>
                )}
                {stage === "ready" && deliverable.length > 1 && (
                    <Button size="sm" variant="outline" className="gap-1.5" disabled={busy} onClick={() => onBulk(deliverable, { to: "DELIVERED" }, `Mark everything for ${unit.name} as handed over?`)}>
                        <PackageCheck className="w-4 h-4" /> All handed over
                    </Button>
                )}
            </div>
            {open && (
                <div className="divide-y">
                    {people.map(rs => (
                        <Person key={personKey(rs[0])} rs={rs} unit={unit} busy={busy} catalog={catalog}
                            members={members} loadMembers={loadMembers} onAct={onAct} onBulk={onBulk} onChanged={onChanged} />
                    ))}
                </div>
            )}
        </section>
    );
}

/** Everything for one scout (or one family's order): who, paid or not, and the lines. */
function Person({ rs, unit, busy, catalog, members, loadMembers, onAct, onBulk, onChanged }: {
    rs: Request[]; unit: Unit; busy: boolean; catalog: Item[];
    members: Member[] | null; loadMembers: () => void;
    onAct: Act; onBulk: Bulk; onChanged: () => void;
}) {
    const [matching, setMatching] = useState(false);
    const [adding, setAdding] = useState(false);
    const first = rs[0];
    const manage = rs.filter(r => r.canManage);
    const unmatched = !first.member && !!first.requestedForName;
    const unpaid = unpaidOf(manage);
    const allPaid = rs.filter(billable).length > 0 && rs.filter(billable).every(r => r.paid);
    const family = rs.some(r => r.source === "FAMILY");
    const canAdd = rs.some(r => r.canManage);

    async function addLine(v: { itemId: string; variant: string; quantity: number }) {
        const res = await api("/api/admin/stock/requests", "POST", { sameAs: first.id, items: [v] });
        if (!res.ok) { alert(res.data.error || "Could not add it"); return false; }
        setAdding(false);
        onChanged();
        return true;
    }

    return (
        <div className="px-3 sm:px-4 py-3 space-y-2">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
                {first.member ? <UserRound className="w-4 h-4 text-muted-foreground" /> : unmatched ? <UserRound className="w-4 h-4 text-amber-600" /> : <Home className="w-4 h-4 text-muted-foreground" />}
                <span className="font-semibold text-sm">{personName(first)}</span>
                {first.member && first.requestedForName && fold(first.requestedForName) !== fold(personName(first)) && (
                    <span className="text-[11px] text-muted-foreground">typed “{first.requestedForName}”</span>
                )}
                {family && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-sky-100 text-sky-800">Family order</span>}
                {unmatched && manage.length > 0 && (
                    <button onClick={() => { loadMembers(); setMatching(m => !m); }}
                        className="text-[11px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900 hover:bg-amber-200 inline-flex items-center gap-1"
                        title="The name typed by the family does not exactly match a member: pick the right scout">
                        <Link2 className="w-3 h-3" /> Name not matched · pick the scout
                    </button>
                )}
                {unmatched && manage.length === 0 && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">name not matched</span>}
                {first.member && family && manage.length > 0 && (
                    <button onClick={() => { loadMembers(); setMatching(m => !m); }} className="text-[11px] text-muted-foreground hover:text-foreground underline-offset-2 hover:underline">change scout</button>
                )}
                <span className="ml-auto flex items-center gap-2">
                    {allPaid ? (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 inline-flex items-center gap-1"><Check className="w-3 h-3" /> Paid</span>
                    ) : unpaid.length > 0 && (
                        <button disabled={busy} onClick={() => onBulk(unpaid, { paid: true })}
                            className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 hover:bg-emerald-100 hover:text-emerald-800 inline-flex items-center gap-1"
                            title="Mark everything for this scout as paid">
                            <CircleDollarSign className="w-3 h-3" /> {totalOf(unpaid) ?? ""} unpaid · mark paid
                        </button>
                    )}
                    <span className="text-sm font-bold">{totalOf(rs.filter(billable))}</span>
                </span>
            </div>

            {matching && (
                <MatchPicker
                    typed={first.requestedForName ?? ""} unitId={unit.id} members={members}
                    onCancel={() => setMatching(false)}
                    onPick={async (m) => { setMatching(false); await onBulk(manage, { memberId: m.id }); }}
                />
            )}

            <ul className="space-y-1.5">
                {rs.map(r => <RequestLine key={r.id} r={r} catalog={catalog} onAct={onAct} />)}
            </ul>

            {canAdd && (adding ? (
                <LineEditor unit={unit} catalog={catalog} onCancel={() => setAdding(false)} onSave={addLine} saveLabel="Add" />
            ) : (
                <button onClick={() => setAdding(true)} className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1 px-1">
                    <Plus className="w-3.5 h-3.5" /> Add an item for {first.member ? first.member.firstName : first.requestedForName ? "this child" : "the unit"}
                </button>
            ))}
        </div>
    );
}

/**
 * Pick the scout a family meant. Starts from what they typed: members sharing
 * a word of it come first, so "Karim" or a misspelt surname still finds them.
 */
function MatchPicker({ typed, unitId, members, onPick, onCancel }: {
    typed: string; unitId: string; members: Member[] | null; onPick: (m: Member) => void; onCancel: () => void;
}) {
    const [query, setQuery] = useState(typed);
    const words = fold(query).split(/\s+/).filter(w => w.length >= 2);
    const list = (members ?? [])
        .filter(m => m.unitId === unitId || m.servesUnitId === unitId)
        .map(m => {
            const name = fold(`${m.firstName} ${m.lastName}`);
            return { m, score: words.filter(w => name.includes(w)).length };
        })
        .filter(x => !words.length || x.score > 0)
        .sort((a, b) => b.score - a.score || a.m.firstName.localeCompare(b.m.firstName))
        .slice(0, 30);

    return (
        <div className="rounded-xl border border-amber-200 bg-amber-50/60 dark:bg-amber-950/20 p-3 space-y-2">
            <div className="flex items-center gap-2">
                <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="Search the unit's scouts…" className="h-9 pl-8 bg-background" />
                </div>
                <button onClick={onCancel} className="p-1.5 text-muted-foreground hover:text-foreground" aria-label="Close"><X className="w-4 h-4" /></button>
            </div>
            {members === null || (members.length === 0 && list.length === 0 && !words.length) ? (
                <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading scouts…</p>
            ) : list.length === 0 ? (
                <p className="text-xs text-muted-foreground">No scout of this unit matches. Try part of the name.</p>
            ) : (
                <div className="max-h-56 overflow-y-auto rounded-lg border bg-background divide-y">
                    {list.map(({ m }) => (
                        <button key={m.id} onClick={() => onPick(m)} className="w-full text-left px-3 py-2.5 text-sm hover:bg-muted flex items-center gap-2">
                            <UserRound className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="flex-1">{m.firstName} {m.lastName}</span>
                            {m.subgroup?.name && <span className="text-xs text-muted-foreground">{m.subgroup.name}</span>}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

function RequestLine({ r, catalog, onAct }: { r: Request; catalog: Item[]; onAct: Act }) {
    const [editing, setEditing] = useState(false);
    const enough = r.item.quantity >= r.quantity;
    const forward = r.next.filter(s => s !== "REJECTED");
    const price = formatMoney(r.unitPrice, r.currency ?? "USD");

    if (editing) {
        return (
            <li>
                <LineEditor unit={r.unit} catalog={catalog} saveLabel="Save"
                    initial={{ itemId: r.item.id, variant: r.variant ?? "", quantity: r.quantity }} current={r.item}
                    onCancel={() => setEditing(false)}
                    onSave={async v => {
                        const ok = await onAct(r, { action: "edit", ...v });
                        if (ok) setEditing(false);
                        return ok;
                    }} />
            </li>
        );
    }

    return (
        <li className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg bg-muted/30 px-3 py-2">
            <span className="flex-1 min-w-[160px] text-sm">
                {r.quantity > 1 && <strong>{r.quantity} × </strong>}{r.item.name}
                {r.variant && <span className="text-muted-foreground"> · {r.variant}</span>}
                <span className="block text-[11px] text-muted-foreground">
                    {price ? `${price} each` : "no price"}
                    {" · "}{r.source === "FAMILY" && r.requestedByName === "Family" ? "ordered by the family" : `by ${r.requestedByName}`} · {new Date(r.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    {r.orderRef && ` · #${r.orderRef}`}
                    {r.fromStock && " · from stock"}
                </span>
                {(r.note || r.statusNote) && <span className="block text-[11px]">{r.note}{r.note && r.statusNote ? " · " : ""}{r.statusNote && <em>{r.statusNote}</em>}</span>}
            </span>
            <span className="text-sm font-semibold w-16 text-right">{lineTotal(r) ?? "—"}</span>
            {billable(r) && (r.canManage ? (
                <button onClick={() => onAct(r, { action: "paid", paid: !r.paid })} title={r.paid ? "Paid. Click to mark unpaid" : "Not paid yet. Click to mark paid"}
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${r.paid ? "bg-emerald-100 text-emerald-800" : "bg-amber-50 text-amber-800 border border-amber-200 hover:bg-emerald-50"}`}>
                    {r.paid ? "Paid" : "Unpaid"}
                </button>
            ) : (
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${r.paid ? "bg-emerald-100 text-emerald-800" : "bg-amber-50 text-amber-800"}`}>{r.paid ? "Paid" : "Unpaid"}</span>
            ))}
            <StatusPill status={r.status} />
            <span className="flex flex-wrap items-center gap-1">
                {r.canEdit && (
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Change item, size or quantity" onClick={() => setEditing(true)}>
                        <Pencil className="w-3.5 h-3.5" />
                    </Button>
                )}
                {r.canGive && ["REQUESTED", "APPROVED"].includes(r.status) && (
                    <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" disabled={!enough} title={enough ? `${r.item.quantity} in stock` : `Only ${r.item.quantity} in stock`}
                        onClick={() => onAct(r, { action: "give" }, `Hand out ${r.quantity} × ${r.item.name} from stock? The stock goes down by ${r.quantity}.`)}>
                        <PackageCheck className="w-3.5 h-3.5" /> Stock ({r.item.quantity})
                    </Button>
                )}
                {forward.map(s => (
                    <Button key={s} size="sm" variant={s === "APPROVED" ? "default" : "outline"} className="h-7 gap-1 text-xs" onClick={() => onAct(r, { action: "move", to: s })}>
                        {s === "READY" ? <ShoppingCart className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                        {s === "APPROVED" ? "Approve" : s === "READY" ? "Bought" : "Handed over"}
                    </Button>
                ))}
                {r.next.includes("REJECTED") && (
                    <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={() => {
                        const note = prompt("Reject this request? Reason (optional):", "");
                        if (note !== null) onAct(r, { action: "move", to: "REJECTED", note });
                    }}>Reject</Button>
                )}
                {r.canCancel && !r.next.includes("REJECTED") && (
                    <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs text-muted-foreground" onClick={() => onAct(r, { action: "cancel" }, "Cancel this request?")}>
                        <Ban className="w-3.5 h-3.5" /> Cancel
                    </Button>
                )}
            </span>
        </li>
    );
}

/** Pick an item for the unit's branch, its size and how many. Used to change a line and to add one. */
function LineEditor({ unit, catalog, initial, current, onSave, onCancel, saveLabel }: {
    unit: Unit; catalog: Item[];
    initial?: { itemId: string; variant: string; quantity: number };
    /** The line's item, kept selectable even if it left the catalog since. */
    current?: { id: string; name: string; variants: string[] };
    onSave: (v: { itemId: string; variant: string; quantity: number }) => Promise<boolean>;
    onCancel: () => void; saveLabel: string;
}) {
    const offered = catalog.filter(i => itemFitsUnit(i, unit.unitType));
    type Option = { id: string; name: string; variants: string[]; sellPrice?: string | null; currency?: string };
    const options: Option[] = current && !offered.some(i => i.id === current.id) ? [current, ...offered] : offered;
    const [itemId, setItemId] = useState(initial?.itemId ?? "");
    const [variant, setVariant] = useState(initial?.variant ?? "");
    const [quantity, setQuantity] = useState(initial?.quantity ?? 1);
    const [saving, setSaving] = useState(false);
    const item = options.find(i => i.id === itemId);
    const ready = !!item && (!item.variants.length || !!variant) && quantity >= 1;

    return (
        <div className="rounded-lg border-2 border-primary/30 bg-background px-3 py-2.5 flex flex-wrap items-center gap-2">
            <select value={itemId} onChange={e => { setItemId(e.target.value); setVariant(""); }} className={`${SELECT} flex-1 min-w-[160px]`} aria-label="Item">
                <option value="">Item…</option>
                {options.map(i => <option key={i.id} value={i.id}>{i.name}{i.sellPrice ? ` · ${formatMoney(i.sellPrice, i.currency)}` : ""}</option>)}
            </select>
            {item && item.variants.length > 0 && (
                <select value={variant} onChange={e => setVariant(e.target.value)} className={`${SELECT} flex-1 min-w-[120px]`} aria-label="Size / option">
                    <option value="">Size / option…</option>
                    {item.variants.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
            )}
            <span className="inline-flex items-center gap-1">
                <button type="button" onClick={() => setQuantity(q => Math.max(1, q - 1))} className="w-8 h-8 rounded border flex items-center justify-center" aria-label="Less"><Minus className="w-3.5 h-3.5" /></button>
                <span className="w-6 text-center text-sm font-semibold">{quantity}</span>
                <button type="button" onClick={() => setQuantity(q => Math.min(200, q + 1))} className="w-8 h-8 rounded border flex items-center justify-center" aria-label="More"><Plus className="w-3.5 h-3.5" /></button>
            </span>
            <span className="flex gap-1.5 ml-auto">
                <Button size="sm" disabled={!ready || saving} className="gap-1" onClick={async () => {
                    setSaving(true);
                    await onSave({ itemId, variant, quantity });
                    setSaving(false);
                }}>
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} {saveLabel}
                </Button>
                <Button size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
            </span>
        </div>
    );
}

type CartLine = { itemId: string; variant: string; quantity: number };

/** A leader's order, in a side panel: unit → scout → items for that branch → send. */
function NewRequest({ catalog, units, members, onClose, onDone }: { catalog: Item[]; units: Unit[]; members: Member[]; onClose: () => void; onDone: () => void }) {
    const [unitId, setUnitId] = useState(units.length === 1 ? units[0].id : "");
    const [memberId, setMemberId] = useState("");
    const [who, setWho] = useState("");
    const [cart, setCart] = useState<CartLine[]>([]);
    const [picked, setPicked] = useState<Record<string, string>>({});
    const [note, setNote] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => { document.body.style.overflow = prev; };
    }, []);

    const unit = units.find(u => u.id === unitId);
    const offered = useMemo(() => (unit ? catalog.filter(i => itemFitsUnit(i, unit.unitType)) : []), [catalog, unit]);
    const unitMembers = useMemo(() => members
        .filter(m => m.unitId === unitId || m.servesUnitId === unitId)
        .filter(m => !who.trim() || fold(`${m.firstName} ${m.lastName}`).includes(fold(who)))
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
            <div className="absolute inset-0 bg-black/40" aria-hidden onClick={onClose} />
            <div className="relative h-full w-full max-w-2xl bg-background shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
                <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-4 border-b">
                    <h2 className="text-xl font-semibold">New request</h2>
                    <button type="button" onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground" aria-label="Close"><X className="w-5 h-5" /></button>
                </div>
                <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 space-y-6">
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

                <div className="border-t px-4 sm:px-6 py-4 bg-card space-y-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
                    {cart.length > 0 && (
                        <ul className="space-y-1 max-h-40 overflow-y-auto">
                            {cart.map((l, n) => {
                                const i = itemOf(l.itemId)!;
                                return (
                                    <li key={`${l.itemId}|${l.variant}`} className="flex items-center gap-2 text-sm">
                                        <ShoppingBag className="w-3.5 h-3.5 text-muted-foreground" />
                                        <span className="flex-1 truncate">{i.name}{l.variant && <span className="text-muted-foreground"> · {l.variant}</span>}</span>
                                        <button onClick={() => setQty(n, l.quantity - 1)} className="w-7 h-7 rounded border flex items-center justify-center" aria-label="Less">{l.quantity === 1 ? <Trash2 className="w-3 h-3" /> : <Minus className="w-3 h-3" />}</button>
                                        <span className="w-5 text-center font-semibold">{l.quantity}</span>
                                        <button onClick={() => setQty(n, l.quantity + 1)} className="w-7 h-7 rounded border flex items-center justify-center" aria-label="More"><Plus className="w-3 h-3" /></button>
                                        <span className="w-16 text-right font-semibold">{formatTotals([{ amount: i.sellPrice, quantity: l.quantity, currency: i.currency }]) ?? "—"}</span>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                    {cart.length > 0 && <Input value={note} onChange={e => setNote(e.target.value)} placeholder="Note (optional)" className="h-9" />}
                    {error && <p className="text-sm text-destructive">{error}</p>}
                    <div className="flex flex-wrap items-center gap-2">
                        <Button onClick={submit} disabled={saving || !unitId || cart.length === 0} className="gap-1.5">
                            {saving && <Loader2 className="w-4 h-4 animate-spin" />} Send request{total ? ` · ${total}` : ""}
                        </Button>
                        <Button variant="outline" onClick={onClose}>Cancel</Button>
                        <span className="text-xs text-muted-foreground sm:ml-auto">Approved straight away: it goes on the QG list.</span>
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
