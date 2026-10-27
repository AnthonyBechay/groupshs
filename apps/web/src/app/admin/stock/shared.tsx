"use client";

import { categoryLabel, conditionLabel, requestStatusLabel } from "@/lib/stock";

export type Unit = { id: string; name: string; unitType: string };
export type Subgroup = { id: string; name: string; unitId: string };
export type Room = { id: string; name: string; notes: string | null; _count: { items: number }; children: { id: string; name: string; notes: string | null; _count: { items: number } }[] };

export type Item = {
    id: string; name: string; category: string; description: string | null;
    quantity: number; unitOfMeasure: string; minQuantity: number | null; condition: string; expiresAt: string | null;
    unitId: string | null; subgroupId: string | null; locationId: string | null;
    unit: Unit | null; subgroup: { id: string; name: string } | null;
    location: { id: string; name: string; parent: { id: string; name: string } | null } | null;
    requestable: boolean; variants: string[]; price: string | null;
    photoUrl: string | null; notes: string | null; archived: boolean;
    canEdit: boolean; _count: { requests: number };
};

export type Request = {
    id: string; status: string; variant: string | null; quantity: number; note: string | null; statusNote: string | null;
    fromStock: boolean; requestedByName: string | null; handledByName: string | null; createdAt: string; updatedAt: string;
    item: { id: string; name: string; category: string; quantity: number; variants: string[]; price: string | null; unitOfMeasure: string };
    unit: Unit; member: { id: string; firstName: string; lastName: string } | null;
    canProcess: boolean; canCancel: boolean;
};

export const placeOf = (i: Pick<Item, "location">) =>
    i.location ? (i.location.parent ? `${i.location.parent.name} › ${i.location.name}` : i.location.name) : null;

export const ownerOf = (i: Pick<Item, "unit" | "subgroup">) =>
    i.unit ? (i.subgroup ? `${i.unit.name} · ${i.subgroup.name}` : i.unit.name) : "Group";

export const isLow = (i: Pick<Item, "quantity" | "minQuantity">) => i.minQuantity != null && i.quantity <= i.minQuantity;

export function daysUntil(iso: string | null): number | null {
    if (!iso) return null;
    return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
}

const STATUS_CLS: Record<string, string> = {
    REQUESTED: "bg-sky-100 text-sky-800",
    APPROVED: "bg-indigo-100 text-indigo-800",
    ORDERED: "bg-amber-100 text-amber-800",
    READY: "bg-emerald-100 text-emerald-800",
    DELIVERED: "bg-muted text-muted-foreground",
    REJECTED: "bg-red-100 text-red-800",
    CANCELLED: "bg-muted text-muted-foreground",
};

export function StatusPill({ status }: { status: string }) {
    return <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${STATUS_CLS[status] ?? "bg-muted"}`}>{requestStatusLabel(status)}</span>;
}

const CONDITION_CLS: Record<string, string> = {
    NEW: "text-emerald-700", GOOD: "text-emerald-700", WORN: "text-amber-700", TO_REPAIR: "text-amber-700", DAMAGED: "text-red-700", LOST: "text-red-700",
};
export function ConditionText({ value }: { value: string }) {
    return <span className={`text-xs font-medium ${CONDITION_CLS[value] ?? ""}`}>{conditionLabel(value)}</span>;
}
export function CategoryChip({ value }: { value: string }) {
    return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground uppercase tracking-wide">{categoryLabel(value)}</span>;
}

export async function api<T = unknown>(url: string, method = "GET", body?: unknown): Promise<{ ok: boolean; data: T & { error?: string } }> {
    const res = await fetch(url, { method, headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, data };
}

export const SELECT = "h-9 rounded-md border border-input bg-background px-2 text-sm";
