import { prisma } from "@/db";
import { getSession, hasPermission, canAccessUnit } from "@/lib/auth";
import {
    LEADERSHIP_ROLES, isLeadershipRole, isLeadershipRoleIn, isCouncilRole,
    touchesCouncilRole, COUNCIL_ROLES,
} from "@/lib/scout-config";
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";

/**
 * Maîtrise (leadership) transfers.
 *
 * Leaders are NOT governed by the age rules — an ACG can become CT of the
 * Troupe, a CM can move to the Clan, and so on, whenever the group decides.
 * This endpoint moves a leader to any unit with any leadership role.
 *
 * GET  → every current leader, with their unit and role
 * POST → apply one or more leadership moves (revertible, like age promotions)
 */

export async function GET() {
    try {
        const session = await getSession();
        if (!hasPermission(session, "canManageTransitions")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const [members, units] = await Promise.all([
            prisma.member.findMany({
                where: { status: "ACTIVE" },
                select: {
                    id: true, firstName: true, lastName: true,
                    role: true, extraRoles: true,
                    photoUrl: true, unitId: true,
                    unit: { select: { id: true, name: true, unitType: true } },
                    servesUnit: { select: { id: true, name: true, unitType: true } },
                },
                orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
            }),
            prisma.unit.findMany({
                select: { id: true, name: true, unitType: true },
                orderBy: { name: "asc" },
            }),
        ]);

        // A leader is anyone holding a maîtrise role, as a primary role or one of
        // their concurrent extras. The primary role is judged in context so a
        // Second de Sizaine (SE) isn't mistaken for the Secrétaire de Groupe.
        const isLeader = (m: (typeof members)[number]) =>
            isLeadershipRoleIn(m.role, m.unit.unitType) ||
            (m.extraRoles ?? []).some(isLeadershipRole);

        const leaders = members.filter(isLeader);
        const others = members.filter(m => !isLeader(m));

        return NextResponse.json({ leaders, others, units, roles: LEADERSHIP_ROLES });
    } catch (error) {
        console.error("Error loading maitrise:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

/**
 * `toUnitId` means different things per tier, which is the whole point of the
 * two-tier model:
 *
 *   UNIT MAÎTRISE (CT, CM, CC…) → the unit they will RUN. Their home unit stays
 *   in the Routiers / Pionnieres, because a Cheftaine Meute is still a Pionniere.
 *
 *   CONSEIL (CG, ACG, EA, TR, SE, AU) → they move to group level outright and
 *   stop being a Routier / Pionniere in parallel, so this is their new HOME unit
 *   and anything they were running is cleared.
 */
type LeaderMove = { memberId: string; toUnitId: string; toRole: string };

export async function POST(request: NextRequest) {
    try {
        const session = await getSession();
        if (!hasPermission(session, "canManageTransitions")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { moves, notes } = body as { moves?: LeaderMove[]; notes?: string };

        if (!Array.isArray(moves) || moves.length === 0) {
            return NextResponse.json({ error: "No leaders selected" }, { status: 400 });
        }

        for (const mv of moves) {
            if (!mv.memberId || !mv.toUnitId || !mv.toRole) {
                return NextResponse.json({ error: "Each move needs a member, a unit and a role" }, { status: 400 });
            }
            if (!LEADERSHIP_ROLES.includes(mv.toRole)) {
                return NextResponse.json({ error: `"${mv.toRole}" is not a leadership role` }, { status: 400 });
            }
            if (!canAccessUnit(session, mv.toUnitId)) {
                return NextResponse.json({ error: "Forbidden: target unit" }, { status: 403 });
            }
        }

        const memberIds = moves.map(m => m.memberId);
        const members = await prisma.member.findMany({
            where: { id: { in: memberIds }, status: "ACTIVE" },
            select: {
                id: true, firstName: true, lastName: true, unitId: true,
                subgroupId: true, role: true, extraRoles: true, progressions: true,
                unit: { select: { unitType: true } },
            },
        });
        if (members.length !== memberIds.length) {
            return NextResponse.json({ error: "One or more members are unavailable" }, { status: 400 });
        }
        for (const m of members) {
            if (!canAccessUnit(session, m.unitId)) {
                return NextResponse.json({ error: "Forbidden: source unit" }, { status: 403 });
            }
        }

        // Appointing or removing the conseil (CG, ACG, EA, TR, SE, AU) is a
        // group-level decision reserved to super admins — otherwise an admin
        // could promote themselves into it, or quietly unseat the Chef de Groupe.
        if (!session?.isSuperAdmin) {
            for (const mv of moves) {
                const before = members.find(m => m.id === mv.memberId)!;
                const targetUnitType =
                    (await prisma.unit.findUnique({
                        where: { id: mv.toUnitId }, select: { unitType: true },
                    }))?.unitType ?? "";

                if (touchesCouncilRole(
                    [before.role, ...(before.extraRoles ?? [])],
                    [mv.toRole],
                    before.unit.unitType,
                    targetUnitType,
                )) {
                    return NextResponse.json(
                        {
                            error: `Only a super admin can appoint or change conseil roles ` +
                                `(${COUNCIL_ROLES.join(", ")}). Ask the Chef de Groupe.`,
                        },
                        { status: 403 }
                    );
                }
            }
        }

        const targetIds = [...new Set(moves.map(m => m.toUnitId))];
        const targetUnits = await prisma.unit.findMany({
            where: { id: { in: targetIds } },
            select: { id: true, name: true },
        });
        if (targetUnits.length !== targetIds.length) {
            return NextResponse.json({ error: "One or more target units no longer exist" }, { status: 400 });
        }

        const batchId = randomUUID();
        const batchLabel = `Maîtrise transfer — ${moves.length} leader${moves.length !== 1 ? "s" : ""}`;
        const when = new Date();

        await prisma.$transaction(async (tx) => {
            for (const mv of moves) {
                const before = members.find(m => m.id === mv.memberId)!;
                const council = isCouncilRole(mv.toRole);

                // Conseil: group level becomes their home, and they stop running
                // a unit. Unit maîtrise: home unit is untouched — they merely
                // take over a unit, which is recorded as the unit they serve.
                const nextHomeUnitId = council ? mv.toUnitId : before.unitId;
                const nextServesUnitId = council ? null : mv.toUnitId;
                const homeChanged = nextHomeUnitId !== before.unitId;

                await tx.member.update({
                    where: { id: mv.memberId },
                    data: {
                        unitId: nextHomeUnitId,
                        servesUnitId: nextServesUnitId,
                        role: mv.toRole,
                        // A leader belongs to the unit, not to one of its sub-groups.
                        subgroupId: homeChanged ? null : before.subgroupId,
                    },
                });

                await tx.memberMove.create({
                    data: {
                        memberId: mv.memberId,
                        fromUnitId: before.unitId,
                        toUnitId: nextHomeUnitId,
                        fromSubgroupId: before.subgroupId,
                        toSubgroupId: homeChanged ? null : before.subgroupId,
                        fromRole: before.role,
                        toRole: mv.toRole,
                        fromProgression: before.progressions ?? [],
                        toProgression: before.progressions ?? [],
                        moveDate: when,
                        notes: notes || null,
                        batchId,
                        batchLabel,
                    },
                });
            }
        });

        revalidatePath("/units/[id]", "page");

        return NextResponse.json({ batchId, batchLabel, movedCount: moves.length });
    } catch (error) {
        console.error("Error transferring maitrise:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
