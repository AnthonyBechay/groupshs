// ─── Unit types ───────────────────────────────────────────────────────────────
// Boys track:  LOUVETEAUX → ECLAIREURS → ROUTIERS
// Girls track: LOUVETTES  → ECLAIREUSES → PIONNIERES
// GROUP holds the leadership / administrative team (mixed).

export const UNIT_TYPES = [
    "LOUVETEAUX", "ECLAIREURS", "ROUTIERS",
    "LOUVETTES", "ECLAIREUSES", "PIONNIERES",
    "GROUP",
] as const;

export type UnitType = (typeof UNIT_TYPES)[number];

export const UNIT_TYPE_OPTIONS: { value: UnitType; label: string; gender: "BOYS" | "GIRLS" | "MIXED" }[] = [
    { value: "LOUVETEAUX", label: "Louveteaux",  gender: "BOYS" },
    { value: "ECLAIREURS", label: "Eclaireurs",  gender: "BOYS" },
    { value: "ROUTIERS",   label: "Routiers",    gender: "BOYS" },
    { value: "LOUVETTES",  label: "Louvettes",   gender: "GIRLS" },
    { value: "ECLAIREUSES", label: "Eclaireuses", gender: "GIRLS" },
    { value: "PIONNIERES", label: "Pionnieres",  gender: "GIRLS" },
    { value: "GROUP",      label: "Group",       gender: "MIXED" },
];

export const UNIT_GENDER: Record<string, "BOYS" | "GIRLS" | "MIXED"> = {
    LOUVETEAUX: "BOYS",  ECLAIREURS: "BOYS",   ROUTIERS: "BOYS",
    LOUVETTES: "GIRLS",  ECLAIREUSES: "GIRLS", PIONNIERES: "GIRLS",
    GROUP: "MIXED",
};

/** Human label for a unit type value. */
export function unitTypeLabel(value: string): string {
    return UNIT_TYPE_OPTIONS.find(o => o.value === value)?.label ?? value;
}

export const ACTIVITY_TYPES = [
    { value: "CAMP", label: "Camp" },
    { value: "JOURNEE", label: "Day out" },
    { value: "TEMPS", label: "Meeting" },
    { value: "MARCHE", label: "Hike" },
    { value: "OTHER", label: "Other" },
] as const;

export const ROLES_BY_UNIT_TYPE: Record<string, { value: string; label: string }[]> = {
    LOUVETEAUX: [
        { value: "L", label: "L (Louveteau)" },
        { value: "SE", label: "SE (Second de Sizaine)" },
        { value: "SI", label: "SI (Sizenier)" },
    ],
    ECLAIREURS: [
        { value: "E", label: "E (Eclaireur)" },
        { value: "SP", label: "SP (Second de Patrouille)" },
        { value: "CP", label: "CP (Chef de Patrouille)" },

    ],
    ROUTIERS: [
        { value: "R", label: "R (Routier)" },
        { value: "CE", label: "CE (Chef d'Equipe)" },
    ],
    // ─── Girls track ──────────────────────────────────────────────────────────
    LOUVETTES: [
        { value: "L", label: "L (Louvette)" },
        { value: "SE", label: "SE (Seconde de Sizaine)" },
        { value: "SI", label: "SI (Sizeniere)" },
    ],
    ECLAIREUSES: [
        { value: "E", label: "E (Eclaireuse)" },
        { value: "SP", label: "SP (Second de Patrouille)" },
        { value: "CP", label: "CP (Cheftaine de Patrouille)" },
    ],
    PIONNIERES: [
        { value: "PI", label: "PI (Pionniere)" },
        { value: "CE", label: "CE (Cheftaine d'Equipe)" },
    ],
    GROUP: [
        { value: "CG", label: "CG (Chef de Groupe)" },
        { value: "ACG", label: "ACG (Assistant Chef de Groupe)" },
        { value: "EA", label: "EA (Equipe Administrative)" },
        { value: "TR", label: "TR (Tresorier de Groupe)" },
        { value: "SE", label: "SE (Secretaire de Groupe)" },
        { value: "CT", label: "CT (Chef Troupe)" },
        { value: "ACT", label: "ACT (Assistant Chef Troupe)" },
        { value: "CM", label: "CM (Cheftaine Meute)" },
        { value: "ACM", label: "ACM (Assistante Cheftaine Meute)" },
        { value: "CC", label: "CC (Chef Clan)" },
        { value: "CE", label: "CE (Chef d'equipe)" },
        { value: "ACC", label: "ACC (Assistant Chef Clan)" },
        { value: "AU", label: "AU (Aumônier)" },
    ],
};

