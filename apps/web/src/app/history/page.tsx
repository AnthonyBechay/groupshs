import { prisma } from "@/db";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { getSession, isAdmin } from "@/lib/auth";
import { Users, Trophy, Calendar, BookOpen, Clock, Lock, Zap, Target, ImageIcon, Star } from "lucide-react";
import { unstable_cache } from "next/cache";
import Image from "next/image";

// getSession() reads cookies → page is always dynamic (per-request).
// We cache the DB queries independently so the per-request work is trivial.

const getCachedSettings = unstable_cache(
    () => prisma.siteSettings.findUnique({ where: { id: "default" } }),
    ["site-settings"],
    { revalidate: 3600, tags: ["settings"] }
);

const getCachedSocialLinks = unstable_cache(
    () => prisma.socialLink.findMany({ orderBy: { sortOrder: "asc" } }),
    ["social-links"],
    { revalidate: 3600, tags: ["settings"] }
);

const getCachedMilestones = unstable_cache(
    () => prisma.historyMilestone
        .findMany({ orderBy: [{ sortOrder: "asc" }, { date: "asc" }] })
        .catch(() => []),
    ["history-milestones"],
    { revalidate: 3600, tags: ["history"] }
);

const getCachedAnciens = unstable_cache(
    () => prisma.ancien
        .findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] })
        .catch(() => []),
    ["history-anciens"],
    { revalidate: 3600, tags: ["history"] }
);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatMonthYear(iso: string | Date) {
    const d = new Date(iso);
    return d.toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export const metadata = {
    title: "Milestones | Group SHS",
    description: "The milestones and achievements of Group SHS, from founding to today.",
};

export default async function HistoryPage() {
    const [settings, socialLinks, milestones, anciens, session] = await Promise.all([
        getCachedSettings(),
        getCachedSocialLinks(),
        getCachedMilestones(),
        getCachedAnciens(),
        getSession(),
    ]);

    const adminUser = isAdmin(session);
    const foundedYear = settings?.groupFoundedYear ?? 2014;
    const currentYear = new Date().getFullYear();
    const yearsActive = currentYear - foundedYear;

    return (
        <div className="min-h-screen flex flex-col bg-background">
            <Navbar logoUrl={settings?.logoUrl} />

            <main className="flex-1">

                {/* ════════════════════ HERO ════════════════════ */}
                <section className="relative overflow-hidden border-b">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-background to-background" />
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-72 h-72 bg-primary/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4 pointer-events-none" />

                    <div className="relative container mx-auto px-4 py-16 md:py-24">
                        <div className="max-w-2xl">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest mb-5">
                                <Calendar className="w-3 h-3" /> Est. {foundedYear}
                            </div>
                            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-none mb-4">
                                Our<br />
                                <span className="text-primary">Milestones</span>
                            </h1>
                            <p className="text-base md:text-lg text-muted-foreground max-w-md leading-relaxed mb-8">
                                {yearsActive} years of scouting. Here is how we got here.
                            </p>
                            <div className="flex flex-wrap gap-2.5">
                                {[
                                    { icon: <Calendar className="w-3.5 h-3.5" />, value: String(foundedYear), label: "Founded" },
                                    { icon: <Trophy className="w-3.5 h-3.5" />, value: String(milestones.length), label: "Milestones" },
                                    { icon: <Clock className="w-3.5 h-3.5" />, value: `${yearsActive}`, label: "Years active" },
                                ].map((s) => (
                                    <div key={s.label} className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-card border shadow-sm">
                                        <span className="text-primary">{s.icon}</span>
                                        <div>
                                            <div className="text-lg font-extrabold leading-none">{s.value}</div>
                                            <div className="text-[11px] text-muted-foreground mt-0.5">{s.label}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {/* ════════════════════ TIMELINE ════════════════════ */}
                <section className="container mx-auto px-4 py-14 md:py-20">
                    <div className="max-w-4xl mx-auto">

                        {/* Founding strip */}
                        <div className="flex items-center gap-3 p-4 rounded-xl border bg-card mb-10 max-w-xs mx-auto md:mx-0">
                            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center shadow-sm shadow-primary/20 shrink-0">
                                <BookOpen className="w-4 h-4 text-white" />
                            </div>
                            <div>
                                <div className="text-[10px] font-bold text-primary uppercase tracking-widest">Founded</div>
                                <div className="font-bold text-sm">{foundedYear} — Group SHS</div>
                            </div>
                        </div>

                        {milestones.length === 0 ? (
                            <div className="text-center py-16 border border-dashed rounded-2xl bg-muted/20">
                                <Trophy className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
                                <p className="text-sm text-muted-foreground">No milestones yet.</p>
                            </div>
                        ) : (
                            <div className="relative">
                                {/* Center spine — desktop */}
                                <div className="hidden md:block absolute left-1/2 top-4 bottom-4 w-px bg-gradient-to-b from-primary/40 via-border/60 to-transparent -translate-x-1/2" />
                                {/* Left spine — mobile */}
                                <div className="md:hidden absolute left-3 top-4 bottom-4 w-px bg-gradient-to-b from-primary/40 via-border/60 to-transparent" />

                                <div className="space-y-6">
                                    {milestones.map((m, idx) =>
                                        m.type === "achievement"
                                            ? <AchievementCard key={m.id} m={m} side={idx % 2 === 0 ? "left" : "right"} />
                                            : <MilestoneCard key={m.id} m={m} side={idx % 2 === 0 ? "left" : "right"} />
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </section>

                {/* ════════════════════ ANCIENS (admin-only) ════════════════════ */}
                {adminUser && (
                    <section className="border-t bg-muted/20 py-14 md:py-20">
                        <div className="container mx-auto px-4">
                            <div className="max-w-5xl mx-auto">
                                <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
                                    <div>
                                        <div className="flex items-center gap-3 mb-1.5">
                                            <h2 className="text-xl md:text-2xl font-extrabold flex items-center gap-2">
                                                <Users className="w-6 h-6 text-primary" /> Anciens
                                            </h2>
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 text-xs font-bold">
                                                <Lock className="w-3 h-3" /> Admin only
                                            </span>
                                        </div>
                                        <p className="text-sm text-muted-foreground max-w-lg">Former members and their last role.</p>
                                    </div>
                                    <a href="/admin/history" className="text-xs text-primary underline underline-offset-4 hover:text-primary/80 transition-colors">
                                        Manage in admin →
                                    </a>
                                </div>

                                {anciens.length === 0 ? (
                                    <div className="text-center py-10 border border-dashed rounded-2xl bg-background">
                                        <Users className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                                        <p className="text-sm text-muted-foreground">
                                            No anciens yet.{" "}
                                            <a href="/admin/history" className="text-primary underline underline-offset-4">Add in admin.</a>
                                        </p>
                                    </div>
                                ) : (
                                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {anciens.map((a) => (
                                            <div key={a.id} className="group relative overflow-hidden flex flex-col items-center text-center p-5 rounded-2xl bg-card border shadow-sm hover:shadow-md hover:border-primary/30 transition-all">
                                                <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-primary/0 via-primary/40 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                {a.photoUrl ? (
                                                    <div className="relative w-16 h-16 rounded-full overflow-hidden border-4 border-background shadow-md mb-3">
                                                        <Image src={a.photoUrl} alt={a.name} fill sizes="64px" className="object-cover" loading="lazy" />
                                                    </div>
                                                ) : (
                                                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-3 border-4 border-background shadow-md">
                                                        <span className="text-primary font-extrabold text-base">
                                                            {a.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                                                        </span>
                                                    </div>
                                                )}
                                                <h3 className="font-bold text-sm mb-1">{a.name}</h3>
                                                <span className="inline-block text-xs font-semibold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full mb-1.5">{a.lastRole}</span>
                                                {a.yearsActive && (
                                                    <p className="text-xs text-muted-foreground flex items-center justify-center gap-1 mb-2">
                                                        <Clock className="w-3 h-3" /> {a.yearsActive}
                                                    </p>
                                                )}
                                                {a.bio && (
                                                    <p className="text-xs text-muted-foreground leading-relaxed border-t pt-2.5 w-full">{a.bio}</p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>
                )}

            </main>

            <Footer
                socialLinks={socialLinks}
                logoUrl={settings?.logoUrl}
                description={settings?.footerDescription}
                address={settings?.footerAddress}
                phone={settings?.footerPhone}
                email={settings?.footerEmail}
            />
        </div>
    );
}

// ─── Shared card content ──────────────────────────────────────────────────────

type MilestoneData = {
    id: string;
    type: string;
    date: Date;
    title: string;
    description: string | null;
    longDescription: string | null;
    challenges: string | null;
    motivations: string | null;
    unitCount: number | null;
    memberCount: number | null;
    imageUrls: string[];
};

// ─── Milestone Card ───────────────────────────────────────────────────────────

function MilestoneCard({ m, side }: { m: MilestoneData; side: "left" | "right" }) {
    const hasExtra = m.longDescription || m.challenges || m.motivations;
    const imgCount = m.imageUrls?.length ?? 0;

    const cardContent = (
        <div className="rounded-2xl border bg-card overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">

            {/* Header */}
            <div className="px-4 pt-4 pb-3 border-b bg-gradient-to-r from-primary/5 to-transparent">
                <div className="flex flex-wrap items-center gap-1.5 mb-2">
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full">
                        <Clock className="w-2.5 h-2.5" />{formatMonthYear(m.date)}
                    </span>
                    {m.unitCount != null && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                            <Trophy className="w-2.5 h-2.5 text-primary" />{m.unitCount} unit{m.unitCount !== 1 ? "s" : ""}
                        </span>
                    )}
                    {m.memberCount != null && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                            <Users className="w-2.5 h-2.5 text-primary" />{m.memberCount} member{m.memberCount !== 1 ? "s" : ""}
                        </span>
                    )}
                </div>
                <h3 className="text-sm md:text-base font-bold leading-snug">{m.title}</h3>
                {m.description && (
                    <p className="text-muted-foreground mt-1 text-xs leading-relaxed">{m.description}</p>
                )}
            </div>

            {/* Images */}
            {imgCount > 0 && (
                imgCount === 1 ? (
                    <div className="relative h-36 md:h-44 overflow-hidden">
                        <Image src={m.imageUrls[0]} alt={m.title} fill
                            sizes="(max-width: 768px) 100vw, 420px"
                            className="object-cover" loading="lazy"
                        />
                    </div>
                ) : imgCount === 2 ? (
                    <div className="grid grid-cols-2 gap-1.5 p-3">
                        {m.imageUrls.map((url, i) => (
                            <div key={i} className="relative h-24 md:h-28 rounded-xl overflow-hidden">
                                <Image src={url} alt={`${m.title} ${i + 1}`} fill
                                    sizes="200px" className="object-cover" loading="lazy"
                                />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="p-3">
                        <div className="flex gap-1.5 overflow-x-auto snap-x snap-mandatory pb-1">
                            {m.imageUrls.map((url, i) => (
                                <div key={i} className="relative flex-none w-36 md:w-44 h-24 md:h-28 rounded-xl overflow-hidden snap-start">
                                    <Image src={url} alt={`${m.title} ${i + 1}`} fill
                                        sizes="180px" className="object-cover" loading="lazy"
                                    />
                                </div>
                            ))}
                        </div>
                        <p className="flex items-center gap-1 text-[11px] text-muted-foreground mt-1.5 px-0.5">
                            <ImageIcon className="w-2.5 h-2.5" /> {imgCount} photos
                        </p>
                    </div>
                )
            )}

            {/* Rich content */}
            {hasExtra && (
                <div className="px-4 pb-4 pt-2 space-y-2.5">
                    {m.longDescription && (
                        <p className="text-xs text-foreground leading-relaxed whitespace-pre-line">{m.longDescription}</p>
                    )}
                    {m.challenges && (
                        <div className="rounded-xl border border-orange-200 dark:border-orange-800/50 bg-orange-50/60 dark:bg-orange-950/20 p-3">
                            <div className="flex items-center gap-1.5 mb-1.5">
                                <Zap className="w-3 h-3 text-orange-500" />
                                <span className="text-[11px] font-bold text-orange-700 dark:text-orange-400 uppercase tracking-wide">Challenges</span>
                            </div>
                            <ul className="space-y-1">
                                {m.challenges.split("\n").filter(l => l.trim()).map((line, i) => (
                                    <li key={i} className="flex items-start gap-1.5 text-xs text-orange-900/80 dark:text-orange-200/80 leading-relaxed">
                                        <span className="mt-1.5 w-1 h-1 rounded-full bg-orange-400 shrink-0" />
                                        {line.trim()}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                    {m.motivations && (
                        <div className="rounded-xl border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/60 dark:bg-emerald-950/20 p-3">
                            <div className="flex items-center gap-1.5 mb-1.5">
                                <Target className="w-3 h-3 text-emerald-500" />
                                <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">Motivations</span>
                            </div>
                            <ul className="space-y-1">
                                {m.motivations.split("\n").filter(l => l.trim()).map((line, i) => (
                                    <li key={i} className="flex items-start gap-1.5 text-xs text-emerald-900/80 dark:text-emerald-200/80 leading-relaxed">
                                        <span className="mt-1.5 w-1 h-1 rounded-full bg-emerald-400 shrink-0" />
                                        {line.trim()}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </div>
    );

    return (
        <>
            {/* Mobile: single column, line on left */}
            <div className="md:hidden pl-9 relative">
                <div className="absolute left-0 top-3 w-6 h-6 rounded-full bg-card border-2 border-primary flex items-center justify-center shadow-sm z-10">
                    <Trophy className="w-2.5 h-2.5 text-primary" />
                </div>
                {cardContent}
            </div>

            {/* Desktop: alternating sides */}
            <div className="hidden md:flex items-start gap-0 relative">
                {/* Left slot */}
                <div className="w-1/2 pr-7">
                    {side === "left" && cardContent}
                </div>
                {/* Center node */}
                <div className="flex-none w-14 flex justify-center pt-3 z-10">
                    <div className="w-8 h-8 rounded-full bg-card border-2 border-primary flex items-center justify-center shadow-sm">
                        <Trophy className="w-3.5 h-3.5 text-primary" />
                    </div>
                </div>
                {/* Right slot */}
                <div className="w-1/2 pl-7">
                    {side === "right" && cardContent}
                </div>
            </div>
        </>
    );
}

// ─── Achievement Card (compact) ───────────────────────────────────────────────

function AchievementCard({ m, side }: { m: MilestoneData; side: "left" | "right" }) {
    const imgCount = m.imageUrls?.length ?? 0;

    const cardContent = (
        <div className="rounded-xl border border-amber-200/70 dark:border-amber-800/40 bg-amber-50/30 dark:bg-amber-950/10 px-4 py-3">
            <div className="flex flex-wrap items-center gap-1.5 mb-1">
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 rounded-full">
                    <Star className="w-2.5 h-2.5" /> {formatMonthYear(m.date)}
                </span>
                {m.unitCount != null && (
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Trophy className="w-2.5 h-2.5" /> {m.unitCount} unit{m.unitCount !== 1 ? "s" : ""}
                    </span>
                )}
                {m.memberCount != null && (
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Users className="w-2.5 h-2.5" /> {m.memberCount} member{m.memberCount !== 1 ? "s" : ""}
                    </span>
                )}
            </div>
            <h3 className="text-sm font-bold leading-snug">{m.title}</h3>
            {m.description && (
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{m.description}</p>
            )}
            {imgCount > 0 && (
                <div className="flex gap-1.5 mt-2 overflow-x-auto snap-x pb-0.5">
                    {m.imageUrls.map((url, i) => (
                        <div key={i} className="relative flex-none w-20 h-14 rounded-lg overflow-hidden snap-start">
                            <Image src={url} alt={`${m.title} ${i + 1}`} fill
                                sizes="80px" className="object-cover" loading="lazy"
                            />
                        </div>
                    ))}
                </div>
            )}
            {m.longDescription && (
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed border-t pt-2 whitespace-pre-line">{m.longDescription}</p>
            )}
            {(m.challenges || m.motivations) && (
                <div className="mt-2 grid sm:grid-cols-2 gap-2">
                    {m.challenges && (
                        <div className="rounded-lg border border-orange-200 dark:border-orange-800/40 bg-orange-50/50 dark:bg-orange-950/10 p-2">
                            <div className="flex items-center gap-1 mb-1">
                                <Zap className="w-2.5 h-2.5 text-orange-500" />
                                <span className="text-[10px] font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wide">Challenges</span>
                            </div>
                            <ul className="space-y-0.5">
                                {m.challenges.split("\n").filter(l => l.trim()).map((line, i) => (
                                    <li key={i} className="flex items-start gap-1 text-[11px] text-orange-900/70 dark:text-orange-200/70">
                                        <span className="mt-1.5 w-1 h-1 rounded-full bg-orange-400 shrink-0" />
                                        {line.trim()}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                    {m.motivations && (
                        <div className="rounded-lg border border-emerald-200 dark:border-emerald-800/40 bg-emerald-50/50 dark:bg-emerald-950/10 p-2">
                            <div className="flex items-center gap-1 mb-1">
                                <Target className="w-2.5 h-2.5 text-emerald-500" />
                                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">Motivations</span>
                            </div>
                            <ul className="space-y-0.5">
                                {m.motivations.split("\n").filter(l => l.trim()).map((line, i) => (
                                    <li key={i} className="flex items-start gap-1 text-[11px] text-emerald-900/70 dark:text-emerald-200/70">
                                        <span className="mt-1.5 w-1 h-1 rounded-full bg-emerald-400 shrink-0" />
                                        {line.trim()}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </div>
    );

    return (
        <>
            {/* Mobile */}
            <div className="md:hidden pl-9 relative">
                <div className="absolute left-0 top-2.5 w-6 h-6 rounded-full bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-700 flex items-center justify-center z-10">
                    <Star className="w-2.5 h-2.5 text-amber-500" />
                </div>
                {cardContent}
            </div>

            {/* Desktop: alternating sides */}
            <div className="hidden md:flex items-start gap-0 relative">
                <div className="w-1/2 pr-7">
                    {side === "left" && cardContent}
                </div>
                <div className="flex-none w-14 flex justify-center pt-2.5 z-10">
                    <div className="w-6 h-6 rounded-full bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-700 flex items-center justify-center shadow-sm">
                        <Star className="w-2.5 h-2.5 text-amber-500" />
                    </div>
                </div>
                <div className="w-1/2 pl-7">
                    {side === "right" && cardContent}
                </div>
            </div>
        </>
    );
}
