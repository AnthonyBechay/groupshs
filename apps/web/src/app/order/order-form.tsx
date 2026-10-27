"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { categoryLabel, formatMoney, formatTotals, itemFitsUnit } from "@/lib/stock";
import { compareUnitsByBranch } from "@/lib/scout-config";
import { unitTheme } from "@/lib/unit-theme";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";

type Unit = { id: string; name: string; unitType: string };
type Item = {
    id: string; name: string; category: string; description: string | null; photoUrl: string | null;
    variants: string[]; sellPrice: string | null; currency: string; forUnitTypes: string[];
};
type Line = { itemId: string; variant: string; quantity: number };

/**
 * The family side of uniform and badge orders. Three steps on one page: your
 * child, what you need, your details. The unit's leaders confirm every order
 * before anything is bought, so nothing here commits the family to a payment.
 */
export function OrderForm() {
    const [units, setUnits] = useState<Unit[]>([]);
    const [items, setItems] = useState<Item[]>([]);
    const [loading, setLoading] = useState(true);
    const [unitId, setUnitId] = useState("");
    const [childName, setChildName] = useState("");
    const [contactName, setContactName] = useState("");
    const [contactPhone, setContactPhone] = useState("");
    const [note, setNote] = useState("");
    const [website, setWebsite] = useState("");
    const [cart, setCart] = useState<Line[]>([]);
    const [picked, setPicked] = useState<Record<string, string>>({});
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [done, setDone] = useState<{ orderRef: string; total: string | null; unitName: string } | null>(null);
    useUnsavedChanges(cart.length > 0 && !done, "Your order is not sent yet. Leave and lose it?");

    useEffect(() => {
        fetch("/api/order/catalog").then(r => r.json()).then(d => {
            setUnits((d.units ?? []).sort(compareUnitsByBranch));
            setItems(d.items ?? []);
            setLoading(false);
        });
    }, []);

    const unit = units.find(u => u.id === unitId);
    const offered = useMemo(() => (unit ? items.filter(i => itemFitsUnit(i, unit.unitType)) : []), [items, unit]);
    const byCategory = useMemo(() => {
        const m = new Map<string, Item[]>();
        for (const i of offered) m.set(i.category, [...(m.get(i.category) ?? []), i]);
        return [...m.entries()];
    }, [offered]);
    const itemOf = (id: string) => items.find(i => i.id === id);
    const total = formatTotals(cart.map(l => ({ amount: itemOf(l.itemId)?.sellPrice, quantity: l.quantity, currency: itemOf(l.itemId)?.currency })));

    function add(i: Item) {
        const variant = picked[i.id] ?? "";
        if (i.variants.length && !variant) { setError(`Choose a size / option for "${i.name}" first`); return; }
        setError("");
        setCart(c => {
            const at = c.findIndex(l => l.itemId === i.id && l.variant === variant);
            if (at >= 0) return c.map((l, j) => (j === at ? { ...l, quantity: Math.min(20, l.quantity + 1) } : l));
            return [...c, { itemId: i.id, variant, quantity: 1 }];
        });
    }
    const setQty = (n: number, q: number) => setCart(c => (q < 1 ? c.filter((_, j) => j !== n) : c.map((l, j) => (j === n ? { ...l, quantity: Math.min(20, q) } : l))));

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        if (!cart.length) { setError("Add at least one item"); return; }
        setBusy(true); setError("");
        const res = await fetch("/api/order", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ unitId, childName, contactName, contactPhone, note, website, items: cart }),
        });
        const d = await res.json().catch(() => ({}));
        setBusy(false);
        if (!res.ok) { setError(d.error || "Something went wrong"); return; }
        setDone(d);
        window.scrollTo({ top: 0 });
    }

    if (loading) return <p className="text-muted-foreground flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</p>;

    if (done) {
        return (
            <div className="text-center py-14">
                <CheckCircle2 className="w-14 h-14 text-emerald-600 mx-auto mb-4" />
                <h1 className="text-2xl font-bold">Thank you — your order is sent</h1>
                <p className="text-muted-foreground mt-2">
                    The leaders of {done.unitName} will confirm it with you.{done.total && <> Expected total: <strong className="text-foreground">{done.total}</strong>.</>}
                </p>
                <p className="mt-4 text-sm">Your reference: <strong className="font-mono text-lg">{done.orderRef}</strong></p>
            </div>
        );
    }

    return (
        <form onSubmit={submit} className="space-y-6">
            <div>
                <p className="text-xs font-bold uppercase tracking-widest text-primary">Group SHS</p>
                <h1 className="text-3xl font-black mt-1">Uniform & badges</h1>
                <p className="text-sm text-muted-foreground mt-2">
                    Order what your child needs. Nothing is charged here: your child&apos;s leaders confirm the order and tell you how to collect and pay.
                </p>
            </div>

            <section className="bg-card border rounded-2xl p-5 space-y-4">
                <h2 className="font-bold"><span className="text-primary mr-1.5">1</span> Your child</h2>
                <div className="flex flex-wrap gap-2">
                    {units.map(u => {
                        const t = unitTheme(u.unitType);
                        return (
                            <button key={u.id} type="button" onClick={() => { setUnitId(u.id); setCart([]); }}
                                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border text-sm font-semibold transition-all ${unitId === u.id ? "ring-2 ring-primary border-primary" : "hover:bg-muted"}`}>
                                <span className={`w-2.5 h-2.5 rounded-full ${t.dot}`} /> {u.name}
                            </button>
                        );
                    })}
                </div>
                <label className="block space-y-1.5 max-w-md">
                    <span className="text-xs font-medium">Your child&apos;s first and last name</span>
                    <Input value={childName} onChange={e => setChildName(e.target.value)} required placeholder="e.g. Karim Khoury" />
                </label>
            </section>

            {unit && (
                <section className="bg-card border rounded-2xl p-5 space-y-5">
                    <h2 className="font-bold"><span className="text-primary mr-1.5">2</span> What you need <span className="font-normal text-sm text-muted-foreground">— for {unit.name}</span></h2>
                    {offered.length === 0 ? <p className="text-sm text-muted-foreground">Nothing is available to order for this unit yet.</p> : byCategory.map(([cat, list]) => (
                        <div key={cat} className="space-y-2">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{categoryLabel(cat)}</h3>
                            <div className="grid sm:grid-cols-2 gap-3">
                                {list.map(i => (
                                    <div key={i.id} className="rounded-xl border p-3 flex gap-3">
                                        {i.photoUrl && (
                                            /* eslint-disable-next-line @next/next/no-img-element */
                                            <img src={i.photoUrl} alt="" className="w-16 h-16 rounded-lg object-cover shrink-0" />
                                        )}
                                        <div className="flex-1 min-w-0 space-y-2">
                                            <div>
                                                <p className="text-sm font-semibold">{i.name}</p>
                                                <p className="text-xs text-muted-foreground">{formatMoney(i.sellPrice, i.currency) ?? "Price on confirmation"}{i.description ? ` · ${i.description}` : ""}</p>
                                            </div>
                                            <div className="flex gap-2">
                                                {i.variants.length > 0 && (
                                                    <select value={picked[i.id] ?? ""} onChange={e => setPicked(p => ({ ...p, [i.id]: e.target.value }))} className="h-9 rounded-md border border-input bg-background px-2 text-sm flex-1 min-w-0">
                                                        <option value="">Size / option…</option>
                                                        {i.variants.map(v => <option key={v} value={v}>{v}</option>)}
                                                    </select>
                                                )}
                                                <Button type="button" size="sm" variant="outline" className="gap-1 shrink-0" onClick={() => add(i)}><Plus className="w-4 h-4" /> Add</Button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </section>
            )}

            {cart.length > 0 && (
                <section className="bg-card border-2 border-primary/30 rounded-2xl p-5 space-y-3">
                    <h2 className="font-bold flex items-center gap-2"><ShoppingBag className="w-4 h-4 text-primary" /> Your order</h2>
                    <ul className="divide-y">
                        {cart.map((l, n) => {
                            const i = itemOf(l.itemId)!;
                            const line = formatTotals([{ amount: i.sellPrice, quantity: l.quantity, currency: i.currency }]);
                            return (
                                <li key={`${l.itemId}|${l.variant}`} className="py-2 flex items-center gap-3">
                                    <span className="flex-1 text-sm">{i.name}{l.variant && <span className="text-muted-foreground"> · {l.variant}</span>}</span>
                                    <span className="inline-flex items-center gap-1">
                                        <button type="button" onClick={() => setQty(n, l.quantity - 1)} className="w-7 h-7 rounded border flex items-center justify-center" aria-label="Less">{l.quantity === 1 ? <Trash2 className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}</button>
                                        <span className="w-6 text-center text-sm font-semibold">{l.quantity}</span>
                                        <button type="button" onClick={() => setQty(n, l.quantity + 1)} className="w-7 h-7 rounded border flex items-center justify-center" aria-label="More"><Plus className="w-3.5 h-3.5" /></button>
                                    </span>
                                    <span className="w-20 text-right text-sm font-semibold">{line ?? "—"}</span>
                                </li>
                            );
                        })}
                    </ul>
                    {total && <p className="text-right font-bold">Total: {total}</p>}
                </section>
            )}

            {unit && (
                <section className="bg-card border rounded-2xl p-5 space-y-4">
                    <h2 className="font-bold"><span className="text-primary mr-1.5">3</span> Your details</h2>
                    <div className="grid sm:grid-cols-2 gap-3">
                        <label className="space-y-1.5"><span className="text-xs font-medium">Your name</span><Input value={contactName} onChange={e => setContactName(e.target.value)} required placeholder="e.g. Rita Khoury (mother)" /></label>
                        <label className="space-y-1.5"><span className="text-xs font-medium">Phone</span><Input type="tel" value={contactPhone} onChange={e => setContactPhone(e.target.value)} required placeholder="03 123 456" /></label>
                    </div>
                    <label className="block space-y-1.5"><span className="text-xs font-medium">Note for the leaders (optional)</span><Input value={note} onChange={e => setNote(e.target.value)} /></label>
                    {/* Left empty by people; bots fill it in. */}
                    <input type="text" name="website" value={website} onChange={e => setWebsite(e.target.value)} tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
                    {error && <p className="text-sm text-destructive">{error}</p>}
                    <Button type="submit" disabled={busy || !cart.length} className="gap-2 w-full sm:w-auto">
                        {busy && <Loader2 className="w-4 h-4 animate-spin" />} Send my order{total ? ` · ${total}` : ""}
                    </Button>
                </section>
            )}
            {!unit && error && <p className="text-sm text-destructive">{error}</p>}
        </form>
    );
}
