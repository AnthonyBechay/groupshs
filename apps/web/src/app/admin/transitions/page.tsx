"use client";

import { useState } from "react";
import { ArrowUpRight, Shuffle, LogOut } from "lucide-react";
import { MoveUpTab } from "./move-up-tab";
import { MaitriseTab } from "./maitrise-tab";
import { DeparturesTab } from "./departures-tab";

type Tab = "moveup" | "maitrise" | "departures";

const TABS: { key: Tab; label: string; hint: string; icon: typeof ArrowUpRight }[] = [
    { key: "moveup", label: "Move Up", hint: "Age-based branch promotion", icon: ArrowUpRight },
    { key: "maitrise", label: "Maîtrise", hint: "Leaders move between units", icon: Shuffle },
    { key: "departures", label: "Leaving", hint: "Leave the group → Ancien", icon: LogOut },
];

export default function AdminTransitionsPage() {
    const [tab, setTab] = useState<Tab>("moveup");

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Transitions</h1>
                <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
                    Move members between branches as they grow, reassign the maîtrise, and record members
                    who leave the group. Every change is logged and can be undone.
                </p>
            </div>

            {/* Tabs */}
            <div className="flex flex-wrap gap-2 border-b pb-3">
                {TABS.map(t => {
                    const Icon = t.icon;
                    const active = tab === t.key;
                    return (
                        <button
                            key={t.key}
                            onClick={() => setTab(t.key)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                                active
                                    ? "bg-primary text-primary-foreground border-primary"
                                    : "bg-background hover:bg-muted"
                            }`}
                        >
                            <Icon className="w-4 h-4 shrink-0" />
                            <span className="text-left">
                                {t.label}
                                <span className={`block text-[10px] font-normal ${active ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                                    {t.hint}
                                </span>
                            </span>
                        </button>
                    );
                })}
            </div>

            {tab === "moveup" && <MoveUpTab />}
            {tab === "maitrise" && <MaitriseTab />}
            {tab === "departures" && <DeparturesTab />}
        </div>
    );
}
