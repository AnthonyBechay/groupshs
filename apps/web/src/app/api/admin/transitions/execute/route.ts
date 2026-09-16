import { prisma } from "@/db";
import { getSession, hasPermission, canAccessUnit } from "@/lib/auth";
import { getTransitionSettings } from "@/lib/transition-service";
import { getFiscalYear, TRANSITION_PATH } from "@/lib/age-transition";
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";

type MoveRequest = {
    memberId: string;
    toUnitId: string;
    toSubgroupId?: string | null;
    toRole?: string | null;
    toProgressions?: string[];
};

/**
 * POST /api/admin/transitions/execute
 *
 * Promotes a batch of members into their next branch. Every move is written to
 * `member_move` with the complete previous state (unit, subgroup, role,
 * progressions) and a shared `batchId`, so the whole promotion can be rolled
 * back later by /api/admin/transitions/batches/[batchId]/revert.
 *
 * Defaults are "clean slate in the new branch": role and subgroup are cleared
 * and progressions reset, because they are branch-specific. The previous values
 * are preserved on the move record, so nothing is lost.
 */
export async function POST(request: NextRequest) {
    try {
        const session = await getSession();
        if (!hasPermission(session, "canManageMembers")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const {
            fromUnitId,
            moves,
            notes,
            moveDate,
            clearRole = true,
            clearSubgroup = true,
            resetProgressions = true,
        } = body as {
            fromUnitId?: string;
            moves?: MoveRequest[];
            notes?: string;
            moveDate?: string;
            clearRole?: boolean;
            clearSubgroup?: boolean;
            resetProgressions?: boolean;
        };

        if (!fromUnitId) {
            return NextResponse.json({ error: "fromUnitId is required" }, { status: 400 });
        }
        if (!Array.isArray(moves) || moves.length === 0) {
            return NextResponse.json({ error: "No members selected" }, { status: 400 });
        }
        if (!canAccessUnit(session, fromUnitId)) {
            return NextResponse.json({ error: "Forbidden: source unit" }, { status: 403 });
        }

        const fromUnit = await prisma.unit.findUnique({
            where: { id: fromUnitId },
            select: { id: true, name: true, unitType: true },
        });
        if (!fromUnit) return NextResponse.json({ error: "Source unit not found" }, { status: 404 });

        // ── Validate every destination up front ──────────────────────────────
        const targetIds = [...new Set(moves.map(m => m.toUnitId))];
        for (const tid of targetIds) {
            if (!tid) return NextResponse.json({ error: "Each move needs a target unit" }, { status: 400 });
            if (!canAccessUnit(session, tid)) {
                return NextResponse.json({ error: "Forbidden: target unit" }, { status: 403 });
            }
        }
        const targetUnits = await prisma.unit.findMany({
            where: { id: { in: targetIds } },
            select: { id: true, name: true, unitType: true },
        });
        if (targetUnits.length !== targetIds.length) {
            return NextResponse.json({ error: "One or more target units no longer exist" }, { status: 400 });
        }

        // Destination must be the branch this unit actually graduates into.
        const expectedType = TRANSITION_PATH[fromUnit.unitType] ?? null;
        if (!expectedType) {
            return NextResponse.json(
                { error: `${fromUnit.unitType} has no branch to move up into` },
                { status: 400 }
            );
        }
        const wrong = targetUnits.find(u => u.unitType !== expectedType);
        if (wrong) {
            return NextResponse.json(
                { error: `"${wrong.name}" is a ${wrong.unitType} unit; expected ${expectedType}` },
                { status: 400 }
            );
        }

        // ── Load the members and confirm they are all in the source unit ─────
        const memberIds = moves.map(m => m.memberId);
        const members = await prisma.member.findMany({
            where: { id: { in: memberIds } },
            select: {
                id: true, firstName: true, lastName: true,
                unitId: true, subgroupId: true, role: true, progressions: true,
            },
        });
        if (members.length !== memberIds.length) {
            return NextResponse.json({ error: "One or more members no longer exist" }, { status: 400 });
        }
        const strayMember = members.find(m => m.unitId !== fromUnitId);
        if (strayMember) {
            return NextResponse.json(
                { error: `${strayMember.firstName} ${strayMember.lastName} is no longer in this unit — refresh and try again` },
                { status: 409 }
            );
        }

        // Any target subgroup must belong to that member's destination unit.
        const requestedSubgroupIds = moves.map(m => m.toSubgroupId).filter((v): v is string => !!v);
        const subgroups = requestedSubgroupIds.length
            ? await prisma.subgroup.findMany({
                where: { id: { in: [...new Set(requestedSubgroupIds)] } },
                select: { id: true, unitId: true },
            })
            : [];
        for (const mv of moves) {
            if (!mv.toSubgroupId) continue;
            const sg = subgroups.find(s => s.id === mv.toSubgroupId);
            if (!sg || sg.unitId !== mv.toUnitId) {
                return NextResponse.json(
                    { error: "A selected subgroup does not belong to its target unit" },
                    { status: 400 }
                );
            }
        }

        // ── Apply ────────────────────────────────────────────────────────────
        const settings = await getTransitionSettings();
        const when = moveDate ? new Date(moveDate) : new Date();
        const fy = getFiscalYear(when, settings.fiscalYearStartMonth);
        const batchId = randomUUID();
        const targetNames = [...new Set(targetUnits.map(u => u.name))].join(", ");
        const batchLabel = `${fromUnit.name} → ${targetNames} (${fy.label})`;

        const result = await prisma.$transaction(async (tx) => {
            const applied: string[] = [];

            for (const mv of moves) {
                const before = members.find(m => m.id === mv.memberId)!;

                const nextSubgroupId = mv.toSubgroupId ?? (clearSubgroup ? null : before.subgroupId);
                const nextRole = mv.toRole !== undefined ? mv.toRole : (clearRole ? null : before.role);
                const nextProgressions = mv.toProgressions ?? (resetProgressions ? [] : before.progressions);

                await tx.member.update({
                    where: { id: mv.memberId },
                    data: {
                        unitId: mv.toUnitId,
                        subgroupId: nextSubgroupId,
                        role: nextRole,
                        progressions: nextProgressions,
                    },
                });

                await tx.memberMove.create({
                    data: {
                        memberId: mv.memberId,
                        fromUnitId: before.unitId,
                        toUnitId: mv.toUnitId,
                        fromSubgroupId: before.subgroupId,
                        toSubgroupId: nextSubgroupId,
                        fromRole: before.role,
                        toRole: nextRole,
                        fromProgression: before.progressions ?? [],
                        toProgression: nextProgressions,
                        moveDate: when,
                        notes: notes || null,
                        batchId,
                        batchLabel,
                    },
                });

                applied.push(mv.memberId);
            }

            return applied;
        });

        revalidatePath("/units/[id]", "page");
        revalidatePath("/activities");

        return NextResponse.json({
            batchId,
            batchLabel,
            movedCount: result.length,
            fiscalYear: fy.label,
        });
    } catch (error) {
        console.error("Error executing transition:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
