import { prisma } from "@/db";
import { getSession, hasPermission, canAccessUnit } from "@/lib/auth";
import { resolveMemberGender } from "@/lib/scout-config";
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

/**
 * Enrolling a recruit — the final step of recruitment.
 *
 * Turns a recruitment submission into a real Member in a unit. Before this
 * existed, marking someone "RECRUITED" changed a label and nothing else; the
 * applicant never appeared on any roster.
 *
 * POST   → create the member and link them to the submission
 * DELETE → undo, removing the member if nothing has happened to them yet
 */

/** "Jean Pierre Khoury" → { firstName: "Jean", lastName: "Pierre Khoury" }. */
function splitName(full: string): { firstName: string; lastName: string } {
    const parts = full.trim().split(/\s+/);
    if (parts.length === 1) return { firstName: parts[0], lastName: "-" };
    return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getSession();
        if (!hasPermission(session, "canViewSubmissions")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        // Creating a member is a member-management action.
        if (!hasPermission(session, "canManageMembers")) {
            return NextResponse.json(
                { error: "You also need permission to manage Members to enrol a recruit" },
                { status: 403 }
            );
        }

        const { id } = await params;
        const body = await request.json();
        const { unitId, subgroupId, role, firstName, lastName } = body as {
            unitId?: string; subgroupId?: string | null; role?: string | null;
            firstName?: string; lastName?: string;
        };

        if (!unitId) {
            return NextResponse.json({ error: "Pick a unit to place them in" }, { status: 400 });
        }
        if (!canAccessUnit(session, unitId)) {
            return NextResponse.json({ error: "Forbidden: you cannot manage that unit" }, { status: 403 });
        }

        const submission = await prisma.recruitmentSubmission.findUnique({ where: { id } });
        if (!submission) return NextResponse.json({ error: "Submission not found" }, { status: 404 });
        if (submission.memberId) {
            return NextResponse.json(
                { error: "This applicant has already been enrolled" },
                { status: 409 }
            );
        }

        const unit = await prisma.unit.findUnique({
            where: { id: unitId },
            select: { id: true, name: true, unitType: true },
        });
        if (!unit) return NextResponse.json({ error: "Unit not found" }, { status: 400 });

        // Same gender↔branch rule as everywhere else: a girl cannot be enrolled
        // as a youth Eclaireur. Blank gender is derived from the branch.
        const genderCheck = resolveMemberGender(unit.unitType, submission.gender, role);
        if (!genderCheck.ok) {
            return NextResponse.json({ error: genderCheck.error }, { status: 400 });
        }

        if (subgroupId) {
            const sg = await prisma.subgroup.findUnique({
                where: { id: subgroupId },
                select: { unitId: true },
            });
            if (!sg || sg.unitId !== unitId) {
                return NextResponse.json(
                    { error: "That sub-group does not belong to the selected unit" },
                    { status: 400 }
                );
            }
        }

        const split = splitName(submission.fullName);
        const first = (firstName ?? split.firstName).trim();
        const last = (lastName ?? split.lastName).trim();
        if (!first || !last) {
            return NextResponse.json({ error: "First and last name are required" }, { status: 400 });
        }

        const result = await prisma.$transaction(async (tx) => {
            const member = await tx.member.create({
                data: {
                    firstName: first,
                    lastName: last,
                    gender: genderCheck.gender,
                    dateOfBirth: submission.dateOfBirth || null,
                    phone: submission.memberPhone || null,
                    role: role || null,
                    unitId,
                    subgroupId: subgroupId || null,
                    progressions: [],
                    joinedAt: new Date(),
                    // Carry the parent across as guardian + emergency contact so
                    // the new member is immediately reachable.
                    legalGuardianName: submission.parentName || null,
                    emergencyContactName: submission.parentName || null,
                    emergencyContactPhone: submission.parentPhone || null,
                    emergencyContactRelation: submission.parentName ? "Parent / Guardian" : null,
                },
            });

            await tx.recruitmentSubmission.update({
                where: { id },
                data: {
                    status: "RECRUITED",
                    memberId: member.id,
                    enrolledAt: new Date(),
                },
            });

            return member;
        });

        revalidatePath("/units/[id]", "page");

        return NextResponse.json({
            memberId: result.id,
            name: `${result.firstName} ${result.lastName}`,
            unitName: unit.name,
        });
    } catch (error) {
        console.error("Error enrolling recruit:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getSession();
        if (!hasPermission(session, "canManageMembers")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const submission = await prisma.recruitmentSubmission.findUnique({ where: { id } });
        if (!submission) return NextResponse.json({ error: "Submission not found" }, { status: 404 });
        if (!submission.memberId) {
            return NextResponse.json({ error: "This applicant has not been enrolled" }, { status: 409 });
        }

        const member = await prisma.member.findUnique({
            where: { id: submission.memberId },
            select: {
                id: true, unitId: true,
                _count: { select: { attendance: true, moves: true, medications: true } },
            },
        });

        // Only remove a member who is still untouched; otherwise undoing would
        // destroy real records.
        const hasHistory = !!member && (
            member._count.attendance > 0 || member._count.moves > 0 || member._count.medications > 0
        );
        if (member && hasHistory) {
            return NextResponse.json(
                { error: "This member already has activity recorded. Unlink them by editing the member instead." },
                { status: 409 }
            );
        }
        if (member && !canAccessUnit(session, member.unitId)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        await prisma.$transaction(async (tx) => {
            if (member) await tx.member.delete({ where: { id: member.id } });
            await tx.recruitmentSubmission.update({
                where: { id },
                data: { status: "CONTACTED", memberId: null, enrolledAt: null },
            });
        });

        revalidatePath("/units/[id]", "page");

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error("Error undoing enrolment:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
