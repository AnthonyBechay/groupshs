import type { Prisma } from "@/generated/prisma/client";
import { fieldLabel } from "@/lib/member-update";

type Tx = Prisma.TransactionClient;

export type Actor = {
    source: "ADMIN" | "FAMILY";
    id?: string | null;
    name?: string | null;
    requestId?: string | null;
};

/** One value as it is shown in the history: dates as days, empties as null. */
export function historyValue(v: unknown): string | null {
    if (v == null || v === "") return null;
    if (v instanceof Date) return v.toISOString().slice(0, 10);
    if (Array.isArray(v)) return v.length ? v.join(", ") : null;
    return String(v);
}

/**
 * Record every field whose value differs between `before` and `after`.
 * `after` holds only what is being written, so untouched fields are skipped.
 */
export async function recordChanges(
    tx: Tx,
    memberId: string,
    before: Record<string, unknown>,
    after: Record<string, unknown>,
    actor: Actor,
    skip: readonly string[] = []
) {
    const rows = Object.keys(after)
        .filter(k => !skip.includes(k))
        .map(k => ({ field: k, oldValue: historyValue(before[k]), newValue: historyValue(after[k]) }))
        .filter(r => r.oldValue !== r.newValue);
    if (!rows.length) return 0;
    await tx.memberChange.createMany({
        data: rows.map(r => ({
            memberId, ...r,
            source: actor.source, changedById: actor.id ?? null, changedByName: actor.name ?? null, requestId: actor.requestId ?? null,
        })),
    });
    return rows.length;
}

/** A list entry added or removed ("Ventolin · 2 puffs"), as one history row. */
export async function recordListChange(
    tx: Tx, memberId: string, field: "medications" | "siblings",
    change: { removed?: string | null; added?: string | null }, actor: Actor
) {
    await tx.memberChange.create({
        data: {
            memberId, field, oldValue: change.removed ?? null, newValue: change.added ?? null,
            source: actor.source, changedById: actor.id ?? null, changedByName: actor.name ?? null, requestId: actor.requestId ?? null,
        },
    });
}

const ADMIN_LABELS: Record<string, string> = {
    firstName: "First name", lastName: "Last name", gender: "Gender", joinedAt: "Joined on",
    extraRoles: "Extra roles", servesUnitId: "Unit led", numberOfBrothers: "Brothers", numberOfSisters: "Sisters",
    consentSignedAt: "Medical authorization", photoUrl: "Photo", fatherOldScout: "Father was a scout",
    motherOldScout: "Mother was a scout", medications: "Treatment", siblings: "Siblings in the group",
    status: "Status",
};

export const historyFieldLabel = (field: string) => ADMIN_LABELS[field] ?? fieldLabel(field);
