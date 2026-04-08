import { Navbar } from "@/components/navbar";
import { Calendar, MapPin, Tent, Clock, Compass, TreePine, Mountain } from "lucide-react";
import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/db";
import { UnitTabs } from "./unit-tabs";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "Activities - Group SHS",
    description: "Upcoming camps, meetings, and events for Scouts du Liban at Sagesse High School.",
};

export default async function ActivitiesPage() {
    const units = await prisma.unit.findMany({
        include: {
            activities: {
                orderBy: { startDate: "desc" },
            },
        },
        orderBy: { name: "asc" },
    });

    const allActivities = await prisma.activity.findMany({
        include: { unit: { select: { name: true, id: true } } },
        orderBy: { startDate: "desc" },
    });

    return (
        <div className="min-h-screen flex flex-col font-sans">
            <Navbar />
            <main className="flex-1">
                {/* Hero */}
                <section className="relative overflow-hidden bg-gradient-to-br from-primary via-primary to-emerald-800 text-white py-20 md:py-28">
                    <div className="absolute inset-0 opacity-10">
                        <div className="absolute top-10 right-10 w-72 h-72 rounded-full bg-scout-gold/30 blur-3xl" />
                    </div>
                    <div className="container mx-auto px-4 relative z-10 text-center">
                        <div className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm backdrop-blur-xl mb-6">
                            <Compass className="w-4 h-4 mr-2 text-scout-gold" />
                            <span className="text-white/90">Camps, Marches, Journees & More</span>
                        </div>
                        <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-6">
                            Our <span className="bg-gradient-to-r from-scout-gold to-yellow-300 bg-clip-text text-transparent">Activities</span>
                        </h1>
                        <p className="text-lg text-white/80 max-w-xl mx-auto">
                            From weekly meetings to annual camps, discover what we&apos;re up to.
                        </p>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0">
                        <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
                            <path d="M0,40 C360,80 720,0 1080,40 C1260,60 1380,50 1440,40 L1440,80 L0,80 Z" className="fill-background" />
                        </svg>
                    </div>
                </section>

                {/* Unit Cards */}
                <section className="py-12 border-b">
                    <div className="container mx-auto px-4">
                        <h2 className="text-xl font-bold mb-6 text-center">Browse by Unit</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
                            {units.map(unit => {
                                const iconMap: Record<string, typeof Tent> = { LOUVETEAUX: TreePine, ECLAIREURS: Compass, ROUTIERS: Mountain };
                                const Icon = iconMap[unit.unitType] || Tent;
                                return (
                                    <Link key={unit.id} href={`/units/${unit.id}`} className="group">
                                        <div className="flex items-center gap-3 p-4 rounded-xl border bg-card hover:bg-primary hover:text-white hover:border-primary transition-all duration-200 shadow-sm">
                                            <Icon className="w-6 h-6 text-primary group-hover:text-white transition-colors shrink-0" />
                                            <div>
                                                <div className="font-bold text-sm">{unit.name}</div>
                                                <div className="text-xs text-muted-foreground group-hover:text-white/70 transition-colors">{unit.activities.length} activities</div>
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                </section>

                {/* Activities with filter tabs */}
                <section className="py-16 md:py-24 container mx-auto px-4">
                    <UnitTabs
                        units={units.map(u => ({ id: u.id, name: u.name, unitType: u.unitType }))}
                        activities={allActivities.map(a => ({
                            id: a.id,
                            title: a.title,
                            description: a.description,
                            activityType: a.activityType,
                            startDate: a.startDate.toISOString(),
                            endDate: a.endDate?.toISOString() || null,
                            pickupTime: a.pickupTime,
                            dropoffTime: a.dropoffTime,
                            location: a.location,
                            imageUrl: a.imageUrl,
                            isUpcoming: a.isUpcoming,
                            unitId: a.unitId,
                            unitName: a.unit.name,
                        }))}
                    />
                </section>
            </main>

            <footer className="bg-card border-t py-12">
                <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
                    <p>&copy; {new Date().getFullYear()} Group SHS - Les Scouts du Liban. All rights reserved.</p>
                    <div className="flex items-center gap-2">
                        <span>Made with &#10084;&#65039; by</span>
                        <a href="https://bechai.ai" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 font-semibold text-foreground hover:text-primary transition-colors">
                            <Image src="/bechai-logo.png" width={16} height={16} alt="Bechai.ai Logo" className="rounded-sm w-4 h-4 object-contain" />
                            bechai.ai
                        </a>
                    </div>
                </div>
            </footer>
        </div>
    );
}
