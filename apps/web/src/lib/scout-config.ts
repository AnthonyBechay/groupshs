export const UNIT_TYPES = ["LOUVETEAUX", "ECLAIREURS", "ROUTIERS", "GROUP"] as const;

export const ACTIVITY_TYPES = [
    { value: "CAMP", label: "Camp" },
    { value: "JOURNEE", label: "Journee" },
    { value: "TEMPS", label: "Temps" },
    { value: "MARCHE", label: "Marche" },
    { value: "OTHER", label: "Autre" },
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
        { value: "PremiereVeille", label: "PremiereVeille" },
        { value: "Depart", label: "Depart" },
    ],
    GROUP: [{ value: "Depart", label: "Depart" },],
};
