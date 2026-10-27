"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEffect, useMemo, useRef, useState } from "react";
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
 * The family side of uniform and badge orders: the child, then what they need.
 * No contact details — the leaders hand the items to the child at a meeting.
 * Phones first: every control is thumb-sized, text inputs are 16px (smaller
 * makes iOS zoom in), and the basket follows as a bar at the bottom.
 */
export function OrderForm() {
    const [units, setUnits] = useState<Unit[]>([]);
    const [items, setItems] = useState<Item[]>([]);
    const [loading, setLoading] = useState(true);
    const [unitId, setUnitId] = useState("");
    const [childName, setChildName] = useState("");
    const [website, setWebsite] = useState("");
    const [cart, setCart] = useState<Line[]>([]);
    const [picked, setPicked] = useState<Record<string, string>>({});
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [done, setDone] = useState<{ orderRef: string; total: string | null; unitName: string } | null>(null);
    const nameRef = useRef<HTMLInputElement>(null);
    const basketRef = useRef<HTMLElement>(null);
    useUnsavedChanges(cart.length > 0 && !done, "Your order is not sent yet. Leave and lose it?");

    useEffect(() => {
        fetch("/api/order/catalog").then(r => r.json()).then(d => {
            setUnits((d.units ?? []).sort(compareUnitsByBranch));
            setItems(d.items ?? []);
        }).catch(() => setError("Could not load the list. Please refresh the page.")).finally(() => setLoading(false));
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
    const count = cart.reduce((n, l) => n + l.quantity, 0);
    const inCart = (id: string) => cart.filter(l => l.itemId === id).reduce((n, l) => n + l.quantity, 0);

    function chooseUnit(id: string) {
        if (id === unitId) return;
        if (cart.length && !confirm("Changing the unit empties the basket. Continue?")) return;
        setUnitId(id);
        setCart([]);
    }

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

    async function submit(e?: React.FormEvent) {
        e?.preventDefault();
        if (!childName.trim()) {
            setError("Type your child's name");
            nameRef.current?.focus();
            nameRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
            return;
        }
        if (!cart.length) { setError("Add at least one item"); return; }
        setBusy(true); setError("");
        const res = await fetch("/api/order", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ unitId, childName, website, items: cart }),
        }).catch(() => null);
        const d = res ? await res.json().catch(() => ({})) : {};
        setBusy(false);
        if (!res?.ok) { setError(d.error || "Something went wrong. Please try again."); return; }
        setDone(d);
        window.scrollTo({ top: 0 });
    }

    if (loading) return <p className="text-muted-foreground flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</p>;

    if (done) {
        return (
            <div className="text-center py-12 px-2">
                <CheckCircle2 className="w-14 h-14 text-emerald-600 mx-auto mb-4" />
                <h1 className="text-2xl font-bold">Thank you, your order is sent</h1>
                <p className="text-muted-foreground mt-3">
                    The leaders of {done.unitName} will hand it to your child at a meeting.
                    {done.total && <> Total: <strong className="text-foreground">{done.total}</strong>.</>}
                </p>
                <p className="mt-5 text-sm">Reference: <strong className="font-mono text-lg">{done.orderRef}</strong></p>
                <Button variant="outline" className="mt-8 h-11" onClick={() => { setDone(null); setCart([]); setChildName(""); }}>
                    Order for another child
                </Button>
            </div>
        );
    }

    return (
        <form onSubmit={submit} className={`space-y-5 ${cart.length ? "pb-28" : ""}`}>
            <div>
                <p className="text-xs font-bold uppercase tracking-widest text-primary">Group SHS</p>
                <h1 className="text-2xl sm:text-3xl font-black mt-1">Uniform & badges</h1>
                <p className="text-sm text-muted-foreground mt-2">
                    Choose what your child needs. Nothing is paid here: the leaders confirm the order and hand it to your child.
                </p>
            </div>

            <section className="bg-card border rounded-2xl p-4 sm:p-5 space-y-4">
                <h2 className="font-bold"><span className="text-primary mr-1.5">1</span> Your child</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {units.map(u => {
                        const t = unitTheme(u.unitType);
                        return (
                            <button key={u.id} type="button" onClick={() => chooseUnit(u.id)} aria-pressed={unitId === u.id}
                                className={`flex items-center gap-2 min-h-12 px-3 py-2 rounded-xl border text-sm font-semibold text-left transition-all ${unitId === u.id ? "ring-2 ring-primary border-primary bg-primary/5" : "hover:bg-muted active:bg-muted"}`}>
                                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${t.dot}`} /> <span className="min-w-0">{u.name}</span>
                            </button>
                        );
                    })}
                </div>
                <label className="block space-y-1.5">
                    <span className="text-sm font-medium">First and last name</span>
                    <Input ref={nameRef} value={childName} onChange={e => setChildName(e.target.value)} placeholder="e.g. Karim Khoury"
                        autoComplete="off" autoCapitalize="words" className="h-12 text-base" />
                </label>
            </section>

            {unit && (
                <section className="bg-card border rounded-2xl p-4 sm:p-5 space-y-5">
                    <h2 className="font-bold"><span className="text-primary mr-1.5">2</span> What they need <span className="font-normal text-sm text-muted-foreground">· {unit.name}</span></h2>
                    {offered.length === 0 ? <p className="text-sm text-muted-foreground">Nothing is available to order for this unit yet.</p> : byCategory.map(([cat, list]) => (
                        <div key={cat} className="space-y-2">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{categoryLabel(cat)}</h3>
                            <div className="grid sm:grid-cols-2 gap-3">
                                {list.map(i => {
                                    const n = inCart(i.id);
                                    return (
                                        <div key={i.id} className={`rounded-xl border p-3 space-y-3 ${n ? "border-primary/40 bg-primary/5" : ""}`}>
                                            <div className="flex gap-3">
                                                {i.photoUrl && (
                                                    /* eslint-disable-next-line @next/next/no-img-element */
                                                    <img src={i.photoUrl} alt="" className="w-16 h-16 rounded-lg object-cover shrink-0" />
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-semibold leading-snug">{i.name}</p>
                                                    <p className="text-sm font-semibold mt-0.5">{formatMoney(i.sellPrice, i.currency) ?? <span className="font-normal text-muted-foreground">Price on confirmation</span>}</p>
                                                    {i.description && <p className="text-xs text-muted-foreground mt-0.5">{i.description}</p>}
                                                </div>
                                                {n > 0 && <span className="self-start text-xs font-bold px-2 py-0.5 rounded-full bg-primary text-white shrink-0">{n} in basket</span>}
                                            </div>
                                            <div className="flex gap-2">
                                                {i.variants.length > 0 && (
                                                    <select value={picked[i.id] ?? ""} onChange={e => setPicked(p => ({ ...p, [i.id]: e.target.value }))}
                                                        className="h-11 rounded-md border border-input bg-background px-2 text-base flex-1 min-w-0" aria-label={`Size / option for ${i.name}`}>
                                                        <option value="">Size / option…</option>
                                                        {i.variants.map(v => <option key={v} value={v}>{v}</option>)}
                                                    </select>
                                                )}
                                                <Button type="button" variant="outline" className={`h-11 gap-1 shrink-0 ${i.variants.length ? "" : "flex-1"}`} onClick={() => add(i)}>
                                                    <Plus className="w-4 h-4" /> Add
                                                </Button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </section>
            )}

            {cart.length > 0 && (
                <section ref={basketRef} className="bg-card border-2 border-primary/30 rounded-2xl p-4 sm:p-5 space-y-3 scroll-mt-4">
                    <h2 className="font-bold flex items-center gap-2"><ShoppingBag className="w-4 h-4 text-primary" /> Basket</h2>
                    <ul className="divide-y">
                        {cart.map((l, n) => {
                            const i = itemOf(l.itemId)!;
                            const line = formatTotals([{ amount: i.sellPrice, quantity: l.quantity, currency: i.currency }]);
                            return (
                                <li key={`${l.itemId}|${l.variant}`} className="py-2.5 flex items-center gap-2">
                                    <span className="flex-1 min-w-0 text-sm">
                                        <span className="font-medium">{i.name}</span>
                                        {l.variant && <span className="block text-xs text-muted-foreground">{l.variant}</span>}
                                    </span>
                                    <span className="inline-flex items-center gap-1 shrink-0">
                                        <button type="button" onClick={() => setQty(n, l.quantity - 1)} className="w-9 h-9 rounded-lg border flex items-center justify-center active:bg-muted" aria-label="One less">{l.quantity === 1 ? <Trash2 className="w-4 h-4" /> : <Minus className="w-4 h-4" />}</button>
                                        <span className="w-7 text-center font-semibold">{l.quantity}</span>
                                        <button type="button" onClick={() => setQty(n, l.quantity + 1)} className="w-9 h-9 rounded-lg border flex items-center justify-center active:bg-muted" aria-label="One more"><Plus className="w-4 h-4" /></button>
                                    </span>
                                    <span className="w-16 text-right text-sm font-semibold shrink-0">{line ?? "—"}</span>
                                </li>
                            );
                        })}
                    </ul>
                    {total && <p className="text-right font-bold">Total: {total}</p>}
                </section>
            )}

            {/* Left empty by people; bots fill it in. */}
            <input type="text" name="website" value={website} onChange={e => setWebsite(e.target.value)} tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
            {error && !cart.length && <p className="text-sm text-destructive">{error}</p>}

            {cart.length > 0 && (
                <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 pb-[env(safe-area-inset-bottom)]">
                    <div className="max-w-3xl mx-auto px-4 py-3 space-y-2">
                        {error && <p className="text-sm text-destructive">{error}</p>}
                        <div className="flex items-center gap-3">
                            <button type="button" onClick={() => basketRef.current?.scrollIntoView({ behavior: "smooth" })} className="flex-1 min-w-0 text-left">
                                <span className="block text-xs text-muted-foreground">{count} item{count !== 1 ? "s" : ""}{childName.trim() ? ` for ${childName.trim()}` : ""}</span>
                                <span className="block font-bold truncate">{total ?? "Basket"}</span>
                            </button>
                            <Button type="submit" disabled={busy} className="h-12 px-6 gap-2 text-base shrink-0">
                                {busy && <Loader2 className="w-4 h-4 animate-spin" />} Send order
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </form>
    );
}
