import { Navbar } from "@/components/navbar";
import { Calendar, MapPin, Tent, Clock, Compass } from "lucide-react";
import { Metadata } from "next";
import Image from "next/image";
import { prisma } from "@/db";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "Activities - Group SHS",
    description: "Upcoming camps, meetings, and events for Scouts du Liban at Sagesse High School.",
};

const TYPE_LABELS: Record<string, string> = {
    CAMP: "Camp", JOURNEE: "Journée", TEMPS: "Temps", MARCHE: "Marche", OTHER: "Autre",
};

function formatDate(d: Date) {
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default async function ActivitiesPage() {
    const activities = await prisma.activity.findMany({
        include: { unit: { select: { name: true } } },
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
                            <span className="text-white/90">Camps, Marches, Journées & More</span>
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

                {/* Activities Grid */}
                <section className="py-16 md:py-24 container mx-auto px-4">
                    {activities.length === 0 ? (
                        <div className="text-center py-20 bg-muted/30 rounded-2xl border border-dashed">
                            <Tent className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                            <p className="text-muted-foreground">No activities yet. Check back soon!</p>
                        </div>
                    ) : (
                        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                            {activities.map((act) => (
                                <div key={act.id} className="group flex flex-col bg-card border rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 hover:-translate-y-1">
                                    <div className="aspect-[16/10] bg-muted relative overflow-hidden">
                                        {act.imageUrl ? (
                                            <Image src={act.imageUrl} alt={act.title} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                                        ) : (
                                            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                                                <Tent className="h-16 w-16 text-primary/20" />
                                            </div>
                                        )}
                                        <div className="absolute top-3 left-3 flex gap-2">
                                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-primary text-white shadow-lg">{act.unit.name}</span>
                                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-white/90 text-foreground shadow-lg backdrop-blur-sm">{TYPE_LABELS[act.activityType] || act.activityType}</span>
                                        </div>
                                    </div>
                                    <div className="p-6 flex-1 flex flex-col">
                                        <div className="flex items-center gap-2 text-xs font-semibold text-primary mb-3">
                                            <Calendar className="w-3.5 h-3.5" />
                                            <span>{formatDate(act.startDate)}{act.endDate ? ` — ${formatDate(act.endDate)}` : ""}</span>
                                        </div>
                                        <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">{act.title}</h3>
                                        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mb-4">
                                            {act.location && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{act.location}</span>}
                                            {act.pickupTime && (
                                                <span className="flex items-center gap-1">
                                                    <Clock className="w-3.5 h-3.5" />
                                                    {act.pickupTime}{act.dropoffTime ? ` — ${act.dropoffTime}` : ""}
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
                </section>
            </main>

            <footer className="bg-card border-t py-12">
                <div className="container mx-auto px-4">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
                        <p>&copy; {new Date().getFullYear()} Group SHS &mdash; Les Scouts du Liban. All rights reserved.</p>
                        <div className="flex items-center gap-2">
                            <span>Made with &#10084;&#65039; by</span>
                            <a href="https://bechai.ai" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 font-semibold text-foreground hover:text-primary transition-colors">
                                <Image src="/bechai-logo.png" width={16} height={16} alt="Bechai.ai Logo" className="rounded-sm w-4 h-4 object-contain" />
                                bechai.ai
                            </a>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