// Naming for the second-level group inside a unit
export const SUBGROUP_LABEL_BY_UNIT_TYPE: Record<string, { singular: string; plural: string; lead: string; assistant: string }> = {
    LOUVETEAUX: { singular: "Sizaine", plural: "Sizaines", lead: "SI", assistant: "SE" },
    ECLAIREURS: { singular: "Patrouille", plural: "Patrouilles", lead: "CP", assistant: "SP" },
    ROUTIERS: { singular: "Equipe", plural: "Equipes", lead: "CE", assistant: "SE" },
    LOUVETTES: { singular: "Sizaine", plural: "Sizaines", lead: "SI", assistant: "SE" },
    ECLAIREUSES: { singular: "Patrouille", plural: "Patrouilles", lead: "CP", assistant: "SP" },
    PIONNIERES: { singular: "Equipe", plural: "Equipes", lead: "CE", assistant: "SE" },
    GROUP: { singular: "Group", plural: "Groups", lead: "Lead", assistant: "Asst" },
};

export const UNIT_CONTAINER_NAME: Record<string, string> = {
    LOUVETEAUX: "Meute",
    ECLAIREURS: "Troupe",
    ROUTIERS: "Clan",
    LOUVETTES: "Meute",
    ECLAIREUSES: "Troupe",
    PIONNIERES: "Clan",
    GROUP: "Group",
};

export const PROGRESSION_BY_UNIT_TYPE: Record<string, { value: string; label: string }[]> = {
    LOUVETEAUX: [
        { value: "PATTETENDRE", label: "Pattes Tendres" },
        { value: "PROMESSE", label: "Promesse" },
        { value: "1_ETOILE", label: "1 Etoile" },
        { value: "2_ETOILES", label: "2 Etoiles" },
    ],
    ECLAIREURS: [
        { value: "Eclaireur", label: "Eclaireur" },
        { value: "PROMESSE", label: "Promesse" },
        { value: "SECONDE_CLASSE", label: "Seconde Classe" },
        { value: "PREMIERE_CLASSE", label: "Premiere Classe" },
    ],
    ROUTIERS: [
        { value: "Routier", label: "Routier" },
        { value: "PremiereVeille", label: "Premiere Veille" },
        { value: "Depart", label: "Depart" },
    ],
    LOUVETTES: [
        { value: "PATTETENDRE", label: "Pattes Tendres" },
        { value: "PROMESSE", label: "Promesse" },
        { value: "1_ETOILE", label: "1 Etoile" },
        { value: "2_ETOILES", label: "2 Etoiles" },
    ],
    ECLAIREUSES: [
        { value: "Eclaireuse", label: "Eclaireuse" },
        { value: "PROMESSE", label: "Promesse" },
        { value: "SECONDE_CLASSE", label: "Seconde Classe" },
        { value: "PREMIERE_CLASSE", label: "Premiere Classe" },
    ],
    PIONNIERES: [
        { value: "Pionniere", label: "Pionniere" },
        { value: "PremiereVeille", label: "Premiere Veille" },
        { value: "Depart", label: "Depart" },
    ],
    GROUP: [{ value: "Depart", label: "Depart" }],
};

