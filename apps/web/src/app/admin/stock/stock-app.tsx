"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Boxes, ClipboardList, Package, ShoppingCart, Warehouse } from "lucide-react";
import { useUrlState } from "@/hooks/use-url-state";
import { compareUnitsByBranch } from "@/lib/scout-config";
import { api, type Item, type Request, type Room, type Subgroup, type Unit } from "./shared";
import { Inventory } from "./inventory";
import { Requests } from "./requests";
import { ShoppingList } from "./shopping";

type Tab = "inventory" | "requests" | "shopping";

export function StockApp({ storekeeper, inventory, canRequest }: { storekeeper: boolean; inventory: boolean; canRequest: boolean }) {
    const { params, setParams } = useUrlState();
    const tabs = ([
        inventory && { key: "inventory", label: "Inventory", icon: Boxes },
        canRequest && { key: "requests", label: "Requests", icon: ClipboardList },
        storekeeper && { key: "shopping", label: "QG shopping list", icon: ShoppingCart },
    ].filter(Boolean)) as { key: Tab; label: string; icon: typeof Boxes }[];
    const tab: Tab = (tabs.find(t => t.key === params.get("tab"))?.key ?? tabs[0]?.key ?? "requests") as Tab;

    const [units, setUnits] = useState<Unit[]>([]);
    const [subgroups, setSubgroups] = useState<Subgroup[]>([]);
    const [rooms, setRooms] = useState<Room[]>([]);
    const [items, setItems] = useState<Item[] | null>(null);
    const [catalog, setCatalog] = useState<Item[]>([]);
    const [requests, setRequests] = useState<Request[] | null>(null);
    const [requestScope, setRequestScope] = useState<"open" | "all">("open");

    useEffect(() => {
        Promise.all([api<Unit[]>("/api/admin/units"), api<Subgroup[]>("/api/admin/subgroups"), api<Room[]>("/api/admin/stock/locations")])
            .then(([u, s, r]) => {
                if (u.ok) setUnits((u.data as Unit[]).filter(x => !["ALL", "ARCHIVE"].includes(x.unitType)).sort(compareUnitsByBranch));
                if (s.ok) setSubgroups(s.data as Subgroup[]);
                if (r.ok) setRooms(r.data as Room[]);
            });
    }, []);

    const loadItems = useCallback(async () => {
        const [inv, cat] = await Promise.all([
            inventory ? api<Item[]>("/api/admin/stock/items") : Promise.resolve({ ok: true, data: [] as Item[] }),
            api<Item[]>("/api/admin/stock/items?catalog=1"),
        ]);
        if (inv.ok) setItems(inv.data as Item[]);
        if (cat.ok) setCatalog(cat.data as Item[]);
    }, [inventory]);

    const loadRequests = useCallback(async () => {
        const r = await api<Request[]>(`/api/admin/stock/requests?status=${requestScope}`);
        setRequests(r.ok ? (r.data as Request[]) : []);
    }, [requestScope]);

    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { loadItems(); }, [loadItems]);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { loadRequests(); }, [loadRequests]);

    const refresh = () => { loadItems(); loadRequests(); };
    const openRequests = (requests ?? []).filter(r => ["REQUESTED", "APPROVED", "ORDERED", "READY"].includes(r.status)).length;

    return (
        <div className="space-y-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2"><Package className="w-7 h-7 text-primary" /> Stock & requests</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        {storekeeper
                            ? "Everything the group keeps, where it is and who owns it — and what scouts need from the QG."
                            : inventory
                                ? "Your unit's gear, the group's stock, and requests for your scouts."
                                : "Request uniforms and badges for the scouts of your unit, and follow them."}
                    </p>
                </div>
                {storekeeper && (
                    <Link href="/admin/stock/storage" className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md border text-sm font-medium hover:bg-muted">
                        <Warehouse className="w-4 h-4" /> Storage rooms & shelves
                    </Link>
                )}
            </div>

            {tabs.length > 1 && (
                <div className="inline-flex items-center rounded-full bg-muted/60 border p-1" role="tablist">
                    {tabs.map(t => (
                        <button
                            key={t.key}
                            role="tab"
                            aria-selected={tab === t.key}
                            onClick={() => setParams({ tab: t.key === tabs[0].key ? null : t.key })}
                            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-semibold transition-all ${tab === t.key ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                        >
                            <t.icon className="w-4 h-4" /> {t.label}
                            {t.key === "requests" && openRequests > 0 && <span className="text-[10px] font-bold px-1.5 rounded-full bg-primary text-white">{openRequests}</span>}
                        </button>
                    ))}
                </div>
            )}

            {tab === "inventory" && inventory && (
                <Inventory items={items} units={units} subgroups={subgroups} rooms={rooms} storekeeper={storekeeper} onChanged={loadItems} />
            )}
            {tab === "requests" && (
                <Requests
                    requests={requests} catalog={catalog} units={units}
                    scope={requestScope} onScope={setRequestScope}
                    storekeeper={storekeeper} onChanged={refresh}
                />
            )}
            {tab === "shopping" && storekeeper && <ShoppingList requests={requests ?? []} onChanged={refresh} />}
        </div>
    );
}
