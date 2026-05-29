export const UNIT_TYPES = ["LOUVETEAUX", "ECLAIREURS", "ROUTIERS", "GROUP"] as const;

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
    GROUP: { singular: "Group", plural: "Groups", lead: "Lead", assistant: "Asst" },
};

export const UNIT_CONTAINER_NAME: Record<string, string> = {
    LOUVETEAUX: "Meute",
    ECLAIREURS: "Troupe",
    ROUTIERS: "Clan",
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
    GROUP: [{ value: "Depart", label: "Depart" }],
};

// Grouped role list used in the Anciens form — reuses ROLES_BY_UNIT_TYPE directly.
export const ANCIEN_SCOUT_ROLES: { group: string; options: { value: string; label: string }[] }[] = [
    { group: "Louveteaux", options: ROLES_BY_UNIT_TYPE.LOUVETEAUX },
    { group: "Eclaireurs", options: ROLES_BY_UNIT_TYPE.ECLAIREURS },
    { group: "Routiers",   options: ROLES_BY_UNIT_TYPE.ROUTIERS },
    { group: "Groupe",     options: ROLES_BY_UNIT_TYPE.GROUP },
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