// ─── Maîtrise (leadership team) ───────────────────────────────────────────────
// Leaders are not governed by the age rules: they move between units by role
// (e.g. an ACG becoming CT of the Troupe) whenever the group decides.

export const LEADERSHIP_ROLES = ROLES_BY_UNIT_TYPE.GROUP.map(r => r.value);

/**
 * Two role codes are ambiguous — they mean different things depending on the
 * unit a member sits in:
 *
 *   SE  →  "Second de Sizaine" in the Louveteaux (a youth),
 *          "Secretaire de Groupe" in the GROUP    (a leader)
 *   CE  →  "Chef d'Equipe" in the Routiers        (a youth),
 *          "Chef d'equipe" in the GROUP           (a leader)
 *
 * Reading them as leadership everywhere would wrongly exempt a Second de
 * Sizaine from both the age rule and the gender rule, so the context-aware
 * check below must be preferred wherever the unit is known.
 */
export const AMBIGUOUS_ROLES = LEADERSHIP_ROLES.filter(r =>
    Object.entries(ROLES_BY_UNIT_TYPE)
        .some(([type, roles]) => type !== "GROUP" && roles.some(o => o.value === r))
);

/**
 * Context-free check — only safe when the role cannot be a branch role
 * (e.g. values already validated against LEADERSHIP_ROLES). Prefer
 * {@link isLeadershipRoleIn} whenever the member's unit is known.
 */
export function isLeadershipRole(role: string | null | undefined): boolean {
    return !!role && LEADERSHIP_ROLES.includes(role);
}

/**
 * Is this role a maîtrise role *for a member sitting in this unit*?
 * Inside a branch unit, a code that also exists in that branch means the youth
 * role, never the leadership one.
 */
export function isLeadershipRoleIn(role: string | null | undefined, unitType: string): boolean {
    if (!role || !LEADERSHIP_ROLES.includes(role)) return false;
    const branchRoles = ROLES_BY_UNIT_TYPE[unitType];
    if (!branchRoles || unitType === "GROUP") return true;
    // Claimed by this branch → it's the youth role, not the leadership one.
    return !branchRoles.some(o => o.value === role);
}

/** Every role a leader can hold, for the maîtrise transfer picker. */
export const LEADERSHIP_ROLE_OPTIONS = ROLES_BY_UNIT_TYPE.GROUP;

// ─── The two tiers of leadership ──────────────────────────────────────────────
//
// UNIT MAÎTRISE (CT, ACT, CM, ACM, CC, ACC, CE) lead a younger unit but REMAIN
// members of the Routiers / Pionnieres branch — a Cheftaine Meute is a Pionniere
// who serves the Meute. Their home unit stays senior; the unit they run is
// recorded separately as the unit they "serve".
//
// THE CONSEIL (CG, ACG, EA, TR, SE, AU) are the leaders of leaders. They sit at
// group level and are not Routiers / Pionnieres in parallel.

export const COUNCIL_ROLES = ["CG", "ACG", "EA", "TR", "SE", "AU"] as const;

export const UNIT_MAITRISE_ROLES = LEADERSHIP_ROLES.filter(
    r => !(COUNCIL_ROLES as readonly string[]).includes(r)
);

/** Senior branches: where unit maîtrise keep their membership. */
export const SENIOR_BRANCHES = ["ROUTIERS", "PIONNIERES"];

export function isCouncilRole(role: string | null | undefined): boolean {
    return !!role && (COUNCIL_ROLES as readonly string[]).includes(role);
}

/**
 * A unit-maîtrise role, judged in context (so "CE" inside the Routiers is read
 * as the youth Chef d'Equipe, not the leadership one).
 */
export function isUnitMaitriseRole(role: string | null | undefined, unitType: string): boolean {
    return isLeadershipRoleIn(role, unitType) && !isCouncilRole(role);
}

/**
 * A conseil role judged in context, so "SE" inside the Louveteaux is read as
 * Second de Sizaine (a child) rather than Secrétaire de Groupe.
 */
