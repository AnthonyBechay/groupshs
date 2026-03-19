import { Navbar } from "@/components/navbar";
import { Calendar, MapPin, Tent, Clock } from "lucide-react";
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
                <section className="bg-muted/30 py-12 md:py-24">
                    <div className="container mx-auto px-4 text-center">
                        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-6">
                            Our <span className="text-primary">Activities</span>
                        </h1>
                        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
                            From weekly meetings to annual camps, discover what we&apos;re up to.
                        </p>
                    </div>
                </section>

                <section className="py-12 md:py-24 container mx-auto px-4">
                    {activities.length === 0 ? (
                        <p className="text-center text-muted-foreground py-12">No activities yet. Check back soon!</p>
                    ) : (
                        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                            {activities.map((act) => (
                                <div key={act.id} className="group flex flex-col bg-card border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all">
                                    <div className="h-48 bg-muted relative overflow-hidden">
                                        {act.imageUrl ? (
                                            <Image src={act.imageUrl} alt={act.title} fill className="object-cover" unoptimized />
                                        ) : (
                                            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/30"><Tent className="h-12 w-12" /></div>
                                        )}
                                        <div className="absolute top-3 left-3 flex gap-2">
                                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-primary text-primary-foreground">{act.unit.name}</span>
                                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-card/90 text-foreground backdrop-blur-sm">{TYPE_LABELS[act.activityType] || act.activityType}</span>
                                        </div>
                                    </div>
                                    <div className="p-6 flex-1 flex flex-col">
                                        <div className="flex items-center gap-2 text-xs font-medium text-primary mb-3">
                                            <Calendar className="w-3 h-3" />
                                            <span>{formatDate(act.startDate)}{act.endDate ? ` - ${formatDate(act.endDate)}` : ""}</span>
                                        </div>
                                        <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">{act.title}</h3>
                                        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mb-4">
                                            {act.location && <span className="flex items-center gap-1"><MapPin className="w-4 h-4" />{act.location}</span>}
                                            {act.pickupTime && (
                                                <span className="flex items-center gap-1">
                                                    <Clock className="w-4 h-4" />
                                                    Pickup: {act.pickupTime}{act.pickupLocation ? ` @ ${act.pickupLocation}` : ""}
                                                </span>
                                            )}
                                            {act.dropoffTime && (
                                                <span className="flex items-center gap-1">
                                                    <Clock className="w-4 h-4" />
                                                    Dropoff: {act.dropoffTime}{act.dropoffLocation ? ` @ ${act.dropoffLocation}` : ""}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-muted-foreground mb-6 flex-1">{act.description}</p>
                                        {act.isUpcoming && (
                                            <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary w-fit">Upcoming</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </main>
            <footer className="bg-background border-t py-12">
                <div className="container mx-auto px-4">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
                        <p>&copy; {new Date().getFullYear()} Group SHS. All rights reserved.</p>
                        <div className="flex items-center gap-2">
                            <span>Made with &#10084;&#65039; by</span>
                            <a href="https://bechai.ai" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 font-medium text-foreground hover:text-primary transition-colors bg-muted px-2 py-1 rounded-md">
                                <Image src="/bechai-logo.png" width={16} height={16} alt="Bechai.ai Logo" className="rounded-sm w-4 h-4 object-contain" unoptimized />bechai.ai
                            </a>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
