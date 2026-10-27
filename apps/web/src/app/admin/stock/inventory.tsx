"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Archive, History, Loader2, Minus, Pencil, Plus, Search, Tag, X } from "lucide-react";
import { CONDITIONS, MEASURES, STOCK_CATEGORIES } from "@/lib/stock";
import {
    CategoryChip, ConditionText, SELECT, api, daysUntil, isLow, ownerOf, placeOf,
    type Item, type Room, type Subgroup, type Unit,
} from "./shared";

/**
 * The inventory: what there is, how many, in what state, who owns it and
 * where it is. Counts change with +/− (logged, with an optional reason).
 */
export function Inventory({ items, units, subgroups, rooms, storekeeper, onChanged }: {
    items: Item[] | null; units: Unit[]; subgroups: Subgroup[]; rooms: Room[]; storekeeper: boolean; onChanged: () => void;
}) {
    const [category, setCategory] = useState("");
    const [owner, setOwner] = useState("");          // "" all · "GROUP" · unit id
    const [place, setPlace] = useState("");          // "" all · "NONE" · location id
    const [search, setSearch] = useState("");
    const [lowOnly, setLowOnly] = useState(false);
    const [showArchived, setShowArchived] = useState(false);
    const [editing, setEditing] = useState<Item | "new" | null>(null);

    const filtered = useMemo(() => (items ?? []).filter(i => {
        if (i.archived !== showArchived) return false;
        if (category && i.category !== category) return false;
        if (owner === "GROUP" ? i.unitId : owner && i.unitId !== owner) return false;
        if (place === "NONE" ? i.locationId : place && i.locationId !== place && i.location?.parent?.id !== place) return false;
        if (lowOnly && !isLow(i)) return false;
        const q = search.trim().toLowerCase();
        return !q || i.name.toLowerCase().includes(q) || (i.description ?? "").toLowerCase().includes(q);
    }), [items, category, owner, place, search, lowOnly, showArchived]);

    const low = (items ?? []).filter(i => !i.archived && isLow(i)).length;
    const expiring = (items ?? []).filter(i => !i.archived && (daysUntil(i.expiresAt) ?? 99) <= 14).length;

    async function adjust(i: Item, delta: number) {
        const reason = prompt(`${delta > 0 ? "Add" : "Remove"} ${Math.abs(delta)} ${i.unitOfMeasure} of "${i.name}".\n\nReason (optional, e.g. "Bought", "Broken at camp"):`, "");
        if (reason === null) return;
        const r = await api(`/api/admin/stock/items/${i.id}/adjust`, "POST", { delta, reason });
        if (!r.ok) alert(r.data.error || "Could not update the count");
        onChanged();
    }

    if (items === null) return <p className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</p>;

    return (
        <div className="space-y-4">
            {(low > 0 || expiring > 0) && (
                <div className="flex flex-wrap gap-2">
                    {low > 0 && (
                        <button onClick={() => setLowOnly(true)} className="text-xs font-semibold px-3 py-1.5 rounded-full bg-amber-100 text-amber-900 flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5" /> {low} running low
                        </button>
                    )}
                    {expiring > 0 && (
                        <button onClick={() => setCategory("FOOD")} className="text-xs font-semibold px-3 py-1.5 rounded-full bg-red-100 text-red-900 flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5" /> {expiring} food item{expiring !== 1 ? "s" : ""} expiring within two weeks
                        </button>
                    )}
                </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[180px] max-w-xs">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…" className="h-9 pl-8" />
                </div>
                <select value={category} onChange={e => setCategory(e.target.value)} className={SELECT} aria-label="Category">
                    <option value="">Every category</option>
                    {STOCK_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
                <select value={owner} onChange={e => setOwner(e.target.value)} className={SELECT} aria-label="Owner">
                    <option value="">Every owner</option>
                    <option value="GROUP">The group</option>
                    {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
                <select value={place} onChange={e => setPlace(e.target.value)} className={SELECT} aria-label="Place">
                    <option value="">Everywhere</option>
                    <option value="NONE">Not placed</option>
                    {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
                <label className="text-xs flex items-center gap-1.5 cursor-pointer"><input type="checkbox" className="accent-primary" checked={lowOnly} onChange={e => setLowOnly(e.target.checked)} /> Low only</label>
                <label className="text-xs flex items-center gap-1.5 cursor-pointer"><input type="checkbox" className="accent-primary" checked={showArchived} onChange={e => setShowArchived(e.target.checked)} /> Archived</label>
                <Button onClick={() => setEditing("new")} className="gap-1.5 ml-auto"><Plus className="w-4 h-4" /> Add item</Button>
            </div>

            {filtered.length === 0 ? (
                <p className="rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground">
                    {items.length === 0 ? "Nothing in stock yet. Add the first item." : "Nothing matches."}
                </p>
            ) : (
                <div className="rounded-2xl border bg-card overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/40 text-xs text-muted-foreground">
                            <tr>
                                <th className="text-left p-3 font-medium">Item</th>
                                <th className="text-right p-3 font-medium">Quantity</th>
                                <th className="text-left p-3 font-medium">Condition</th>
                                <th className="text-left p-3 font-medium">Owner</th>
                                <th className="text-left p-3 font-medium">Where</th>
                                <th className="p-3" />
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {filtered.map(i => {
                                const exp = daysUntil(i.expiresAt);
                                return (
                                    <tr key={i.id} className="hover:bg-muted/20">
                                        <td className="p-3">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-semibold">{i.name}</span>
                                                <CategoryChip value={i.category} />
                                                {i.requestable && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary flex items-center gap-1"><Tag className="w-3 h-3" /> Requestable</span>}
                                            </div>
                                            {(i.description || exp != null) && (
                                                <p className="text-xs text-muted-foreground mt-0.5">
                                                    {i.description}
                                                    {exp != null && <span className={exp <= 14 ? "text-red-700 font-semibold" : ""}>{i.description ? " · " : ""}{exp < 0 ? "expired" : `expires in ${exp} day${exp !== 1 ? "s" : ""}`}</span>}
                                                </p>
                                            )}
                                        </td>
                                        <td className="p-3 text-right whitespace-nowrap">
                                            <div className="inline-flex items-center gap-1">
                                                {i.canEdit && <button onClick={() => adjust(i, -1)} disabled={i.quantity === 0} className="w-6 h-6 rounded border hover:bg-muted disabled:opacity-30 flex items-center justify-center" aria-label="Remove one"><Minus className="w-3 h-3" /></button>}
                                                <span className={`min-w-[3.5rem] font-bold ${isLow(i) ? "text-amber-700" : ""}`}>{i.quantity} <span className="font-normal text-xs text-muted-foreground">{i.unitOfMeasure}</span></span>
                                                {i.canEdit && <button onClick={() => adjust(i, 1)} className="w-6 h-6 rounded border hover:bg-muted flex items-center justify-center" aria-label="Add one"><Plus className="w-3 h-3" /></button>}
                                            </div>
                                            {i._count.requests > 0 && <p className="text-[11px] text-muted-foreground">{i._count.requests} open request{i._count.requests !== 1 ? "s" : ""}</p>}
                                        </td>
                                        <td className="p-3"><ConditionText value={i.condition} /></td>
                                        <td className="p-3 text-xs">{ownerOf(i)}</td>
                                        <td className="p-3 text-xs text-muted-foreground">{placeOf(i) ?? <em>not placed</em>}</td>
                                        <td className="p-3 text-right">
                                            <Button variant="ghost" size="sm" onClick={() => setEditing(i)} title={i.canEdit ? "Edit" : "Details"}>
                                                {i.canEdit ? <Pencil className="w-4 h-4" /> : <History className="w-4 h-4" />}
                                            </Button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {editing && (
                <ItemPanel
                    item={editing === "new" ? null : editing}
                    units={units} subgroups={subgroups} rooms={rooms} storekeeper={storekeeper}
                    onClose={() => setEditing(null)}
                    onSaved={() => { setEditing(null); onChanged(); }}
                />
            )}
        </div>
    );
}

type Movement = { id: string; delta: number; quantityAfter: number; reason: string | null; byName: string | null; createdAt: string };

function ItemPanel({ item, units, subgroups, rooms, storekeeper, onClose, onSaved }: {
    item: Item | null; units: Unit[]; subgroups: Subgroup[]; rooms: Room[]; storekeeper: boolean;
    onClose: () => void; onSaved: () => void;
}) {
    const readOnly = !!item && !item.canEdit;
    const [f, setF] = useState({
        name: item?.name ?? "", category: item?.category ?? "CAMPING", description: item?.description ?? "",
        quantity: item ? String(item.quantity) : "0", unitOfMeasure: item?.unitOfMeasure ?? "pcs",
        minQuantity: item?.minQuantity != null ? String(item.minQuantity) : "", condition: item?.condition ?? "GOOD",
        expiresAt: item?.expiresAt?.slice(0, 10) ?? "", unitId: item?.unitId ?? "", subgroupId: item?.subgroupId ?? "",
        locationId: item?.locationId ?? "", notes: item?.notes ?? "",
        requestable: item?.requestable ?? false, variants: (item?.variants ?? []).join(", "), price: item?.price ?? "",
    });
    const [count, setCount] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [moves, setMoves] = useState<Movement[]>([]);
    const set = (k: keyof typeof f, v: string | boolean) => setF(p => ({ ...p, [k]: v }));

    useEffect(() => {
        if (item) api<Movement[]>(`/api/admin/stock/items/${item.id}/movements`).then(r => { if (r.ok) setMoves(r.data as Movement[]); });
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => { document.body.style.overflow = prev; };
    }, [item]);

    const unitSubgroups = subgroups.filter(s => s.unitId === f.unitId);

    async function save(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true); setError("");
        const body: Record<string, unknown> = {
            name: f.name, category: f.category, description: f.description, unitOfMeasure: f.unitOfMeasure,
            minQuantity: f.minQuantity, condition: f.condition, expiresAt: f.category === "FOOD" ? f.expiresAt : "",
            unitId: f.unitId, subgroupId: f.subgroupId, locationId: f.locationId, notes: f.notes,
        };
        if (!item) body.quantity = f.quantity;
        if (storekeeper) Object.assign(body, { requestable: f.requestable, variants: f.variants.split(","), price: f.price });
        const r = await api(item ? `/api/admin/stock/items/${item.id}` : "/api/admin/stock/items", item ? "PATCH" : "POST", body);
        if (r.ok && item && count !== "" && Number(count) !== item.quantity) {
            const c = await api(`/api/admin/stock/items/${item.id}/adjust`, "POST", { count: Number(count), reason: "Recount" });
            if (!c.ok) { setSaving(false); setError(c.data.error || "Could not save the count"); return; }
        }
        setSaving(false);
        if (!r.ok) { setError(r.data.error || "Could not save"); return; }
        onSaved();
    }

    async function archive() {
        if (!item) return;
        const r = await api(`/api/admin/stock/items/${item.id}`, "PATCH", { archived: !item.archived });
        if (!r.ok) { alert(r.data.error || "Could not archive"); return; }
        onSaved();
    }

    async function remove() {
        if (!item || !confirm(`Delete "${item.name}" for good?`)) return;
        const r = await api(`/api/admin/stock/items/${item.id}`, "DELETE");
        if (!r.ok) { alert(r.data.error || "Could not delete"); return; }
        onSaved();
    }

    return (
        <div className="fixed inset-0 z-[60] flex justify-end" role="dialog" aria-modal="true">
            <div className="absolute inset-0 bg-black/40" aria-hidden />
            <form onSubmit={save} className="relative h-full w-full max-w-xl bg-background shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
                <div className="flex items-center justify-between gap-3 px-6 py-4 border-b">
                    <h2 className="text-xl font-semibold truncate">{item ? item.name : "New item"}</h2>
                    <button type="button" onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground" aria-label="Close"><X className="w-5 h-5" /></button>
                </div>
                <fieldset disabled={readOnly} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                    <div className="grid sm:grid-cols-[1fr_11rem] gap-3">
                        <Field label="Name *"><Input value={f.name} onChange={e => set("name", e.target.value)} required placeholder="e.g. Tent 4-person, Big pot, Scarf" /></Field>
                        <Field label="Category">
                            <select value={f.category} onChange={e => set("category", e.target.value)} className={`${SELECT} w-full`}>
                                {STOCK_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                            </select>
                        </Field>
                    </div>
                    <Field label="Description"><Input value={f.description} onChange={e => set("description", e.target.value)} placeholder="Brand, size, what it includes…" /></Field>

                    <div className="grid grid-cols-3 gap-3">
                        {item ? (
                            <Field label={`Count (now ${item.quantity})`}><Input type="number" min={0} value={count} onChange={e => setCount(e.target.value)} placeholder={String(item.quantity)} /></Field>
                        ) : (
                            <Field label="Quantity"><Input type="number" min={0} value={f.quantity} onChange={e => set("quantity", e.target.value)} /></Field>
                        )}
                        <Field label="Unit">
                            <select value={f.unitOfMeasure} onChange={e => set("unitOfMeasure", e.target.value)} className={`${SELECT} w-full`}>
                                {MEASURES.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                        </Field>
                        <Field label="Low below"><Input type="number" min={0} value={f.minQuantity} onChange={e => set("minQuantity", e.target.value)} placeholder="—" /></Field>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Condition">
                            <select value={f.condition} onChange={e => set("condition", e.target.value)} className={`${SELECT} w-full`}>
                                {CONDITIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                            </select>
                        </Field>
                        {f.category === "FOOD" && <Field label="Expires on"><Input type="date" value={f.expiresAt} onChange={e => set("expiresAt", e.target.value)} /></Field>}
                    </div>

                    <div className="rounded-xl border p-3 space-y-3">
                        <p className="text-sm font-semibold">Belongs to</p>
                        <div className="grid grid-cols-2 gap-3">
                            <select value={f.unitId} onChange={e => { set("unitId", e.target.value); set("subgroupId", ""); }} className={`${SELECT} w-full`} aria-label="Owner unit">
                                {storekeeper && <option value="">The group</option>}
                                {!storekeeper && !f.unitId && <option value="">Choose your unit…</option>}
                                {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                            </select>
                            <select value={f.subgroupId} onChange={e => set("subgroupId", e.target.value)} disabled={!f.unitId || unitSubgroups.length === 0} className={`${SELECT} w-full disabled:opacity-50`} aria-label="Owner group">
                                <option value="">The whole unit</option>
                                {unitSubgroups.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                        <p className="text-sm font-semibold pt-1">Kept in</p>
                        <select value={f.locationId} onChange={e => set("locationId", e.target.value)} className={`${SELECT} w-full`} aria-label="Storage place">
                            <option value="">Not placed</option>
                            {rooms.map(r => (
                                <optgroup key={r.id} label={r.name}>
                                    <option value={r.id}>{r.name} (anywhere)</option>
                                    {r.children.map(c => <option key={c.id} value={c.id}>{r.name} › {c.name}</option>)}
                                </optgroup>
                            ))}
                        </select>
                    </div>

                    {storekeeper && (
                        <div className="rounded-xl border p-3 space-y-3">
                            <label className="flex items-start gap-2.5 cursor-pointer">
                                <input type="checkbox" checked={f.requestable} onChange={e => set("requestable", e.target.checked)} className="accent-primary mt-0.5" />
                                <span>
                                    <span className="text-sm font-semibold">Leaders can request it for a scout</span>
                                    <span className="block text-xs text-muted-foreground">Uniform, scarf, badges… usually bought from the QG on demand.</span>
                                </span>
                            </label>
                            {f.requestable && (
                                <div className="grid sm:grid-cols-[1fr_8rem] gap-3">
                                    <Field label="Sizes / options, comma separated"><Input value={f.variants} onChange={e => set("variants", e.target.value)} placeholder="S, M, L, XL" /></Field>
                                    <Field label="Price"><Input value={f.price} onChange={e => set("price", e.target.value)} placeholder="$12" /></Field>
                                </div>
                            )}
                        </div>
                    )}

                    <Field label="Notes"><textarea value={f.notes} onChange={e => set("notes", e.target.value)} rows={2} className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm" /></Field>

                    {moves.length > 0 && (
                        <div className="space-y-1.5">
                            <p className="text-sm font-semibold flex items-center gap-1.5"><History className="w-4 h-4" /> Count history</p>
                            <ul className="rounded-xl border divide-y text-xs">
                                {moves.map(m => (
                                    <li key={m.id} className="px-3 py-2 flex items-center gap-3">
                                        <span className={`w-10 font-bold ${m.delta > 0 ? "text-emerald-700" : "text-red-700"}`}>{m.delta > 0 ? `+${m.delta}` : m.delta}</span>
                                        <span className="flex-1 truncate">{m.reason ?? "—"} <span className="text-muted-foreground">→ {m.quantityAfter}</span></span>
                                        <span className="text-muted-foreground">{m.byName} · {new Date(m.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </fieldset>
                <div className="border-t px-6 py-3 space-y-2 bg-card">
                    {error && <p className="text-sm text-destructive">{error}</p>}
                    {readOnly ? (
                        <p className="text-xs text-muted-foreground">This item belongs to another owner: you can see it, not change it.</p>
                    ) : (
                        <div className="flex flex-wrap gap-2">
                            <Button type="submit" disabled={saving} className="gap-1.5">{saving && <Loader2 className="w-4 h-4 animate-spin" />} {item ? "Save" : "Add item"}</Button>
                            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                            {item && (
                                <>
                                    <Button type="button" variant="ghost" className="gap-1.5 ml-auto" onClick={archive}><Archive className="w-4 h-4" /> {item.archived ? "Restore" : "Archive"}</Button>
                                    <Button type="button" variant="ghost" className="text-destructive" onClick={remove}>Delete</Button>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </form>
        </div>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return <label className="block space-y-1.5 min-w-0"><span className="text-xs font-medium">{label}</span>{children}</label>;
}