export function isCouncilRoleIn(role: string | null | undefined, unitType: string): boolean {
    return isLeadershipRoleIn(role, unitType) && isCouncilRole(role);
}

/**
 * Does a role change add or remove a conseil role?
 *
 * Appointing or removing the CG, ACG, EA, TR, SE or AU is a group-level
 * decision, so only a super admin may do it — otherwise an admin could promote
 * themselves into the conseil, or quietly remove the Chef de Groupe.
 */
export function touchesCouncilRole(
    before: (string | null | undefined)[],
    after: (string | null | undefined)[],
    unitTypeBefore: string,
    unitTypeAfter: string
): boolean {
    const b = new Set(before.filter(r => isCouncilRoleIn(r, unitTypeBefore)) as string[]);
    const a = new Set(after.filter(r => isCouncilRoleIn(r, unitTypeAfter)) as string[]);
    if (b.size !== a.size) return true;
    for (const r of a) if (!b.has(r)) return true;
    return false;
}

export const ROLE_TIER_LABEL: Record<string, string> = {
    COUNCIL: "Conseil (group leadership)",
    UNIT_MAITRISE: "Unit maîtrise",
};

/** Split the leadership roles into the two tiers, for grouped pickers. */
export const LEADERSHIP_ROLE_GROUPS = [
    {
        tier: "COUNCIL",
        label: ROLE_TIER_LABEL.COUNCIL,
        options: ROLES_BY_UNIT_TYPE.GROUP.filter(o => isCouncilRole(o.value)),
    },
    {
        tier: "UNIT_MAITRISE",
        label: ROLE_TIER_LABEL.UNIT_MAITRISE,
        options: ROLES_BY_UNIT_TYPE.GROUP.filter(o => !isCouncilRole(o.value)),
    },
];

/** Every role a member holds — the primary one plus any concurrent extras. */
export function allRolesOf(m: { role?: string | null; extraRoles?: string[] | null }): string[] {
    return [m.role, ...(m.extraRoles ?? [])].filter((r): r is string => !!r);
}

/**
 * Non-blocking consistency warnings for a leader's placement.
 *
 * These are advisory, not rules: the group does make exceptions (someone can be
 * a CM *and* an ACG), so the UI surfaces them rather than refusing to save.
 */
export function leadershipWarnings(
    roles: string[],
    homeUnitType: string,
    servesUnitId: string | null | undefined
): string[] {
    const warnings: string[] = [];
    const council = roles.filter(isCouncilRole);
    const unitLed = roles.filter(r => !isCouncilRole(r) && isLeadershipRole(r));

    if (council.length > 0 && SENIOR_BRANCHES.includes(homeUnitType) && unitLed.length === 0) {
        warnings.push(
            `${council.join(", ")} is a conseil role — the conseil sits at group level and is normally not ` +
            `a ${unitTypeLabel(homeUnitType)} member in parallel. Move them to the Group unit unless this is deliberate.`
        );
    }
    if (unitLed.length > 0 && !SENIOR_BRANCHES.includes(homeUnitType) && homeUnitType !== "GROUP") {
        warnings.push(
            `Unit maîtrise normally stay members of the Routiers or Pionnieres while they serve a younger unit.`
        );
    }
    if (unitLed.length > 0 && !servesUnitId) {
        warnings.push(`${unitLed.join(", ")} leads a unit — set which unit they serve.`);
    }
    return warnings;
}

// ─── Gender ↔ branch consistency ──────────────────────────────────────────────
// A youth member's gender is inseparable from their branch: an Eclaireuse is a
// girl, an Eclaireur is a boy. The maîtrise is exempt — a Cheftaine Meute (CM)
// leads the Louveteaux, so leaders may serve in any unit.

export type Gender = "MALE" | "FEMALE";

export const GENDER_LABEL: Record<Gender, string> = { MALE: "Boy", FEMALE: "Girl" };

