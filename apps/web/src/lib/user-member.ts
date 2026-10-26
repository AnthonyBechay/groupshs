import { prisma } from "@/db";

/** The linked member, with what the users list needs to say who they are. */
export const linkedMemberSelect = {
    select: {
        id: true, firstName: true, lastName: true, role: true, extraRoles: true, status: true,
        unit: { select: { id: true, name: true, unitType: true } },
        servesUnit: { select: { id: true, name: true, unitType: true } },
    },
} as const;

/**
 * Validate a member link. One member backs at most one account (the column is
 * unique), so linking someone already linked elsewhere is refused with the
 * other account's name rather than a database error.
 */
export async function checkMemberLink(
    memberId: unknown,
    userId: string | null
): Promise<{ memberId: string | null; error?: string }> {
    if (!memberId) return { memberId: null };
    if (typeof memberId !== "string") return { memberId: null, error: "Invalid member" };

    const member = await prisma.member.findUnique({
        where: { id: memberId },
        select: { id: true, status: true, user: { select: { id: true, name: true } } },
    });
    if (!member) return { memberId: null, error: "That member no longer exists" };
    if (member.status !== "ACTIVE") return { memberId: null, error: "That member has left the group" };
    if (member.user && member.user.id !== userId) {
        return { memberId: null, error: `That member is already linked to ${member.user.name}'s account` };
    }
    return { memberId };
}

/**
 * A readable reason for a failed user write. A generic 500 hid the real cause
 * (an email or member already used by another account) from the super admin
 * — the only person who can use these routes, so the detail is safe to show.
 */
export function userWriteError(error: unknown): { status: number; error: string } {
    const e = error as { code?: string; meta?: unknown; message?: string };
    if (e?.code === "P2002") {
        const target = JSON.stringify(e.meta ?? {});
        if (target.includes("email")) return { status: 400, error: "Another account already uses this email" };
        if (target.includes("member")) return { status: 400, error: "That member is already linked to another account" };
        return { status: 400, error: "Another account already uses one of these values" };
    }
    if (e?.code === "P2003") return { status: 400, error: "The linked member no longer exists" };
    if (e?.code === "P2025") return { status: 404, error: "User not found" };
    return { status: 500, error: `Could not save the user: ${e?.message?.split("\n").filter(Boolean).at(-1) ?? "unknown error"}` };
}
