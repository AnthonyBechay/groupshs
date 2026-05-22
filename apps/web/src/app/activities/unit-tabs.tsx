"use client";

import { useState, useMemo } from "react";
import { Calendar, MapPin, Clock, Tent, Sparkles, History, Backpack, ExternalLink, ChevronDown, TreePine, Compass, Mountain, Phone, X } from "lucide-react";
import Image from "next/image";

const TYPE_LABELS: Record<string, string> = {
    CAMP: "Camp", JOURNEE: "Day out", TEMPS: "Meeting", MARCHE: "Hike", OTHER: "Other",
};

type Contact = {
    firstName: string;
    lastName: string;
    phone: string | null;
    role: string | null;
    photoUrl: string | null;
};

type Activity = {
    id: string;
    title: string;
    description: string;
    whatToBring: string | null;
    activityType: string;
    startDate: string;
    endDate: string | null;
    pickupTime: string | null;
    dropoffTime: string | null;
    pickupLocation: string | null;
    dropoffLocation: string | null;
    location: string | null;
    pickupLocationUrl: string | null;
    dropoffLocationUrl: string | null;
    locationUrl: string | null;
    imageUrl: string | null;
    isUpcoming: boolean;
    unitId: string;
    unitName: string;
};

type Unit = {
    id: string;
    name: string;
    unitType: string;
    description: string | null;
    imageUrl: string | null;
    contacts: Contact[];
};

