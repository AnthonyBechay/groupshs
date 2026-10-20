import { Users, TreePine, Compass, Mountain } from "lucide-react";

/**
 * Per-branch colors for the admin screens. Each branch has one hue and its
 * boys' and girls' units are two shades of it — Meutes yellow, Troupes green,
 * Clans red — so the pairing reads at a glance and the two stay distinct.
 *
 * Full class strings on purpose: Tailwind only ships classes it finds written
 * out, so these must never be assembled from pieces.
 */
export type UnitTheme = {
    headerBg: string;       // colored header of a card
    pageAccent: string;     // hero background, white text on top
    chip: string;
    iconBg: string;
    icon: typeof Users;
    leadChip: string;
    assistantChip: string;
    dot: string;            // solid swatch
};

export const UNIT_THEME: Record<string, UnitTheme> = {
    LOUVETEAUX: {
        headerBg: "bg-gradient-to-br from-amber-100 via-amber-50 to-orange-50 border-b border-amber-200",
        pageAccent: "bg-gradient-to-br from-amber-500 via-orange-500 to-orange-600",
        chip: "bg-amber-100 text-amber-800",
        iconBg: "bg-amber-100 text-amber-700",
        icon: TreePine,
        leadChip: "bg-amber-600 text-white",
        assistantChip: "bg-amber-100 text-amber-800",
        dot: "bg-amber-500",
    },
    LOUVETTES: {
        headerBg: "bg-gradient-to-br from-yellow-100 via-yellow-50 to-yellow-50 border-b border-yellow-200",
        pageAccent: "bg-gradient-to-br from-yellow-500 via-yellow-500 to-amber-500",
        chip: "bg-yellow-100 text-yellow-800",
        iconBg: "bg-yellow-100 text-yellow-700",
        icon: TreePine,
        leadChip: "bg-yellow-500 text-yellow-950",
        assistantChip: "bg-yellow-100 text-yellow-800",
        dot: "bg-yellow-400",
    },
    ECLAIREURS: {
        headerBg: "bg-gradient-to-br from-emerald-100 via-emerald-50 to-green-50 border-b border-emerald-200",
        pageAccent: "bg-gradient-to-br from-emerald-700 via-green-700 to-emerald-900",
        chip: "bg-emerald-100 text-emerald-800",
        iconBg: "bg-emerald-100 text-emerald-800",
        icon: Compass,
        leadChip: "bg-emerald-700 text-white",
        assistantChip: "bg-emerald-100 text-emerald-800",
        dot: "bg-emerald-700",
    },
    ECLAIREUSES: {
        headerBg: "bg-gradient-to-br from-lime-100 via-green-50 to-lime-50 border-b border-lime-200",
        pageAccent: "bg-gradient-to-br from-green-500 via-lime-600 to-green-600",
        chip: "bg-lime-100 text-lime-800",
        iconBg: "bg-lime-100 text-lime-800",
        icon: Compass,
        leadChip: "bg-lime-600 text-white",
        assistantChip: "bg-lime-100 text-lime-800",
        dot: "bg-lime-500",
    },
    ROUTIERS: {
        headerBg: "bg-gradient-to-br from-red-100 via-red-50 to-red-50 border-b border-red-200",
        pageAccent: "bg-gradient-to-br from-red-700 via-red-700 to-red-900",
        chip: "bg-red-100 text-red-800",
        iconBg: "bg-red-100 text-red-700",
        icon: Mountain,
        leadChip: "bg-red-700 text-white",
        assistantChip: "bg-red-100 text-red-800",
        dot: "bg-red-700",
    },
    PIONNIERES: {
        headerBg: "bg-gradient-to-br from-rose-100 via-rose-50 to-pink-50 border-b border-rose-200",
        pageAccent: "bg-gradient-to-br from-rose-500 via-rose-500 to-red-500",
        chip: "bg-rose-100 text-rose-800",
        iconBg: "bg-rose-100 text-rose-700",
        icon: Mountain,
        leadChip: "bg-rose-500 text-white",
        assistantChip: "bg-rose-100 text-rose-800",
        dot: "bg-rose-400",
    },
    GROUP: {
        headerBg: "bg-gradient-to-br from-primary/5 to-transparent border-b border-border",
        pageAccent: "bg-gradient-to-br from-primary via-primary to-emerald-700",
        chip: "bg-primary/10 text-primary",
        iconBg: "bg-primary/10 text-primary",
        icon: Users,
        leadChip: "bg-primary text-white",
        assistantChip: "bg-primary/10 text-primary",
        dot: "bg-primary",
    },
};

export function unitTheme(unitType: string | null | undefined): UnitTheme {
    return UNIT_THEME[unitType ?? ""] ?? UNIT_THEME.GROUP;
}
