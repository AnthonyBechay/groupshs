export const UNIT_TYPES = ["LOUVETEAUX", "ECLAIREURS", "ROUTIERS"] as const;

export const ACTIVITY_TYPES = [
    { value: "CAMP", label: "Camp" },
    { value: "JOURNEE", label: "Journée" },
    { value: "TEMPS", label: "Temps" },
    { value: "MARCHE", label: "Marche" },
    { value: "OTHER", label: "Autre" },
] as const;

export const ROLES_BY_UNIT_TYPE: Record<string, { value: string; label: string }[]> = {
    LOUVETEAUX: [
        { value: "Louveteau", label: "Louveteau" },
        { value: "SOU", label: "SOU (Sou-Sizainier)" },
        { value: "SI", label: "SI (Sizainier)" },
    ],
    ECLAIREURS: [
        { value: "Eclaireur", label: "Eclaireur" },
        { value: "SP", label: "SP (Second de Patrouille)" },
        { value: "CP", label: "CP (Chef de Patrouille)" },
    ],
    ROUTIERS: [
        { value: "Routier", label: "Routier" },
        { value: "SE", label: "SE (Second d'equipe)" },
        { value: "CE", label: "CE (Chef d'Equipe)" },
    ],
};

export const PROGRESSION_BY_UNIT_TYPE: Record<string, { value: string; label: string }[]> = {
    LOUVETEAUX: [
        { value: "PATTETENDRE", label: "Pattes Tendres" },
        { value: "1_ETOILE", label: "1 Étoile" },
        { value: "2_ETOILES", label: "2 Étoiles" },
        { value: "TOTEMISE", label: "Totémisé" },
    ],
    ECLAIREURS: [
        { value: "Eclaireur", label: "Eclaireur" },
        { value: "PROMESSE", label: "Promesse" },
        { value: "SECONDE_CLASSE", label: "Seconde Classe" },
        { value: "PREMIERE_CLASSE", label: "Première Classe" },
    ],
    ROUTIERS: [
        { value: "Routier", label: "Routier" },
        { value: "PremiereVeille", label: "Promesse" },
        { value: "Depart", label: "Seconde Classe" },
    ],
};