function formatDate(d: string) {
    return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function isActivityUpcoming(a: Activity, now: Date): boolean {
    const end = a.endDate ? new Date(a.endDate) : new Date(a.startDate);
    return end >= now;
}

// Unit-type theme classes
const UNIT_THEME: Record<string, {
    bg: string;          // selected card background
    softBg: string;      // unselected card hover/pill
    border: string;
    text: string;
    chip: string;
    icon: typeof Tent;
}> = {
    LOUVETEAUX: {
        bg: "bg-gradient-to-br from-amber-400 to-yellow-500 text-white border-yellow-500",
        softBg: "bg-yellow-50 hover:bg-yellow-100 border-yellow-200/70",
        border: "border-yellow-500/40",
        text: "text-yellow-700",
        chip: "bg-yellow-100 text-yellow-800",
        icon: TreePine,
    },
    ECLAIREURS: {
        bg: "bg-gradient-to-br from-emerald-600 to-green-700 text-white border-emerald-700",
        softBg: "bg-emerald-50 hover:bg-emerald-100 border-emerald-200/70",
        border: "border-emerald-600/40",
        text: "text-emerald-700",
        chip: "bg-emerald-100 text-emerald-800",
        icon: Compass,
    },
    ROUTIERS: {
        bg: "bg-gradient-to-br from-red-500 to-rose-600 text-white border-rose-600",
        softBg: "bg-rose-50 hover:bg-rose-100 border-rose-200/70",
        border: "border-rose-600/40",
        text: "text-rose-700",
        chip: "bg-rose-100 text-rose-800",
        icon: Mountain,
    },
    GROUP: {
        bg: "bg-gradient-to-br from-primary to-emerald-800 text-white border-primary",
        softBg: "bg-muted hover:bg-muted/80 border-border",
        border: "border-primary/40",
        text: "text-primary",
        chip: "bg-primary/10 text-primary",
        icon: Tent,
    },
};

export function UnitTabs({ units, activities }: { units: Unit[]; activities: Activity[] }) {
    const [selectedUnitId, setSelectedUnitId] = useState<string>("ALL");
    const [view, setView] = useState<"upcoming" | "past">("upcoming");

    const now = useMemo(() => new Date(), []);

    const { upcomingAll, pastAll } = useMemo(() => {
        const upcoming: Activity[] = [];
        const past: Activity[] = [];
        for (const a of activities) {
            if (isActivityUpcoming(a, now)) upcoming.push(a);
            else past.push(a);
        }
        upcoming.sort((a, b) => +new Date(a.startDate) - +new Date(b.startDate));
        past.sort((a, b) => +new Date(b.startDate) - +new Date(a.startDate));
        return { upcomingAll: upcoming, pastAll: past };
    }, [activities, now]);

    const baseList = view === "upcoming" ? upcomingAll : pastAll;
    const filtered = selectedUnitId === "ALL" ? baseList : baseList.filter(a => a.unitId === selectedUnitId);
    const selectedUnit = units.find(u => u.id === selectedUnitId) || null;

    function selectUnit(id: string) {
        setSelectedUnitId(id);
    }

    return (
        <div>
            {/* Unit picker cards */}
            <div className="mb-8">
                <div className="text-center mb-5">
                    <span className="inline-block text-xs font-bold tracking-widest uppercase text-primary mb-1">Filter</span>
                    <h2 className="text-xl font-extrabold">Browse by Unit</h2>
                </div>
                <div className="flex flex-wrap justify-center gap-2.5 md:gap-3 max-w-5xl mx-auto">
                    {/* All chip */}
                    <button
                        onClick={() => selectUnit("ALL")}
                        className={`px-4 py-2.5 md:px-5 md:py-3 rounded-2xl border-2 text-sm font-bold transition-all hover:-translate-y-0.5 active:scale-95 ${
                            selectedUnitId === "ALL"
                                ? "bg-foreground text-background border-foreground shadow-lg"
                                : "bg-card text-foreground border-border hover:border-foreground/40"
                        }`}
                    >
                        All units <span className="opacity-70 ml-1">({activities.length})</span>
                    </button>
                    {units.map(u => {
                        const theme = UNIT_THEME[u.unitType] || UNIT_THEME.GROUP;
                        const Icon = theme.icon;
                        const active = selectedUnitId === u.id;
                        const count = activities.filter(a => a.unitId === u.id).length;
                        return (
                            <button
                                key={u.id}
                                onClick={() => selectUnit(u.id)}
                                className={`group flex items-center gap-2.5 md:gap-3 px-4 py-2.5 md:px-5 md:py-3 rounded-2xl border-2 text-sm font-bold transition-all hover:-translate-y-0.5 active:scale-95 ${
                                    active
                                        ? `${theme.bg} shadow-lg`
                                        : `${theme.softBg} ${theme.text}`
                                }`}
                            >
                                <div className={`w-8 h-8 md:w-9 md:h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                                    active ? "bg-white/20" : "bg-white/60"
                                }`}>
                                    <Icon className={`w-4 h-4 ${active ? "text-white" : ""}`} />
                                </div>
                                <div className="text-left">
                                    <div className="leading-tight">{u.name}</div>
                                    <div className={`text-xs font-medium ${active ? "text-white/80" : "opacity-70"}`}>
                                        {count} {count === 1 ? "activity" : "activities"}
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Selected unit details panel */}
            {selectedUnit && (
                <UnitDetails unit={selectedUnit} onClear={() => selectUnit("ALL")} />
            )}

            {/* Upcoming / Past toggle */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                <div className="inline-flex items-center bg-muted/60 backdrop-blur rounded-full p-1 border">
                    <button
                        onClick={() => setView("upcoming")}
                        className={`flex items-center gap-1.5 md:gap-2 px-4 md:px-5 py-2 rounded-full text-sm font-bold transition-all ${
                            view === "upcoming"
                                ? "bg-primary text-white shadow-md shadow-primary/30"
                                : "text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        <Sparkles className="w-4 h-4" />
                        Upcoming ({selectedUnitId === "ALL" ? upcomingAll.length : upcomingAll.filter(a => a.unitId === selectedUnitId).length})
                    </button>
                    <button
                        onClick={() => setView("past")}
                        className={`flex items-center gap-1.5 md:gap-2 px-4 md:px-5 py-2 rounded-full text-sm font-bold transition-all ${
                            view === "past"
                                ? "bg-foreground text-background shadow-md"
                                : "text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        <History className="w-4 h-4" />
                        Past ({selectedUnitId === "ALL" ? pastAll.length : pastAll.filter(a => a.unitId === selectedUnitId).length})
                    </button>
                </div>
            </div>

            {/* Grid */}
            {filtered.length === 0 ? (
                <div className="text-center py-24 bg-muted/20 rounded-3xl border-2 border-dashed">
                    <Tent className="w-14 h-14 text-muted-foreground/30 mx-auto mb-4" />
                    <p className="text-muted-foreground font-medium">
                        {view === "upcoming" ? "No upcoming activities yet. Check back soon!" : "No past activities to show."}
                    </p>
                </div>
            ) : (
                <div className="grid gap-6 md:gap-8 md:grid-cols-2 lg:grid-cols-3">
                    {filtered.map((act) => {
                        const unit = units.find(u => u.id === act.unitId);
                        const theme = UNIT_THEME[unit?.unitType || "GROUP"] || UNIT_THEME.GROUP;
                        return (
                            <ActivityCard key={act.id} act={act} isUpcoming={view === "upcoming"} chipClass={theme.chip} />
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function UnitDetails({ unit, onClear }: { unit: Unit; onClear: () => void }) {
    const theme = UNIT_THEME[unit.unitType] || UNIT_THEME.GROUP;
    const Icon = theme.icon;

    return (
        <div className={`relative rounded-3xl border-2 ${theme.border} bg-card overflow-hidden mb-8 animate-fade-in`}>
            <button
                onClick={onClear}
                className="absolute top-3 right-3 w-9 h-9 rounded-full bg-background/80 hover:bg-background border flex items-center justify-center transition-colors z-10 active:scale-95"
                title="Clear filter"
                aria-label="Clear filter"
            >
                <X className="w-4 h-4" />
            </button>
            <div className="grid md:grid-cols-3 gap-0">
                {/* Banner */}
                <div className={`${theme.bg} p-5 md:p-8 flex flex-row md:flex-col items-center md:items-start gap-4 md:gap-0 md:justify-between md:col-span-1`}>
                    <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center shrink-0">
                        <Icon className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl md:text-2xl font-black leading-tight">{unit.name}</h3>
                </div>

                {/* Description + contacts */}
                <div className="p-5 md:p-8 md:col-span-2 space-y-4 md:space-y-5">
                    {unit.description && (
                        <p className="text-sm text-muted-foreground leading-relaxed">{unit.description}</p>
                    )}

                    {unit.contacts.length > 0 && (
                        <div>
                            <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Responsible people</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 md:gap-3">
                                {unit.contacts.map((c, i) => (
                                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl border bg-muted/20">
                                        <div className={`w-10 h-10 rounded-full ${theme.chip} flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden`}>
                                            {c.photoUrl ? (
                                                /* eslint-disable-next-line @next/next/no-img-element */
                                                <img src={c.photoUrl} alt={c.firstName} className="w-full h-full object-cover" />
                                            ) : (
                                                `${c.firstName[0]}${c.lastName[0]}`.toUpperCase()
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="font-semibold text-sm truncate">{c.firstName} {c.lastName}</div>
                                            {c.role && <div className={`text-xs font-bold ${theme.text}`}>{c.role}</div>}
                                            {c.phone && (
                                                <a href={`tel:${c.phone}`} className="text-xs text-muted-foreground hover:text-foreground active:text-primary inline-flex items-center gap-1 min-h-[28px]">
                                                    <Phone className="w-3 h-3 shrink-0" /> {c.phone}
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function ActivityCard({ act, isUpcoming, chipClass }: { act: Activity; isUpcoming: boolean; chipClass?: string }) {
    const [expanded, setExpanded] = useState(false);
    const hasDetails = !!(act.whatToBring || act.pickupLocation || act.dropoffLocation || act.locationUrl || act.pickupLocationUrl || act.dropoffLocationUrl);
    const bringList = act.whatToBring?.split("\n").map(l => l.trim()).filter(Boolean) ?? [];

    return (
        <div className="group flex flex-col bg-card border rounded-3xl overflow-hidden shadow-sm hover:shadow-2xl hover:shadow-primary/10 transition-all duration-500 hover:-translate-y-1.5">
            <div className="aspect-[16/10] bg-muted relative overflow-hidden">
                {act.imageUrl ? (
                    <Image
                        src={act.imageUrl}
                        alt={act.title}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover group-hover:scale-110 transition-transform duration-700"
                    />
                ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                        <Tent className="h-16 w-16 text-primary/20" />
                    </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="absolute top-3 left-3 flex gap-2 flex-wrap">
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold shadow-lg ${chipClass || "bg-primary text-white"}`}>{act.unitName}</span>
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-white/95 text-foreground shadow-lg backdrop-blur-sm">
                        {TYPE_LABELS[act.activityType] || act.activityType}
                    </span>
                </div>
                {isUpcoming && (
                    <div className="absolute top-3 right-3">
                        <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500 text-white shadow-lg">
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                            Upcoming
                        </span>
                    </div>
                )}
            </div>
            <div className="p-6 flex-1 flex flex-col">
                <div className="flex items-center gap-2 text-xs font-semibold text-primary mb-3">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{formatDate(act.startDate)}{act.endDate ? ` - ${formatDate(act.endDate)}` : ""}</span>
                </div>
                <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">{act.title}</h3>
                <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mb-4">
                    {act.location && (
                        act.locationUrl ? (
                            <a href={act.locationUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-primary transition-colors">
                                <MapPin className="w-3.5 h-3.5" />{act.location}
                                <ExternalLink className="w-3 h-3 opacity-60" />
                            </a>
                        ) : (
                            <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{act.location}</span>
                        )
                    )}
                    {(act.dropoffTime || act.pickupTime) && (
                        <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {act.dropoffTime || ""}{act.dropoffTime && act.pickupTime ? ` - ${act.pickupTime}` : act.pickupTime || ""}
                        </span>
                    )}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">{act.description}</p>

                {hasDetails && (
                    <button
                        onClick={() => setExpanded(!expanded)}
                        className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary/80 transition-colors w-fit"
                    >
                        {expanded ? "Hide details" : "Show details"}
                        <ChevronDown className={`w-4 h-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
                    </button>
                )}

                {expanded && hasDetails && (
                    <div className="mt-4 space-y-4 border-t pt-4">
                        {(act.dropoffLocation || act.pickupLocation) && (
                            <div className="space-y-2">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                    <MapPin className="w-3.5 h-3.5" /> Pickup & Dropoff
                                </h4>
                                {act.dropoffLocation && (
                                    <LocationLine
                                        label={`Dropoff${act.dropoffTime ? ` (${act.dropoffTime})` : ""}`}
                                        text={act.dropoffLocation}
                                        url={act.dropoffLocationUrl}
                                    />
                                )}
                                {act.pickupLocation && (
                                    <LocationLine
                                        label={`Pickup${act.pickupTime ? ` (${act.pickupTime})` : ""}`}
                                        text={act.pickupLocation}
                                        url={act.pickupLocationUrl}
                                    />
                                )}
                            </div>
                        )}
                        {bringList.length > 0 && (
                            <div className="space-y-2">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                    <Backpack className="w-3.5 h-3.5" /> What to bring
                                </h4>
                                <ul className="text-sm text-foreground space-y-1">
                                    {bringList.map((item, i) => (
                                        <li key={i} className="flex items-start gap-2">
                                            <span className="text-primary mt-0.5">•</span>
                                            <span>{item.replace(/^[-•*]\s*/, "")}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

function LocationLine({ label, text, url }: { label: string; text: string; url: string | null }) {
    return (
        <div className="text-sm flex items-start gap-2">
            <span className="font-semibold text-foreground min-w-[100px]">{label}:</span>
            {url ? (
                <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                    {text}
                    <ExternalLink className="w-3 h-3 opacity-60" />
                </a>
            ) : (
                <span className="text-muted-foreground">{text}</span>
            )}
        </div>
    );
}
