import { prisma } from "@/db";
import { getSession, hasPermission, canAccessUnit } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getSession();
        if (!hasPermission(session, "canManageMembers")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const existing = await prisma.member.findUnique({ where: { id } });
        if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
        if (!canAccessUnit(session, existing.unitId)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const body = await request.json();
        const { toUnitId, toSubgroupId, toRole, toProgression, moveDate, notes } = body;

        if (toUnitId && !canAccessUnit(session, toUnitId)) {
            return NextResponse.json({ error: "Forbidden: target unit not allowed" }, { status: 403 });
        }

        const moveDataDiff: Record<string, unknown> = {};
        const memberPatch: Record<string, unknown> = {};
        if (toUnitId && toUnitId !== existing.unitId) {
            moveDataDiff.fromUnitId = existing.unitId;
            moveDataDiff.toUnitId = toUnitId;
            memberPatch.unitId = toUnitId;
            // Clear subgroup if moving to a different unit unless explicitly set
            if (!("toSubgroupId" in body)) memberPatch.subgroupId = null;
        }
        if ("toSubgroupId" in body && (toSubgroupId || null) !== (existing.subgroupId || null)) {
            moveDataDiff.fromSubgroupId = existing.subgroupId;
            moveDataDiff.toSubgroupId = toSubgroupId || null;
            memberPatch.subgroupId = toSubgroupId || null;
        }
        if ("toRole" in body && (toRole || null) !== (existing.role || null)) {
            moveDataDiff.fromRole = existing.role;
            moveDataDiff.toRole = toRole || null;
            memberPatch.role = toRole || null;
        }
        if ("toProgression" in body && (toProgression || null) !== (existing.progression || null)) {
            moveDataDiff.fromProgression = existing.progression;
            moveDataDiff.toProgression = toProgression || null;
            memberPatch.progression = toProgression || null;
        }

        if (Object.keys(moveDataDiff).length === 0) {
            return NextResponse.json({ error: "Nothing changed" }, { status: 400 });
        }

        const result = await prisma.$transaction(async (tx) => {
            const updated = await tx.member.update({ where: { id }, data: memberPatch });
            const move = await tx.memberMove.create({
                data: {
                    memberId: id,
                    ...moveDataDiff,
                    moveDate: moveDate ? new Date(moveDate) : new Date(),
                    notes: notes || null,
                },
            });
            return { member: updated, move };
        });

        return NextResponse.json(result);
    } catch (error) {
        console.error("Error moving member:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
