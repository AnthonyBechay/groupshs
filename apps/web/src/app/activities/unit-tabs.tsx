"use client";

import { useState, useMemo } from "react";
import { Calendar, MapPin, Clock, Tent, Sparkles, History } from "lucide-react";
import Image from "next/image";

const TYPE_LABELS: Record<string, string> = {
    CAMP: "Camp", JOURNEE: "Journee", TEMPS: "Temps", MARCHE: "Marche", OTHER: "Autre",
};

type Activity = {
    id: string;
    title: string;
    description: string;
    activityType: string;
    startDate: string;
    endDate: string | null;
    pickupTime: string | null;
    dropoffTime: string | null;
    location: string | null;
    imageUrl: string | null;
    isUpcoming: boolean;
    unitId: string;
    unitName: string;
};

type Unit = { id: string; name: string; unitType: string };

function formatDate(d: string) {
    return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function isActivityUpcoming(a: Activity, now: Date): boolean {
    const end = a.endDate ? new Date(a.endDate) : new Date(a.startDate);
    if (end >= now) return true;
    return a.isUpcoming;
}

export function UnitTabs({ units, activities }: { units: Unit[]; activities: Activity[] }) {
    const [selectedUnit, setSelectedUnit] = useState<string>("ALL");
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

    const list = view === "upcoming" ? upcomingAll : pastAll;
    const filtered = selectedUnit === "ALL" ? list : list.filter(a => a.unitId === selectedUnit);

    return (
        <div>
            {/* Status switch */}
            <div className="inline-flex items-center bg-muted/60 backdrop-blur rounded-full p-1 mb-6 border">
                <button
                    onClick={() => setView("upcoming")}
                    className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-bold transition-all ${
                        view === "upcoming"
                            ? "bg-primary text-white shadow-md shadow-primary/30"
                            : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                    <Sparkles className="w-4 h-4" />
                    Upcoming ({upcomingAll.length})
                </button>
                <button
                    onClick={() => setView("past")}
                    className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-bold transition-all ${
                        view === "past"
                            ? "bg-foreground text-background shadow-md"
                            : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                    <History className="w-4 h-4" />
                    Past ({pastAll.length})
                </button>
            </div>

            {/* Unit filter pills */}
            <div className="flex flex-wrap gap-2 mb-10">
                <button
                    onClick={() => setSelectedUnit("ALL")}
                    className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${selectedUnit === "ALL" ? "bg-primary text-white shadow-md shadow-primary/20" : "bg-muted/60 text-muted-foreground hover:bg-muted"}`}
                >
                    All ({list.length})
                </button>
                {units.map(u => {
                    const count = list.filter(a => a.unitId === u.id).length;
                    return (
                        <button
                            key={u.id}
                            onClick={() => setSelectedUnit(u.id)}
                            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${selectedUnit === u.id ? "bg-primary text-white shadow-md shadow-primary/20" : "bg-muted/60 text-muted-foreground hover:bg-muted"}`}
                        >
                            {u.name} ({count})
                        </button>
                    );
                })}
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
                    {filtered.map((act) => (
                        <ActivityCard key={act.id} act={act} isUpcoming={view === "upcoming"} />
                    ))}
                </div>
            )}
        </div>
    );
}

function ActivityCard({ act, isUpcoming }: { act: Activity; isUpcoming: boolean }) {
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
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-primary text-white shadow-lg">{act.unitName}</span>
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
                    {act.location && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{act.location}</span>}
                    {(act.dropoffTime || act.pickupTime) && (
                        <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {act.dropoffTime || ""}{act.dropoffTime && act.pickupTime ? ` - ${act.pickupTime}` : act.pickupTime || ""}
                        </span>
                    )}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">{act.description}</p>
            </div>
        </div>
    );
}
