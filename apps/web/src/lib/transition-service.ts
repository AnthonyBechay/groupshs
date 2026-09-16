/**
 * Server-side helpers for the age-based transition ("move up") flow.
 * Pure age maths lives in `age-transition.ts`; this module adds DB access.
 */

import { prisma } from "@/db";
import {
    TransitionSettings, DEFAULT_TRANSITION_SETTINGS,
    TRANSITION_PATH, evaluateMember, getFiscalYear, currentAge,
} from "@/lib/age-transition";
import { isLeadershipRoleIn } from "@/lib/scout-config";

/** Read the configured transition rules, falling back to defaults. */
export async function getTransitionSettings(): Promise<TransitionSettings> {
    const s = await prisma.siteSettings.findUnique({
        where: { id: "default" },
        select: {
            fiscalYearStartMonth: true,
            ageLouveteauxToEclaireurs: true,
            ageEclaireursToRoutiers: true,
            ageLouvettesToEclaireuses: true,
            ageEclaireusesToPionnieres: true,
        },
    });
    if (!s) return DEFAULT_TRANSITION_SETTINGS;
    const d = DEFAULT_TRANSITION_SETTINGS;
    return {
        fiscalYearStartMonth: s.fiscalYearStartMonth ?? d.fiscalYearStartMonth,
        ageLouveteauxToEclaireurs: s.ageLouveteauxToEclaireurs ?? d.ageLouveteauxToEclaireurs,
        ageEclaireursToRoutiers: s.ageEclaireursToRoutiers ?? d.ageEclaireursToRoutiers,
        ageLouvettesToEclaireuses: s.ageLouvettesToEclaireuses ?? d.ageLouvettesToEclaireuses,
        ageEclaireusesToPionnieres: s.ageEclaireusesToPionnieres ?? d.ageEclaireusesToPionnieres,
    };
}

export type MemberSummary = {
    id: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string | null;
    gender: string | null;
    role: string | null;
    progressions: string[];
    subgroupId: string | null;
    subgroupName: string | null;
    photoUrl: string | null;
};

export type CandidateRow = MemberSummary & {
    eligible: boolean;
    reason: string;
    ageReached: number | null;
    ageNow: number | null;
    threshold: number | null;
    targetUnitType: string | null;
};

/**
 * Evaluate every member of `unitId` against the transition rules.
 * Returns the full roster annotated with eligibility so the UI can show both
 * who is due to move and why the others are not.
 */
export async function buildUnitTransitionPreview(unitId: string, ref: Date = new Date()) {
    const settings = await getTransitionSettings();

    const unit = await prisma.unit.findUnique({
        where: { id: unitId },
        select: { id: true, name: true, unitType: true },
    });
    if (!unit) return null;

    const members = await prisma.member.findMany({
        where: { unitId, status: "ACTIVE" },
        select: {
            id: true, firstName: true, lastName: true, dateOfBirth: true, gender: true,
            role: true, progressions: true, subgroupId: true, photoUrl: true,
            subgroup: { select: { name: true } },
        },
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    });

    const targetUnitType = TRANSITION_PATH[unit.unitType] ?? null;

    // Units the members could land in (same branch as the graduation target).
    const targetUnits = targetUnitType
        ? await prisma.unit.findMany({
            where: { unitType: targetUnitType },
            select: { id: true, name: true, unitType: true },
            orderBy: { name: "asc" },
        })
        : [];

    const rows: CandidateRow[] = members.map((m) => {
        // Leaders (maîtrise) are never swept up by the age rule — they move
        // between units by decision, through the maîtrise transfer flow.
        // Context-aware: inside the Louveteaux, "SE" is a Second de Sizaine (a
        // youth who must still be promoted), not the Secretaire de Groupe.
        const eva = isLeadershipRoleIn(m.role, unit.unitType)
            ? {
                eligible: false, reason: "LEADERSHIP" as const,
                ageReached: null, threshold: null,
                targetUnitType: TRANSITION_PATH[unit.unitType] ?? null,
            }
            : evaluateMember(m.dateOfBirth, unit.unitType, settings, ref);
        return {
            id: m.id,
            firstName: m.firstName,
            lastName: m.lastName,
            dateOfBirth: m.dateOfBirth,
            gender: m.gender,
            role: m.role,
            progressions: m.progressions ?? [],
            subgroupId: m.subgroupId,
            subgroupName: m.subgroup?.name ?? null,
            photoUrl: m.photoUrl,
            eligible: eva.eligible,
            reason: eva.reason,
            ageReached: eva.ageReached,
            ageNow: currentAge(m.dateOfBirth, ref),
            threshold: eva.threshold,
            targetUnitType: eva.targetUnitType,
        };
    });

    const fy = getFiscalYear(ref, settings.fiscalYearStartMonth);

    return {
        unit,
        settings,
        fiscalYear: { label: fy.label, start: fy.start.toISOString(), end: fy.end.toISOString() },
        targetUnitType,
        targetUnits,
        candidates: rows.filter(r => r.eligible),
        others: rows.filter(r => !r.eligible),
        counts: { total: rows.length, eligible: rows.filter(r => r.eligible).length },
    };
}
