import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { prisma } from "@/db";
import { notFound } from "next/navigation";
import { Calendar, MapPin, Clock, Tent, Phone, User, ArrowRight, Compass, TreePine, Mountain, Shield } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";

// Re-render at most every 5 minutes.
export const revalidate = 300;

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

    const [unit, socialLinks, settings] = await Promise.all([
        prisma.unit.findUnique({
            where: { id },
            include: {
                activities: {
                    where: { hidden: false },
                    orderBy: { startDate: "desc" },
                },
                contacts: {
                    include: {
                        member: { select: { firstName: true, lastName: true, phone: true, role: true, photoUrl: true } },
                    },
                    orderBy: { sortOrder: "asc" },
                },
            },
        }),
        prisma.socialLink.findMany({ orderBy: { sortOrder: "asc" } }),
        prisma.siteSettings.findUnique({ where: { id: "default" } }),
    ]);
    const siteLogoUrl = settings?.logoUrl;

    if (!unit) notFound();

    const meta = UNIT_META[unit.unitType] || UNIT_META.LOUVETEAUX;
    const Icon = meta.icon;

    const now = new Date();
    const upcoming = unit.activities.filter(a => {
        const end = a.endDate ? new Date(a.endDate) : new Date(a.startDate);
        return end >= now;
    });
    const past = unit.activities.filter(a => {
        const end = a.endDate ? new Date(a.endDate) : new Date(a.startDate);
        return end < now;
    });

    return (
        <div className="min-h-screen flex flex-col font-sans">
            <Navbar logoUrl={siteLogoUrl} />
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
                {(unit.contacts.length > 0 || unit.contactName || unit.contactPhone) && (
                    <section className="py-8 md:py-10 border-b bg-muted/20">
                        <div className="container mx-auto px-4">
                            {unit.contacts.length > 0 ? (
                                <div className="max-w-3xl mx-auto">
                                    <h2 className="text-center text-sm font-bold uppercase tracking-widest text-primary mb-5 md:mb-6">Responsible people</h2>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                                        {unit.contacts.map(c => (
                                            <div key={c.member.firstName + c.member.lastName} className="flex items-center gap-3 p-3.5 md:p-4 rounded-2xl border bg-card shadow-sm">
                                                <div className="w-11 h-11 md:w-12 md:h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden">
                                                    {c.member.photoUrl ? (
                                                        /* eslint-disable-next-line @next/next/no-img-element */
                                                        <img src={c.member.photoUrl} alt={c.member.firstName} className="w-full h-full object-cover" />
                                                    ) : (
                                                        `${c.member.firstName[0]}${c.member.lastName[0]}`.toUpperCase()
                                                    )}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="font-semibold text-sm truncate">{c.member.firstName} {c.member.lastName}</div>
                                                    {c.member.role && <div className="text-xs text-primary font-bold">{c.member.role}</div>}
                                                    {c.member.phone && (
                                                        <a href={`tel:${c.member.phone}`} className="text-xs text-muted-foreground hover:text-primary active:text-primary inline-flex items-center gap-1 mt-0.5 min-h-[28px]">
                                                            <Phone className="w-3 h-3 shrink-0" /> {c.member.phone}
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6 text-sm">
                                    {unit.contactName && (
                                        <div className="flex items-center gap-2">
                                            <User className="w-4 h-4 text-primary shrink-0" />
                                            <span className="font-medium">{unit.contactName}</span>
                                        </div>
                                    )}
                                    {unit.contactPhone && (
                                        <div className="flex items-center gap-2">
                                            <Phone className="w-4 h-4 text-primary shrink-0" />
                                            <a href={`tel:${unit.contactPhone}`} className="font-medium hover:text-primary transition-colors active:text-primary">{unit.contactPhone}</a>
                                        </div>
                                    )}
                                </div>
                            )}
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

            <Footer
                socialLinks={socialLinks}
                logoUrl={siteLogoUrl}
                description={settings?.footerDescription}
                address={settings?.footerAddress}
                phone={settings?.footerPhone}
                email={settings?.footerEmail}
            />
        </div>
    );
}

function ActivityCard({ act }: { act: { id: string; title: string; description: string; activityType: string; startDate: Date; endDate: Date | null; pickupTime: string | null; dropoffTime: string | null; location: string | null; imageUrl: string | null; isUpcoming: boolean } }) {
    return (
        <div className="group flex flex-col bg-card border rounded-3xl overflow-hidden shadow-sm hover:shadow-2xl hover:shadow-primary/10 transition-all duration-500 hover:-translate-y-1.5">
            <div className="aspect-[16/10] bg-muted relative overflow-hidden">
                {act.imageUrl ? (
                    <Image
                        src={act.imageUrl}
                        alt={act.title}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        loading="lazy"
                        className="object-cover group-hover:scale-110 transition-transform duration-700"
                    />
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
