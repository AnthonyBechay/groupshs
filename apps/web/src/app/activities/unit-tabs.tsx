"use client";

import { useState } from "react";
import { Calendar, MapPin, Clock, Tent } from "lucide-react";

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

export function UnitTabs({ units, activities }: { units: Unit[]; activities: Activity[] }) {
    const [selectedUnit, setSelectedUnit] = useState<string>("ALL");

    const filtered = selectedUnit === "ALL"
        ? activities
        : activities.filter(a => a.unitId === selectedUnit);

    return (
        <div>
            {/* Tab bar */}
            <div className="flex flex-wrap gap-2 mb-10">
                <button
                    onClick={() => setSelectedUnit("ALL")}
                    className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${selectedUnit === "ALL" ? "bg-primary text-white shadow-lg shadow-primary/20" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                >
                    All ({activities.length})
                </button>
                {units.map(u => {
                    const count = activities.filter(a => a.unitId === u.id).length;
                    return (
                        <button
                            key={u.id}
                            onClick={() => setSelectedUnit(u.id)}
                            className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${selectedUnit === u.id ? "bg-primary text-white shadow-lg shadow-primary/20" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                        >
                            {u.name} ({count})
                        </button>
                    );
                })}
            </div>

            {/* Grid */}
            {filtered.length === 0 ? (
                <div className="text-center py-20 bg-muted/30 rounded-2xl border border-dashed">
                    <Tent className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                    <p className="text-muted-foreground">No activities found</p>
                </div>
            ) : (
                <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                    {filtered.map((act) => (
                        <div key={act.id} className="group flex flex-col bg-card border rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 hover:-translate-y-1">
                            <div className="aspect-[16/10] bg-muted relative overflow-hidden">
                                {act.imageUrl ? (
                                    <img src={act.imageUrl} alt={act.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                ) : (
                                    <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                                        <Tent className="h-16 w-16 text-primary/20" />
                                    </div>
                                )}
                                <div className="absolute top-3 left-3 flex gap-2">
                                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-primary text-white shadow-lg">{act.unitName}</span>
                                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-white/90 text-foreground shadow-lg backdrop-blur-sm">{TYPE_LABELS[act.activityType] || act.activityType}</span>
                                </div>
                            </div>
                            <div className="p-6 flex-1 flex flex-col">
                                <div className="flex items-center gap-2 text-xs font-semibold text-primary mb-3">
                                    <Calendar className="w-3.5 h-3.5" />
                                    <span>{formatDate(act.startDate)}{act.endDate ? ` - ${formatDate(act.endDate)}` : ""}</span>
                                </div>
                                <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">{act.title}</h3>
                                <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mb-4">
                                    {act.location && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{act.location}</span>}
                                    {act.pickupTime && (
                                        <span className="flex items-center gap-1">
                                            <Clock className="w-3.5 h-3.5" />
                                            {act.pickupTime}{act.dropoffTime ? ` - ${act.dropoffTime}` : ""}
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm text-muted-foreground mb-4 flex-1">{act.description}</p>
                                {act.isUpcoming && (
                                    <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary w-fit">Upcoming</span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
