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