/** The gender implied by a branch, or null for GROUP / unknown types. */
export function genderForUnitType(unitType: string): Gender | null {
    const g = UNIT_GENDER[unitType];
    if (g === "BOYS") return "MALE";
    if (g === "GIRLS") return "FEMALE";
    return null;
}

/**
 * Can a member of this gender be a youth member of this branch?
 * Unknown gender is allowed (it gets derived from the branch on save).
 */
export function unitAcceptsGender(unitType: string, gender: string | null | undefined): boolean {
    const required = genderForUnitType(unitType);
    if (!required) return true;        // GROUP is mixed
    if (!gender) return true;          // unknown — will be derived
    return gender === required;
}

/**
 * Validate a member's gender against the unit they are being placed in.
 * Returns the gender to store (deriving it when it was blank), or an error.
 * Leaders bypass the check entirely.
 */
export function resolveMemberGender(
    unitType: string,
    gender: string | null | undefined,
    role: string | null | undefined
): { ok: true; gender: string | null } | { ok: false; error: string } {
    // A leader's gender is their own and is never derived from the unit they
    // serve in — a Cheftaine Meute is a woman leading the boys' Louveteaux.
    // Context-aware so a Second de Sizaine (SE) isn't mistaken for a leader.
    if (isLeadershipRoleIn(role, unitType)) return { ok: true, gender: gender || null };

    const required = genderForUnitType(unitType);
    if (!required) return { ok: true, gender: gender || null };

    if (!gender) return { ok: true, gender: required };   // derive from the branch

    if (gender !== required) {
        return {
            ok: false,
            error: `${unitTypeLabel(unitType)} is a ${GENDER_LABEL[required].toLowerCase()}s' branch — a ${GENDER_LABEL[gender as Gender]?.toLowerCase() ?? "member"} cannot be a youth member there. Use the matching branch, or give them a leadership role.`,
        };
    }
    return { ok: true, gender };
}

// ─── Anciens progression ──────────────────────────────────────────────────────
// Stored as CODES, identical to the Routiers/Pionnieres progression values, so
// that an Ancien created automatically by the "leaving the group" flow (which
// copies the member's own progressions) matches what the Anciens form writes.
// Rendering always goes through progressionLabel().
export const ANCIEN_PROGRESSION_OPTIONS = [
    { value: "PremiereVeille", label: "Premiere Veille" },
    { value: "Depart", label: "Depart" },
] as const;

// Grouped role list used in the Anciens form — reuses ROLES_BY_UNIT_TYPE directly.
export const ANCIEN_SCOUT_ROLES: { group: string; options: { value: string; label: string }[] }[] = [
    { group: "Louveteaux",  options: ROLES_BY_UNIT_TYPE.LOUVETEAUX },
    { group: "Eclaireurs",  options: ROLES_BY_UNIT_TYPE.ECLAIREURS },
    { group: "Routiers",    options: ROLES_BY_UNIT_TYPE.ROUTIERS },
    { group: "Louvettes",   options: ROLES_BY_UNIT_TYPE.LOUVETTES },
    { group: "Eclaireuses", options: ROLES_BY_UNIT_TYPE.ECLAIREUSES },
    { group: "Pionnieres",  options: ROLES_BY_UNIT_TYPE.PIONNIERES },
    { group: "Groupe",      options: ROLES_BY_UNIT_TYPE.GROUP },
];

// Flat lookup: role value → label (across all branches)
export function ancienRoleLabel(value: string): string {
    for (const { options } of ANCIEN_SCOUT_ROLES) {
        const m = options.find(o => o.value === value);
        if (m) return m.label;
    }
    return value;
}

// Look up a label for any progression value across all unit types
export function progressionLabel(value: string): string {
    for (const list of Object.values(PROGRESSION_BY_UNIT_TYPE)) {
        const m = list.find(p => p.value === value);
        if (m) return m.label;
    }
    // Fallback: humanize the raw value
    return value.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}
