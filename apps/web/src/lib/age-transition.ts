/**
 * Age-based branch transition engine.
 *
 * Rule (as configured in Site Settings):
 *   A member must move up when, **during the current fiscal year**, they reach
 *   the configured age for their branch. Example with the default settings
 *   (fiscal year starting in September, threshold 12): a Louveteau who turns 12
 *   at any point between 1 Sep and 31 Aug is due to move to the Eclaireurs.
 *
 * Everything here is pure + timezone-safe (dates are handled in UTC, and the
 * member `dateOfBirth` is a plain "YYYY-MM-DD" string), so it can be unit
 * tested and reused on both server and client.
 */

// ─── Branch progression path ─────────────────────────────────────────────────

/** Which branch a member graduates INTO. `null` = end of the track. */
export const TRANSITION_PATH: Record<string, string | null> = {
    LOUVETEAUX: "ECLAIREURS",
    ECLAIREURS: "ROUTIERS",
    ROUTIERS: null,
    LOUVETTES: "ECLAIREUSES",
    ECLAIREUSES: "PIONNIERES",
    PIONNIERES: null,
    GROUP: null,
};

/**
 * Each branch has its OWN configurable age, so the boys' and girls' tracks can
 * be tuned independently (they are not required to share a threshold).
 */
export type TransitionSettings = {
    fiscalYearStartMonth: number;          // 1-12, e.g. 9 = September
    // Boys track
    ageLouveteauxToEclaireurs: number;
    ageEclaireursToRoutiers: number;
    // Girls track
    ageLouvettesToEclaireuses: number;
    ageEclaireusesToPionnieres: number;
};

export const DEFAULT_TRANSITION_SETTINGS: TransitionSettings = {
    fiscalYearStartMonth: 9,
    ageLouveteauxToEclaireurs: 12,
    ageEclaireursToRoutiers: 17,
    ageLouvettesToEclaireuses: 12,
    ageEclaireusesToPionnieres: 17,
};

/** Which settings key governs leaving each branch. */
export const THRESHOLD_KEY_BY_UNIT_TYPE: Record<string, keyof Omit<TransitionSettings, "fiscalYearStartMonth">> = {
    LOUVETEAUX: "ageLouveteauxToEclaireurs",
    ECLAIREURS: "ageEclaireursToRoutiers",
    LOUVETTES: "ageLouvettesToEclaireuses",
    ECLAIREUSES: "ageEclaireusesToPionnieres",
};

/** The age threshold that governs leaving `unitType`, or null if it has no exit rule. */
export function thresholdForUnitType(unitType: string, s: TransitionSettings): number | null {
    const key = THRESHOLD_KEY_BY_UNIT_TYPE[unitType];
    return key ? s[key] : null;
}

// ─── Fiscal year ──────────────────────────────────────────────────────────────

export type FiscalYear = {
    startYear: number;   // calendar year the fiscal year begins in
    start: Date;         // inclusive
    end: Date;           // inclusive
    label: string;       // e.g. "2026–2027"
};

/**
 * The fiscal year containing `ref`. A fiscal year starting in month M runs from
 * 1 M (year Y) through the last day before 1 M (year Y+1).
 */
export function getFiscalYear(ref: Date, startMonth: number): FiscalYear {
    const m = clampMonth(startMonth);
    const refMonth = ref.getUTCMonth() + 1; // 1-12
    const startYear = refMonth >= m ? ref.getUTCFullYear() : ref.getUTCFullYear() - 1;

    const start = new Date(Date.UTC(startYear, m - 1, 1, 0, 0, 0, 0));
    const end = new Date(Date.UTC(startYear + 1, m - 1, 1, 0, 0, 0, 0) - 1);

    // A fiscal year wholly inside one calendar year (startMonth === 1) reads better unsplit.
    const label = m === 1 ? `${startYear}` : `${startYear}–${startYear + 1}`;
    return { startYear, start, end, label };
}

function clampMonth(m: number): number {
    if (!Number.isFinite(m)) return 9;
    return Math.min(12, Math.max(1, Math.round(m)));
}

// ─── Age maths ────────────────────────────────────────────────────────────────

/** Parse "YYYY-MM-DD" (or an ISO datetime) into UTC parts. Returns null if unusable. */
export function parseDob(dob: string | null | undefined): { year: number; month: number; day: number } | null {
    if (!dob) return null;
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dob.trim());
    if (!m) return null;
    const year = Number(m[1]), month = Number(m[2]), day = Number(m[3]);
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    return { year, month, day };
}

/**
 * The age the member *reaches* on the birthday that falls inside `fy`.
 * Returns null when the date of birth is missing or malformed.
 */
