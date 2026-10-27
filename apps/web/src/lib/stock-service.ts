import { prisma } from "@/db";
import { randomBytes } from "crypto";
import type { Prisma } from "@/generated/prisma/client";
import type { SessionUser } from "@/lib/auth";
import { CONDITIONS, CURRENCIES, MEASURES, REQUEST_NEXT, SHOPPER_NEXT, STOCK_CATEGORIES, parseVariants, type RequestStatus } from "@/lib/stock";
import { UNIT_TYPES } from "@/lib/scout-config";
import { canRequestFor, isStorekeeper, seesAllRequests } from "@/lib/stock-access";

type Tx = Prisma.TransactionClient;

export const itemInclude = {
    unit: { select: { id: true, name: true, unitType: true } },
    subgroup: { select: { id: true, name: true } },
    location: { select: { id: true, name: true, parent: { select: { id: true, name: true } } } },
} as const;

/** Inventory a user may see: everything for the group's storekeeper; their units' and the group's own otherwise. */
export function viewableItemsWhere(s: SessionUser): Prisma.StockItemWhereInput {
    if (isStorekeeper(s)) return {};
    return { OR: [{ unitId: { in: s.allowedUnitIds } }, { unitId: null }] };
}

/** Requests a user may see: every unit's (see seesAllRequests), their own units' otherwise. */
export function viewableRequestsWhere(s: SessionUser): Prisma.ItemRequestWhereInput {
    if (seesAllRequests(s)) return {};
    return { unitId: { in: s.allowedUnitIds } };
}

/** The status steps this user may take on one request. */
export function stepsFor(s: SessionUser, r: { unitId: string; status: string }): RequestStatus[] {
    if (canRequestFor(s, r.unitId)) return REQUEST_NEXT[r.status] ?? [];
    if (seesAllRequests(s)) return SHOPPER_NEXT[r.status] ?? [];
    return [];
}

/**
 * Change a quantity and log it, in one transaction. Refuses to go below zero:
 * a negative count always means a mistake somewhere.
 */
export async function moveStock(
    tx: Tx, itemId: string, delta: number,
    meta: { reason?: string | null; requestId?: string | null; by: SessionUser }
) {
    const item = await tx.stockItem.findUniqueOrThrow({ where: { id: itemId }, select: { quantity: true } });
    const next = item.quantity + delta;
    if (next < 0) throw new StockError(`Only ${item.quantity} in stock`);
    await tx.stockItem.update({ where: { id: itemId }, data: { quantity: next } });
    await tx.stockMovement.create({
        data: {
            itemId, delta, quantityAfter: next, reason: meta.reason ?? null, requestId: meta.requestId ?? null,
            byId: meta.by.userId, byName: meta.by.name,
        },
    });
    return next;
}

export class StockError extends Error {}

const str = (v: unknown, max = 300) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
const int = (v: unknown) => {
    if (v === "" || v == null) return null;
    const n = Number(v);
    return Number.isInteger(n) && n >= 0 && n <= 1_000_000 ? n : undefined;
};

/**
 * Validate an item form. Returns the data to write, or an error. Ownership is
 * checked against the database: a sub-group must belong to the chosen unit.
 */
export async function parseItemBody(body: Record<string, unknown>, s: SessionUser, isNew: boolean) {
    const data: Record<string, unknown> = {};
    if (isNew || "name" in body) {
        const name = str(body.name, 200);
        if (!name) return { error: "Give the item a name" };
        data.name = name;
    }
    if (isNew || "category" in body) {
        if (!STOCK_CATEGORIES.some(c => c.value === body.category)) return { error: "Pick a category" };
        data.category = body.category;
    }
    if ("description" in body) data.description = str(body.description, 2000);
    if ("notes" in body) data.notes = str(body.notes, 2000);
    if ("photoUrl" in body) data.photoUrl = str(body.photoUrl, 1000);
    if ("unitOfMeasure" in body) data.unitOfMeasure = (MEASURES as readonly string[]).includes(body.unitOfMeasure as string) ? body.unitOfMeasure : "pcs";
    if ("condition" in body) {
        if (!CONDITIONS.some(c => c.value === body.condition)) return { error: "Pick a condition" };
        data.condition = body.condition;
    }
    if ("minQuantity" in body) {
        const n = int(body.minQuantity);
        if (n === undefined) return { error: "The low-stock level must be a whole number" };
        data.minQuantity = n;
    }
    if (isNew && "quantity" in body) {
        const n = int(body.quantity);
        if (n === undefined) return { error: "The quantity must be a whole number" };
        data.quantity = n ?? 0;
    }
    if ("expiresAt" in body) data.expiresAt = typeof body.expiresAt === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.expiresAt) ? new Date(`${body.expiresAt}T00:00:00Z`) : null;
    if ("archived" in body) data.archived = body.archived === true;

    if (isNew || "unitId" in body || "subgroupId" in body) {
        const unitId = str(body.unitId, 64);
        const subgroupId = unitId ? str(body.subgroupId, 64) : null;
        if (unitId && !(await prisma.unit.findUnique({ where: { id: unitId }, select: { id: true } }))) return { error: "That unit no longer exists" };
        if (subgroupId && unitId && !(await prisma.subgroup.findFirst({ where: { id: subgroupId, unitId }, select: { id: true } }))) {
            return { error: "That group does not belong to the chosen unit" };
        }
        data.unitId = unitId;
        data.subgroupId = subgroupId;
    }
    if ("locationId" in body) {
        const locationId = str(body.locationId, 64);
        if (locationId && !(await prisma.storageLocation.findUnique({ where: { id: locationId }, select: { id: true } }))) return { error: "That storage place no longer exists" };
        data.locationId = locationId;
    }

    // The catalog of things leaders can request is the storekeeper's to shape.
    const CATALOG_KEYS = ["requestable", "variants", "costPrice", "sellPrice", "currency", "forUnitTypes"];
    if (CATALOG_KEYS.some(k => k in body)) {
        if (!isStorekeeper(s)) return { error: "Only the storekeeper can change what leaders may request" };
        if ("requestable" in body) data.requestable = body.requestable === true;
        if ("variants" in body) data.variants = parseVariants(body.variants);
        for (const k of ["costPrice", "sellPrice"] as const) {
            if (!(k in body)) continue;
            const v = body[k];
            if (v === "" || v == null) { data[k] = null; continue; }
            const n = Number(String(v).replace(/[,\s$]/g, ""));
            if (!Number.isFinite(n) || n < 0 || n > 1e9) return { error: "Prices are amounts, like 12 or 12.50" };
            data[k] = Math.round(n * 100) / 100;
        }
        if ("currency" in body) data.currency = CURRENCIES.some(c => c.value === body.currency) ? body.currency : "USD";
        if ("forUnitTypes" in body) {
            data.forUnitTypes = Array.isArray(body.forUnitTypes)
                ? [...new Set(body.forUnitTypes.filter((t: unknown): t is string => typeof t === "string" && (UNIT_TYPES as readonly string[]).includes(t)))]
                : [];
        }
    }
    return { data };
}

/** Short reference shared by the lines of one order, quoted to families. */
export const newOrderRef = () => randomBytes(4).toString("hex").toUpperCase();
