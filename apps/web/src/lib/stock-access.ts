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

/** May see the stock screens at all. */
export function canUseStock(s: SessionUser | null): boolean {
    return !!s && (hasPermission(s, "canManageStock") || hasPermission(s, "canManageMembers"));
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

/** May request items for this unit's scouts. */
export function canRequestFor(s: SessionUser | null, unitId: string): boolean {
    return canUseStock(s) && canAccessUnit(s, unitId);
}
