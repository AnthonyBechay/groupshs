import { prisma } from "@/db";
import { getSession, hasPermission } from "@/lib/auth";
import { NextResponse } from "next/server";

/**
 * GET /api/admin/transitions/batches
 * History of batch promotions, newest first, with revert status.
 */
export async function GET() {
    try {
        const session = await getSession();
        if (!hasPermission(session, "canManageMembers")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const moves = await prisma.memberMove.findMany({
            where: { batchId: { not: null } },
            select: {
                batchId: true, batchLabel: true, moveDate: true, revertedAt: true,
                memberId: true, notes: true,
                member: { select: { firstName: true, lastName: true } },
            },
            orderBy: { moveDate: "desc" },
            take: 500,
        });

        // Group the flat move rows into batches.
        const byBatch = new Map<string, {
            batchId: string;
            batchLabel: string | null;
            moveDate: Date;
            notes: string | null;
            memberCount: number;
            revertedCount: number;
            members: string[];
        }>();

        for (const m of moves) {
            if (!m.batchId) continue;
            let b = byBatch.get(m.batchId);
            if (!b) {
                b = {
                    batchId: m.batchId,
                    batchLabel: m.batchLabel,
                    moveDate: m.moveDate,
                    notes: m.notes,
                    memberCount: 0,
                    revertedCount: 0,
                    members: [],
                };
                byBatch.set(m.batchId, b);
            }
            b.memberCount += 1;
            if (m.revertedAt) b.revertedCount += 1;
            if (b.members.length < 12) {
                b.members.push(`${m.member.firstName} ${m.member.lastName}`);
            }
        }

        const batches = [...byBatch.values()].map(b => ({
            ...b,
            fullyReverted: b.revertedCount === b.memberCount,
            partiallyReverted: b.revertedCount > 0 && b.revertedCount < b.memberCount,
        }));

        return NextResponse.json(batches);
    } catch (error) {
        console.error("Error listing transition batches:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
