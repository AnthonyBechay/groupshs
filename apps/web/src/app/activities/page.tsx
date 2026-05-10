import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Tent, Compass, TreePine, Mountain, Sparkles } from "lucide-react";
import { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/db";
import { UnitTabs } from "./unit-tabs";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "Activities - Group SHS",
    description: "Upcoming camps, meetings, and events for Scouts du Liban at Sagesse High School.",
};

export default async function ActivitiesPage() {
    const [units, allActivities, socialLinks] = await Promise.all([
        prisma.unit.findMany({
            include: { activities: true },
            orderBy: { name: "asc" },
        }),
        prisma.activity.findMany({
            include: { unit: { select: { name: true, id: true } } },
            orderBy: { startDate: "desc" },
        }),
        prisma.socialLink.findMany({ orderBy: { sortOrder: "asc" } }),
    ]);

    const now = new Date();
    const upcomingCount = allActivities.filter(a => {
        const end = a.endDate ? new Date(a.endDate) : new Date(a.startDate);
        return end >= now || a.isUpcoming;
    }).length;

    return (
        <div className="min-h-screen flex flex-col font-sans">
            <Navbar />
            <main className="flex-1">
                {/* Hero */}
                <section className="relative overflow-hidden bg-gradient-to-br from-primary via-primary to-emerald-800 text-white py-20 md:py-32">
                    <div className="absolute inset-0 opacity-20">
                        <div className="absolute top-10 right-10 w-96 h-96 rounded-full bg-scout-gold/30 blur-3xl animate-pulse" />
                        <div className="absolute bottom-10 left-10 w-72 h-72 rounded-full bg-emerald-300/30 blur-3xl animate-pulse [animation-delay:1.5s]" />
                    </div>
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDE0YTIgMiAwIDEgMSAwLTQgMiAyIDAgMCAxIDAgNHptMCAyOGEyIDIgMCAxIDEgMC00IDIgMiAwIDAgMSAwIDR6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-50" />
                    <div className="container mx-auto px-4 relative z-10 text-center">
                        <div className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm backdrop-blur-xl mb-6">
                            <Compass className="w-4 h-4 mr-2 text-scout-gold" />
                            <span className="text-white/90">Camps, Marches, Journees & More</span>
                        </div>
                        <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-6 leading-[1.05]">
                            Our <span className="bg-gradient-to-r from-scout-gold via-yellow-300 to-scout-gold bg-clip-text text-transparent">Activities</span>
                        </h1>
                        <p className="text-lg md:text-xl text-white/80 max-w-xl mx-auto">
                            From weekly meetings to annual camps, discover what we&apos;re up to.
                        </p>
                        <div className="mt-10 inline-flex items-center gap-3 rounded-full bg-white/10 border border-white/20 backdrop-blur-xl px-5 py-2 text-sm font-semibold">
                            <Sparkles className="w-4 h-4 text-scout-gold" />
                            <span>{upcomingCount} upcoming {upcomingCount === 1 ? "activity" : "activities"}</span>
                        </div>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0">
                        <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
                            <path d="M0,40 C360,80 720,0 1080,40 C1260,60 1380,50 1440,40 L1440,80 L0,80 Z" className="fill-background" />
                        </svg>
                    </div>
                </section>

                {/* Unit Cards */}
                <section className="py-14 border-b bg-gradient-to-b from-background to-muted/20">
                    <div className="container mx-auto px-4">
                        <div className="text-center mb-8">
                            <span className="inline-block text-sm font-bold tracking-widest uppercase text-primary mb-2">Filter</span>
                            <h2 className="text-2xl font-extrabold">Browse by Unit</h2>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
                            {units.map(unit => {
                                const iconMap: Record<string, typeof Tent> = { LOUVETEAUX: TreePine, ECLAIREURS: Compass, ROUTIERS: Mountain };
                                const Icon = iconMap[unit.unitType] || Tent;
                                return (
                                    <Link key={unit.id} href={`/units/${unit.id}`} className="group">
                                        <div className="flex items-center gap-3 p-4 rounded-2xl border bg-card hover:bg-primary hover:text-white hover:border-primary hover:shadow-lg hover:shadow-primary/20 transition-all duration-300 hover:-translate-y-0.5">
                                            <div className="w-11 h-11 rounded-xl bg-primary/10 group-hover:bg-white/10 flex items-center justify-center shrink-0 transition-colors">
                                                <Icon className="w-5 h-5 text-primary group-hover:text-white transition-colors" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="font-bold text-sm truncate">{unit.name}</div>
                                                <div className="text-xs text-muted-foreground group-hover:text-white/80 transition-colors">{unit.activities.length} activities</div>
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                </section>

                {/* Activities */}
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

            <Footer socialLinks={socialLinks} />
        </div>
    );
}
