import { prisma } from "@/db";
import { getSession, hasPermission, canAccessUnit } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

/**
 * POST /api/admin/transitions/batches/[batchId]/revert   — the "reverse engine"
 *
 * Restores every member in the batch to the exact unit / subgroup / role /
 * progressions they had before the promotion, then stamps the move rows as
 * reverted (rather than writing inverse rows, which would clutter each member's
 * history).
 *
 * Safety: a member who has been moved AGAIN since this batch is skipped, because
 * rolling them back would silently undo that newer, unrelated move. Those are
 * reported back so the operator can deal with them explicitly.
 *
 * Pass { dryRun: true } to see exactly what would happen without touching data.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ batchId: string }> }) {
    try {
        const session = await getSession();
        if (!hasPermission(session, "canManageMembers")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { batchId } = await params;
        const body = await request.json().catch(() => ({}));
        const dryRun = body?.dryRun === true;

        const batchMoves = await prisma.memberMove.findMany({
            where: { batchId },
            include: { member: { select: { id: true, firstName: true, lastName: true, unitId: true } } },
            orderBy: { moveDate: "asc" },
        });

        if (batchMoves.length === 0) {
            return NextResponse.json({ error: "Batch not found" }, { status: 404 });
        }

        const alreadyReverted = batchMoves.filter(m => m.revertedAt);
        const pending = batchMoves.filter(m => !m.revertedAt);

        if (pending.length === 0) {
            return NextResponse.json(
                { error: "This batch has already been fully reverted" },
                { status: 409 }
            );
        }

        // ── Detect members moved again after this batch ──────────────────────
        const memberIds = pending.map(m => m.memberId);
        const laterMoves = await prisma.memberMove.findMany({
            where: {
                memberId: { in: memberIds },
                revertedAt: null,
                batchId: { not: batchId },
                moveDate: { gt: pending[0].moveDate },
            },
            select: { memberId: true, moveDate: true },
        });
        const blockedIds = new Set<string>();
        for (const pm of pending) {
            const hasLater = laterMoves.some(
                lm => lm.memberId === pm.memberId && lm.moveDate > pm.moveDate
            );
            if (hasLater) blockedIds.add(pm.memberId);
        }

        // ── Verify the restore targets still exist ───────────────────────────
        const restoreUnitIds = [...new Set(pending.map(m => m.fromUnitId).filter((v): v is string => !!v))];
        const existingUnits = await prisma.unit.findMany({
            where: { id: { in: restoreUnitIds } },
            select: { id: true },
        });
        const existingUnitIds = new Set(existingUnits.map(u => u.id));

        const restoreSubgroupIds = [...new Set(pending.map(m => m.fromSubgroupId).filter((v): v is string => !!v))];
        const existingSubgroups = restoreSubgroupIds.length
            ? await prisma.subgroup.findMany({
                where: { id: { in: restoreSubgroupIds } },
                select: { id: true },
            })
            : [];
        const existingSubgroupIds = new Set(existingSubgroups.map(s => s.id));

        const revertable: typeof pending = [];
        const skipped: { name: string; reason: string }[] = [];

        for (const mv of pending) {
            const name = `${mv.member.firstName} ${mv.member.lastName}`;
            if (blockedIds.has(mv.memberId)) {
                skipped.push({ name, reason: "Moved again after this promotion" });
                continue;
            }
            if (mv.fromUnitId && !existingUnitIds.has(mv.fromUnitId)) {
                skipped.push({ name, reason: "Original unit no longer exists" });
                continue;
            }
            if (mv.fromUnitId && !canAccessUnit(session, mv.fromUnitId)) {
                skipped.push({ name, reason: "You cannot manage the original unit" });
                continue;
            }
            revertable.push(mv);
        }

        const plan = {
            batchId,
            batchLabel: batchMoves[0].batchLabel,
            totalInBatch: batchMoves.length,
            alreadyReverted: alreadyReverted.length,
            willRevert: revertable.map(m => `${m.member.firstName} ${m.member.lastName}`),
            skipped,
        };

        if (dryRun) return NextResponse.json({ dryRun: true, ...plan });

        if (revertable.length === 0) {
            return NextResponse.json(
                { error: "Nothing can be reverted in this batch", ...plan },
                { status: 409 }
            );
        }

        const now = new Date();
        await prisma.$transaction(async (tx) => {
            for (const mv of revertable) {
                // Only restore a subgroup that still exists, otherwise detach.
                const restoreSubgroupId =
                    mv.fromSubgroupId && existingSubgroupIds.has(mv.fromSubgroupId)
                        ? mv.fromSubgroupId
                        : null;

                await tx.member.update({
                    where: { id: mv.memberId },
                    data: {
                        ...(mv.fromUnitId ? { unitId: mv.fromUnitId } : {}),
                        subgroupId: restoreSubgroupId,
                        role: mv.fromRole,
                        progressions: mv.fromProgression ?? [],
                    },
                });

                await tx.memberMove.update({
                    where: { id: mv.id },
                    data: { revertedAt: now, revertedBy: session?.userId ?? null },
                });
            }
        });

        revalidatePath("/units/[id]", "page");
        revalidatePath("/activities");

        return NextResponse.json({
            reverted: revertable.length,
            ...plan,
        });
    } catch (error) {
        console.error("Error reverting transition batch:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
