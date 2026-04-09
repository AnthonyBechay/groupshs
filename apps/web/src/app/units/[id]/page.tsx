import { Navbar } from "@/components/navbar";
import { prisma } from "@/db";
import { notFound } from "next/navigation";
import { Calendar, MapPin, Clock, Tent, Phone, User, ArrowRight, Compass, TreePine, Mountain, Shield } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import Image from "next/image";

export const dynamic = "force-dynamic";

const UNIT_META: Record<string, { icon: typeof Tent; ageRange: string; color: string; gradient: string }> = {
    LOUVETEAUX: { icon: TreePine, ageRange: "8-12 ans", color: "text-emerald-600", gradient: "from-emerald-700 via-emerald-800 to-emerald-900" },
    ECLAIREURS: { icon: Compass, ageRange: "12-17 ans", color: "text-blue-600", gradient: "from-blue-700 via-blue-800 to-blue-900" },
    ROUTIERS: { icon: Mountain, ageRange: "17+ ans", color: "text-amber-600", gradient: "from-amber-700 via-amber-800 to-amber-900" },
    GROUP: { icon: Shield, ageRange: "Leadership", color: "text-primary", gradient: "from-primary via-primary to-emerald-800" },
};

const TYPE_LABELS: Record<string, string> = {
    CAMP: "Camp", JOURNEE: "Journee", TEMPS: "Temps", MARCHE: "Marche", OTHER: "Autre",
};

function formatDate(d: Date) {
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default async function UnitPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    const unit = await prisma.unit.findUnique({
        where: { id },
        include: {
            activities: { orderBy: { startDate: "desc" } },
        },
    });

    if (!unit) notFound();

    const meta = UNIT_META[unit.unitType] || UNIT_META.LOUVETEAUX;
    const Icon = meta.icon;

    const now = new Date();
    const upcoming = unit.activities.filter(a => a.isUpcoming || new Date(a.startDate) >= now);
    const past = unit.activities.filter(a => !a.isUpcoming && new Date(a.startDate) < now);

    return (
        <div className="min-h-screen flex flex-col font-sans">
            <Navbar />
            <main className="flex-1">
                {/* Hero */}
                <section className={`relative overflow-hidden bg-gradient-to-br ${meta.gradient} text-white py-20 md:py-28`}>
                    <div className="absolute inset-0 opacity-10">
                        <div className="absolute top-10 right-10 w-72 h-72 rounded-full bg-white/20 blur-3xl" />
                    </div>
                    <div className="container mx-auto px-4 relative z-10 text-center">
                        <div className="mx-auto w-20 h-20 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center mb-6">
                            <Icon className="w-10 h-10" />
                        </div>
                        <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-4">{unit.name}</h1>
                        <p className="text-lg text-white/80 mb-2">{meta.ageRange}</p>
                        {unit.description && (
                            <p className="text-white/70 max-w-xl mx-auto mt-4">{unit.description}</p>
                        )}
                    </div>
                    <div className="absolute bottom-0 left-0 right-0">
                        <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
                            <path d="M0,40 C360,80 720,0 1080,40 C1260,60 1380,50 1440,40 L1440,80 L0,80 Z" className="fill-background" />
                        </svg>
                    </div>
                </section>

                {/* Contact info */}
                {(unit.contactName || unit.contactPhone) && (
                    <section className="py-8 border-b">
                        <div className="container mx-auto px-4">
                            <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
                                {unit.contactName && (
                                    <div className="flex items-center gap-2">
                                        <User className="w-4 h-4 text-primary" />
                                        <span className="font-medium">{unit.contactName}</span>
                                    </div>
                                )}
                                {unit.contactPhone && (
                                    <div className="flex items-center gap-2">
                                        <Phone className="w-4 h-4 text-primary" />
                                        <a href={`tel:${unit.contactPhone}`} className="font-medium hover:text-primary transition-colors">{unit.contactPhone}</a>
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>
                )}

                {/* Upcoming Activities */}
                <section className="py-16 container mx-auto px-4">
                    <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-8">
                        Upcoming Activities
                    </h2>
                    {upcoming.length === 0 ? (
                        <div className="text-center py-12 bg-muted/30 rounded-2xl border border-dashed">
                            <Tent className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                            <p className="text-muted-foreground">No upcoming activities scheduled</p>
                        </div>
                    ) : (
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {upcoming.map(act => (
                                <ActivityCard key={act.id} act={act} />
                            ))}
                        </div>
                    )}
                </section>

                {/* Past Activities */}
                {past.length > 0 && (
                    <section className="py-16 bg-muted/30 border-t">
                        <div className="container mx-auto px-4">
                            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-8">
                                Past Activities
                            </h2>
                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {past.map(act => (
                                    <ActivityCard key={act.id} act={act} />
                                ))}
                            </div>
                        </div>
                    </section>
                )}

                {/* CTA */}
                <section className="py-16 text-center">
                    <div className="container mx-auto px-4">
                        <h2 className="text-2xl font-bold mb-4">Want to join {unit.name}?</h2>
                        <p className="text-muted-foreground mb-6">Fill out the recruitment form and we&apos;ll get in touch!</p>
                        <Link href="/join">
                            <Button size="lg" className="gap-2 font-bold">
                                Join Now <ArrowRight className="w-4 h-4" />
                            </Button>
                        </Link>
                    </div>
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

function ActivityCard({ act }: { act: { id: string; title: string; description: string; activityType: string; startDate: Date; endDate: Date | null; pickupTime: string | null; dropoffTime: string | null; location: string | null; imageUrl: string | null; isUpcoming: boolean } }) {
    return (
        <div className="group flex flex-col bg-card border rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 hover:-translate-y-1">
            <div className="aspect-[16/10] bg-muted relative overflow-hidden">
                {act.imageUrl ? (
                    <img src={act.imageUrl} alt={act.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                        <Tent className="h-12 w-12 text-primary/20" />
                    </div>
                )}
                <div className="absolute top-3 left-3">
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-white/90 text-foreground shadow-lg backdrop-blur-sm">{TYPE_LABELS[act.activityType] || act.activityType}</span>
                </div>
            </div>
            <div className="p-5 flex-1 flex flex-col">
                <div className="flex items-center gap-2 text-xs font-semibold text-primary mb-2">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{formatDate(act.startDate)}{act.endDate ? ` - ${formatDate(act.endDate)}` : ""}</span>
                </div>
                <h3 className="text-lg font-bold mb-2 group-hover:text-primary transition-colors">{act.title}</h3>
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mb-3">
                    {act.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{act.location}</span>}
                    {(act.dropoffTime || act.pickupTime) && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{act.dropoffTime || ""}{act.dropoffTime && act.pickupTime ? ` - ${act.pickupTime}` : act.pickupTime || ""}</span>}
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2 flex-1">{act.description}</p>
                {act.isUpcoming && (
                    <span className="inline-block mt-3 px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary w-fit">Upcoming</span>
                )}
            </div>
        </div>
    );
}
