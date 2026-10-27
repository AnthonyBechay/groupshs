"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Pencil, Plus, Trash2, Warehouse } from "lucide-react";
import { api, type Room } from "../shared";

/** Where the group keeps things: rooms, and the shelves inside them. */
export function StorageSettings() {
    const [rooms, setRooms] = useState<Room[] | null>(null);
    const [newRoom, setNewRoom] = useState("");

    const load = useCallback(async () => {
        const r = await api<Room[]>("/api/admin/stock/locations");
        setRooms(r.ok ? (r.data as Room[]) : []);
    }, []);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { load(); }, [load]);

    async function create(name: string, parentId?: string) {
        if (!name.trim()) return;
        const r = await api("/api/admin/stock/locations", "POST", { name, parentId });
        if (!r.ok) alert(r.data.error || "Could not add it");
        load();
    }
    async function rename(id: string, current: string) {
        const name = prompt("New name:", current);
        if (!name || name === current) return;
        await api(`/api/admin/stock/locations/${id}`, "PATCH", { name });
        load();
    }
    async function remove(id: string, label: string, items: number) {
        if (!confirm(`Delete ${label}?${items ? `\n\nThe ${items} item${items !== 1 ? "s" : ""} kept there stay in the inventory, marked "not placed".` : ""}`)) return;
        await api(`/api/admin/stock/locations/${id}`, "DELETE");
        load();
    }

    return (
        <div className="max-w-3xl mx-auto space-y-5">
            <Link href="/admin/stock" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary">
                <ArrowLeft className="w-4 h-4" /> Stock
            </Link>
            <div>
                <h1 className="text-3xl font-bold flex items-center gap-2"><Warehouse className="w-7 h-7 text-primary" /> Storage</h1>
                <p className="text-sm text-muted-foreground mt-1">The rooms where the group keeps things, and the shelves in each. Every item can then be placed on one.</p>
            </div>

            <form onSubmit={e => { e.preventDefault(); create(newRoom); setNewRoom(""); }} className="flex gap-2">
                <Input value={newRoom} onChange={e => setNewRoom(e.target.value)} placeholder="New room, e.g. Local scout — big room" />
                <Button type="submit" className="gap-1.5 shrink-0"><Plus className="w-4 h-4" /> Add room</Button>
            </form>

            {rooms === null ? <p className="text-sm text-muted-foreground">Loading…</p> : rooms.length === 0 ? (
                <p className="rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground">No storage room yet.</p>
            ) : rooms.map(room => (
                <section key={room.id} className="rounded-2xl border bg-card overflow-hidden">
                    <div className="px-4 py-3 border-b bg-muted/30 flex items-center gap-2">
                        <h2 className="font-bold flex-1">{room.name} <span className="font-normal text-xs text-muted-foreground">· {room._count.items + room.children.reduce((n, c) => n + c._count.items, 0)} items</span></h2>
                        <Button size="sm" variant="ghost" onClick={() => rename(room.id, room.name)} aria-label="Rename"><Pencil className="w-4 h-4" /></Button>
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => remove(room.id, `"${room.name}" and its shelves`, room._count.items + room.children.reduce((n, c) => n + c._count.items, 0))} aria-label="Delete"><Trash2 className="w-4 h-4" /></Button>
                    </div>
                    <div className="divide-y">
                        {room.children.map(shelf => (
                            <div key={shelf.id} className="px-4 py-2 flex items-center gap-2">
                                <span className="flex-1 text-sm">{shelf.name} <span className="text-xs text-muted-foreground">· {shelf._count.items} items</span></span>
                                <Button size="sm" variant="ghost" onClick={() => rename(shelf.id, shelf.name)} aria-label="Rename"><Pencil className="w-3.5 h-3.5" /></Button>
                                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => remove(shelf.id, `"${shelf.name}"`, shelf._count.items)} aria-label="Delete"><Trash2 className="w-3.5 h-3.5" /></Button>
                            </div>
                        ))}
                        <ShelfAdder onAdd={name => create(name, room.id)} />
                    </div>
                </section>
            ))}
        </div>
    );
}

function ShelfAdder({ onAdd }: { onAdd: (name: string) => void }) {
    const [name, setName] = useState("");
    return (
        <form onSubmit={e => { e.preventDefault(); onAdd(name); setName(""); }} className="px-4 py-2 flex gap-2">
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Add a shelf, e.g. Shelf A3, Cupboard 2" className="h-8 text-sm" />
            <Button type="submit" size="sm" variant="outline" className="gap-1 shrink-0"><Plus className="w-3.5 h-3.5" /> Shelf</Button>
        </form>
    );
}