export function ageReachedDuringFiscalYear(dob: string | null | undefined, fy: FiscalYear, startMonth: number): number | null {
    const parts = parseDob(dob);
    if (!parts) return null;
    const m = clampMonth(startMonth);
    // Birthday falls in the first calendar year of the window when its month is
    // at or after the fiscal start month; otherwise it lands in the second.
    const birthdayYear = parts.month >= m ? fy.startYear : fy.startYear + 1;
    return birthdayYear - parts.year;
}

/** Conventional "age today", for display. */
export function currentAge(dob: string | null | undefined, ref: Date = new Date()): number | null {
    const parts = parseDob(dob);
    if (!parts) return null;
    let age = ref.getUTCFullYear() - parts.year;
    const beforeBirthday =
        ref.getUTCMonth() + 1 < parts.month ||
        (ref.getUTCMonth() + 1 === parts.month && ref.getUTCDate() < parts.day);
    if (beforeBirthday) age -= 1;
    return age;
}

// ─── Eligibility ──────────────────────────────────────────────────────────────

export type EligibilityReason =
    | "ELIGIBLE"
    | "NO_DOB"
    | "BELOW_THRESHOLD"
    | "NO_EXIT_RULE"      // branch has no configured "move up" age (e.g. ROUTIERS, GROUP)
    | "END_OF_TRACK"      // nothing to graduate into
    | "LEADERSHIP";       // maîtrise — moves by decision, not by age

export type Eligibility = {
    eligible: boolean;
    reason: EligibilityReason;
    ageReached: number | null;   // age attained during this fiscal year
    threshold: number | null;
    targetUnitType: string | null;
};

/** Decide whether one member is due to move up out of `unitType` this fiscal year. */
export function evaluateMember(
    dob: string | null | undefined,
    unitType: string,
    settings: TransitionSettings,
    ref: Date = new Date()
): Eligibility {
    const targetUnitType = TRANSITION_PATH[unitType] ?? null;
    const threshold = thresholdForUnitType(unitType, settings);
    const fy = getFiscalYear(ref, settings.fiscalYearStartMonth);
    const ageReached = ageReachedDuringFiscalYear(dob, fy, settings.fiscalYearStartMonth);

    if (threshold === null) {
        return { eligible: false, reason: "NO_EXIT_RULE", ageReached, threshold, targetUnitType };
    }
    if (!targetUnitType) {
        return { eligible: false, reason: "END_OF_TRACK", ageReached, threshold, targetUnitType };
    }
    if (ageReached === null) {
        return { eligible: false, reason: "NO_DOB", ageReached, threshold, targetUnitType };
    }
    if (ageReached < threshold) {
        return { eligible: false, reason: "BELOW_THRESHOLD", ageReached, threshold, targetUnitType };
    }
    return { eligible: true, reason: "ELIGIBLE", ageReached, threshold, targetUnitType };
}

// ─── Placing a new recruit ────────────────────────────────────────────────────

/** Branch ladders, youngest first, per track. */
export const TRACK_BRANCHES: Record<"MALE" | "FEMALE", string[]> = {
    MALE: ["LOUVETEAUX", "ECLAIREURS", "ROUTIERS"],
    FEMALE: ["LOUVETTES", "ECLAIREUSES", "PIONNIERES"],
};

/**
 * Which branch a new recruit belongs in, from their gender and date of birth.
 * Uses the same "age reached during the fiscal year" rule as promotions, so a
 * recruit lands where they would sit after this year's move-ups — no one is
 * placed in a branch they are already due to leave.
 *
 * Returns null when gender or date of birth is missing.
 */
export function suggestBranchForAge(
    gender: string | null | undefined,
    dob: string | null | undefined,
    settings: TransitionSettings,
    ref: Date = new Date()
): { unitType: string; ageReached: number } | null {
    if (gender !== "MALE" && gender !== "FEMALE") return null;

    const fy = getFiscalYear(ref, settings.fiscalYearStartMonth);
    const ageReached = ageReachedDuringFiscalYear(dob, fy, settings.fiscalYearStartMonth);
    if (ageReached === null) return null;

    const branches = TRACK_BRANCHES[gender];
    // Walk up the ladder while the member has outgrown the current branch.
    let unitType = branches[0];
    for (const branch of branches) {
        const threshold = thresholdForUnitType(branch, settings);
        unitType = branch;
        if (threshold === null || ageReached < threshold) break;
    }
    return { unitType, ageReached };
}

export const REASON_LABEL: Record<EligibilityReason, string> = {
    ELIGIBLE: "Due to move up",
    NO_DOB: "No date of birth on file",
    BELOW_THRESHOLD: "Not old enough yet",
    NO_EXIT_RULE: "Branch has no move-up age",
    END_OF_TRACK: "Final branch — nowhere to move up to",
    LEADERSHIP: "Maîtrise — moves by decision, not by age",
};
