import { prisma } from "@/db";
import { getSession, hasPermission, canAccessUnit } from "@/lib/auth";
import { resolveMemberGender } from "@/lib/scout-config";
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
        if (existing.status !== "ACTIVE") {
            return NextResponse.json(
                { error: "This member has left the group. Bring them back from Transitions → Leaving before moving them." },
                { status: 409 }
            );
        }
        if (!canAccessUnit(session, existing.unitId)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const body = await request.json();
        const { toUnitId, toSubgroupId, toRole, toProgressions, moveDate, notes } = body;
        const sameArr = (a: string[], b: string[]) => a.length === b.length && a.every((v, i) => v === b[i]);

        if (toUnitId && !canAccessUnit(session, toUnitId)) {
            return NextResponse.json({ error: "Forbidden: target unit not allowed" }, { status: 403 });
        }

        // Don't let a manual move drop a youth member into the wrong branch.
        if (toUnitId && toUnitId !== existing.unitId) {
            const target = await prisma.unit.findUnique({
                where: { id: toUnitId },
                select: { unitType: true },
            });
            if (!target) {
                return NextResponse.json({ error: "Target unit not found" }, { status: 400 });
            }
            const nextRole = "toRole" in body ? (toRole || null) : existing.role;
            const check = resolveMemberGender(target.unitType, existing.gender, nextRole);
            if (!check.ok) {
                return NextResponse.json({ error: check.error }, { status: 400 });
            }
        }

        const moveDataDiff: Record<string, unknown> = {};
        const memberPatch: Record<string, unknown> = {};
        if (toUnitId && toUnitId !== existing.unitId) {
            moveDataDiff.fromUnitId = existing.unitId;
            moveDataDiff.toUnitId = toUnitId;
            memberPatch.unitId = toUnitId;
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
        if ("toProgressions" in body) {
            const next: string[] = Array.isArray(toProgressions) ? toProgressions : [];
            if (!sameArr(existing.progressions || [], next)) {
                moveDataDiff.fromProgression = existing.progressions || [];
                moveDataDiff.toProgression = next;
                memberPatch.progressions = next;
            }
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
