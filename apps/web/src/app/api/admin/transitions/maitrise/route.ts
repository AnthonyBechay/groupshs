import { prisma } from "@/db";
import { getSession, hasPermission, canAccessUnit } from "@/lib/auth";
import { LEADERSHIP_ROLES, isLeadershipRole } from "@/lib/scout-config";
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
        if (!hasPermission(session, "canManageMembers")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const [members, units] = await Promise.all([
            prisma.member.findMany({
                where: { status: "ACTIVE" },
                select: {
                    id: true, firstName: true, lastName: true, role: true,
                    photoUrl: true, unitId: true,
                    unit: { select: { id: true, name: true, unitType: true } },
                },
                orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
            }),
            prisma.unit.findMany({
                select: { id: true, name: true, unitType: true },
                orderBy: { name: "asc" },
            }),
        ]);

        // A leader is anyone currently holding a maîtrise role. Everyone else is
        // offered too, so a member can be promoted INTO the maîtrise.
        const leaders = members.filter(m => isLeadershipRole(m.role));
        const others = members.filter(m => !isLeadershipRole(m.role));

        return NextResponse.json({ leaders, others, units, roles: LEADERSHIP_ROLES });
    } catch (error) {
        console.error("Error loading maitrise:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

type LeaderMove = { memberId: string; toUnitId: string; toRole: string };

export async function POST(request: NextRequest) {
    try {
        const session = await getSession();
        if (!hasPermission(session, "canManageMembers")) {
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
            select: { id: true, firstName: true, lastName: true, unitId: true, subgroupId: true, role: true, progressions: true },
        });
        if (members.length !== memberIds.length) {
            return NextResponse.json({ error: "One or more members are unavailable" }, { status: 400 });
        }
        for (const m of members) {
            if (!canAccessUnit(session, m.unitId)) {
                return NextResponse.json({ error: "Forbidden: source unit" }, { status: 403 });
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
                const unitChanged = before.unitId !== mv.toUnitId;

                await tx.member.update({
                    where: { id: mv.memberId },
                    data: {
                        unitId: mv.toUnitId,
                        role: mv.toRole,
                        // A leader belongs to the unit, not to one of its sub-groups.
                        subgroupId: unitChanged ? null : before.subgroupId,
                    },
                });

                await tx.memberMove.create({
                    data: {
                        memberId: mv.memberId,
                        fromUnitId: before.unitId,
                        toUnitId: mv.toUnitId,
                        fromSubgroupId: before.subgroupId,
                        toSubgroupId: unitChanged ? null : before.subgroupId,
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
