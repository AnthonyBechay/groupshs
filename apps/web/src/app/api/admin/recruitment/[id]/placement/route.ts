import { prisma } from "@/db";
import { getSession, hasPermission } from "@/lib/auth";
import { getTransitionSettings } from "@/lib/transition-service";
import { suggestBranchForAge } from "@/lib/age-transition";
import { unitTypeLabel } from "@/lib/scout-config";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/admin/recruitment/[id]/placement
 *
 * Where should this applicant go? Uses the same age rule as promotions, so a
 * recruit is never placed in a branch they are already due to leave.
 * Returns the suggested branch plus the units available in it.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getSession();
        if (!hasPermission(session, "canViewSubmissions")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const submission = await prisma.recruitmentSubmission.findUnique({
            where: { id },
            select: { id: true, fullName: true, gender: true, dateOfBirth: true },
        });
        if (!submission) return NextResponse.json({ error: "Submission not found" }, { status: 404 });

        const settings = await getTransitionSettings();
        const suggestion = suggestBranchForAge(submission.gender, submission.dateOfBirth, settings);

        const [allUnits, subgroups] = await Promise.all([
            prisma.unit.findMany({
                select: {
                    id: true, name: true, unitType: true,
                    _count: { select: { members: { where: { status: "ACTIVE" } } } },
                },
                orderBy: { name: "asc" },
            }),
            prisma.subgroup.findMany({
                select: { id: true, name: true, unitId: true },
                orderBy: { name: "asc" },
            }),
        ]);

        const suggestedUnits = suggestion
            ? allUnits.filter(u => u.unitType === suggestion.unitType)
            : [];

        return NextResponse.json({
            submission,
            suggestion: suggestion
                ? {
                    unitType: suggestion.unitType,
                    unitTypeLabel: unitTypeLabel(suggestion.unitType),
                    ageReached: suggestion.ageReached,
                    hasUnits: suggestedUnits.length > 0,
                }
                : null,
            // Why no suggestion could be made, so the UI can say so precisely.
            missing: {
                gender: !submission.gender,
                dateOfBirth: !submission.dateOfBirth,
            },
            suggestedUnits,
            allUnits,
            subgroups,
        });
    } catch (error) {
        console.error("Error building placement suggestion:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
