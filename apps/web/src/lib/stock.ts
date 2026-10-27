/**
 * Stock — the shared vocabulary and the request lifecycle. Imported by the
 * browser screens too, so nothing server-only here: the access rules that go
 * with it are in stock-access.ts.
 *
 * Who does what:
 *   storekeeper  canManageStock, unrestricted (or super admin): everything —
 *                every item, the storage rooms, the catalog, and processing
 *                requests (approve, buy at the QG, hand over).
 *   unit stock   canManageStock restricted to units: that unit's own items
 *                (and its sub-groups'); the group's stock is read-only.
 *   leaders      canManageMembers on a unit: request catalog items for that
 *                unit's scouts (approved straight away), approve or reject
 *                what families ordered, confirm hand-over, cancel until bought.
 */

export const STOCK_CATEGORIES = [
    { value: "CAMPING", label: "Camping tools" },
    { value: "COOKING", label: "Cooking" },
    { value: "FOOD", label: "Food" },
    { value: "UNIFORM", label: "Uniform & costume" },
    { value: "BADGE", label: "Badges" },
    { value: "FIRST_AID", label: "First aid" },
    { value: "OTHER", label: "Other" },
] as const;
export const categoryLabel = (v: string) => STOCK_CATEGORIES.find(c => c.value === v)?.label ?? v;
export const isCategory = (v: unknown): v is string => STOCK_CATEGORIES.some(c => c.value === v);

export const CONDITIONS = [
    { value: "NEW", label: "New" },
    { value: "GOOD", label: "Good" },
    { value: "WORN", label: "Worn" },
    { value: "TO_REPAIR", label: "To repair" },
    { value: "DAMAGED", label: "Damaged" },
    { value: "LOST", label: "Lost" },
] as const;
export const conditionLabel = (v: string) => CONDITIONS.find(c => c.value === v)?.label ?? v;
export const isCondition = (v: unknown): v is string => CONDITIONS.some(c => c.value === v);

export const MEASURES = ["pcs", "pairs", "sets", "kg", "g", "L", "packs", "boxes"] as const;

// ─── Requests ───────────────────────────────────────────────────────────────

export const REQUEST_STATUSES = [
    { value: "REQUESTED", label: "Requested" },
    { value: "APPROVED", label: "Approved" },
    { value: "ORDERED", label: "Bought / ordered" },
    { value: "READY", label: "Ready to hand over" },
    { value: "DELIVERED", label: "Delivered" },
    { value: "REJECTED", label: "Rejected" },
    { value: "CANCELLED", label: "Cancelled" },
] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number]["value"];
export const requestStatusLabel = (v: string) => REQUEST_STATUSES.find(s => s.value === v)?.label ?? v;

/** Still waiting for something to happen. */
export const OPEN_REQUEST_STATUSES: RequestStatus[] = ["REQUESTED", "APPROVED", "ORDERED", "READY"];

/**
 * What the storekeeper can move a request to. "Give from stock" is separate
 * (it also takes the quantity out of stock) and allowed while nothing has
 * been bought for it yet.
 */
export const STOREKEEPER_NEXT: Record<string, RequestStatus[]> = {
    REQUESTED: ["APPROVED", "REJECTED"],
    APPROVED: ["ORDERED", "REJECTED"],
    ORDERED: ["READY"],
    READY: ["DELIVERED"],
};
export const CAN_GIVE_FROM_STOCK: string[] = ["REQUESTED", "APPROVED"];
/** A leader can withdraw a request until it has been bought. */
export const CAN_CANCEL: string[] = ["REQUESTED", "APPROVED"];

export function canMoveRequest(from: string, to: string): boolean {
    return (STOREKEEPER_NEXT[from] ?? []).includes(to as RequestStatus);
}

/**
 * What a unit's own maîtrise can do with its unit's requests: decide on what
 * families ordered, and confirm handing it to the scout. Buying at the QG
 * stays with the storekeeper.
 */
export const LEADER_NEXT: Record<string, RequestStatus[]> = {
    REQUESTED: ["APPROVED", "REJECTED"],
    READY: ["DELIVERED"],
};

export function canLeaderMoveRequest(from: string, to: string): boolean {
    return (LEADER_NEXT[from] ?? []).includes(to as RequestStatus);
}

// ─── Catalog ────────────────────────────────────────────────────────────────

export const CURRENCIES = [
    { value: "USD", label: "$", decimals: 2 },
    { value: "LBP", label: "LL", decimals: 0 },
] as const;

/** "$12.50", "450,000 LL". Null when there is no price. */
export function formatMoney(amount: number | string | null | undefined, currency = "USD"): string | null {
    if (amount == null || amount === "") return null;
    const n = Number(amount);
    if (!Number.isFinite(n)) return null;
    const c = CURRENCIES.find(x => x.value === currency) ?? CURRENCIES[0];
    const v = n.toLocaleString("en-US", { minimumFractionDigits: c.decimals ? (Number.isInteger(n) ? 0 : 2) : 0, maximumFractionDigits: c.decimals });
    return c.value === "USD" ? `$${v}` : `${v} ${c.label}`;
}

/** Add up line totals, one sum per currency: "$45 + 900,000 LL". */
export function formatTotals(lines: { amount: number | string | null | undefined; quantity: number; currency?: string | null }[]): string | null {
    const sums = new Map<string, number>();
    for (const l of lines) {
        if (l.amount == null || l.amount === "") continue;
        const c = l.currency || "USD";
        sums.set(c, (sums.get(c) ?? 0) + Number(l.amount) * l.quantity);
    }
    if (!sums.size) return null;
    return [...sums.entries()].map(([c, n]) => formatMoney(n, c)).join(" + ");
}

/** Up to 100 options (badge names, sizes), each up to 80 characters. */
export const MAX_VARIANTS = 100;
export const MAX_VARIANT_LENGTH = 80;

/**
 * Options typed as one text: separated by commas or new lines, spaces trimmed,
 * empties and duplicates dropped, order kept.
 */
export function parseVariants(input: unknown): string[] {
    const parts = Array.isArray(input) ? input : typeof input === "string" ? input.split(/[,\n]/) : [];
    const out: string[] = [];
    for (const p of parts) {
        const v = typeof p === "string" ? p.trim().replace(/\s+/g, " ").slice(0, MAX_VARIANT_LENGTH) : "";
        if (v && !out.includes(v)) out.push(v);
        if (out.length >= MAX_VARIANTS) break;
    }
    return out;
}

/**
 * Is this catalog item offered to that unit? A branch's own shirt only to that
 * branch; an item with no branch listed (scarf, group badge) to everyone.
 */
export function itemFitsUnit(item: { forUnitTypes: string[] }, unitType: string): boolean {
    return item.forUnitTypes.length === 0 || item.forUnitTypes.includes(unitType);
}

/** Request origin. */
export const REQUEST_SOURCES = { LEADER: "Leader", FAMILY: "Family" } as const;
