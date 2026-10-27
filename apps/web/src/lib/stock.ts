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
 *                unit's scouts, follow and cancel their requests.
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
