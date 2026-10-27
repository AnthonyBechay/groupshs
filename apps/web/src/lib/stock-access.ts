/**
 * Who may do what with the stock (roles explained in stock.ts). Server only:
 * it reads the session's permissions.
 */

import type { SessionUser } from "@/lib/auth";
import { canAccessUnit, hasPermission } from "@/lib/auth";

const unrestricted = (s: SessionUser) => s.isSuperAdmin || s.allowedUnitIds.length === 0;

export function isStorekeeper(s: SessionUser | null): boolean {
    return !!s && hasPermission(s, "canManageStock") && unrestricted(s);
}

const leadsStock = (s: SessionUser) => hasPermission(s, "canManageStock") || hasPermission(s, "canManageMembers");

/** May see the stock screens at all. */
export function canUseStock(s: SessionUser | null): boolean {
    return !!s && (leadsStock(s) || hasPermission(s, "canSeeAllRequests"));
}

/**
 * Sees every unit's requests: the storekeeper, an account with access to every
 * unit (as everywhere else in the admin), or one given canSeeAllRequests. Other
 * leaders see only the units in their allowedUnitIds.
 */
export function seesAllRequests(s: SessionUser | null): boolean {
    return !!s && (isStorekeeper(s) || (leadsStock(s) && unrestricted(s)) || hasPermission(s, "canSeeAllRequests"));
}

/** May see the inventory (not just the catalog for requests). */
export function canSeeInventory(s: SessionUser | null): boolean {
    return !!s && hasPermission(s, "canManageStock");
}

/** May create, edit or count this item: the storekeeper, or whoever looks after its unit. */
export function canEditItem(s: SessionUser | null, item: { unitId: string | null }): boolean {
    if (!s || !hasPermission(s, "canManageStock")) return false;
    if (unrestricted(s)) return true;
    return !!item.unitId && canAccessUnit(s, item.unitId);
}

/** Answers for this unit's requests: may request, approve, adjust, mark paid, hand over. */
export function canRequestFor(s: SessionUser | null, unitId: string): boolean {
    return !!s && leadsStock(s) && canAccessUnit(s, unitId);
}
