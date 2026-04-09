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
        { value: "CT", label: "CT (Chef Troupe)" },
        { value: "ACT", label: "ACT (Assistant Chef Troupe)" },
        { value: "CL", label: "CL (Cheftaine Louveteaux)" },
        { value: "ACL", label: "ACL (Assistante Cheftaine Louveteaux)" },
        { value: "CC", label: "CC (Chef Clan)" },
        { value: "ACC", label: "ACC (Assistant Chef Clan)" },
    ],
};

export const PROGRESSION_BY_UNIT_TYPE: Record<string, { value: string; label: string }[]> = {
    LOUVETEAUX: [
        { value: "PATTETENDRE", label: "Pattes Tendres" },
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
