import { prisma } from "@/db";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { getSession, isAdmin } from "@/lib/auth";
import { Users, Trophy, Calendar, BookOpen, Clock, Lock, Zap, Target, ImageIcon, Star } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
    title: "Our History | Group SHS",
    description: "Discover the journey of Group SHS — from our founding to today, milestone by milestone.",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatMonthYear(iso: string | Date) {
    const d = new Date(iso);
    return d.toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
}

function formatYear(iso: string | Date) {
    return new Date(iso).getUTCFullYear();
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function HistoryPage() {
    const [settings, socialLinks, milestones, anciens, session] = await Promise.all([
        prisma.siteSettings.findUnique({ where: { id: "default" } }),
        prisma.socialLink.findMany({ orderBy: { sortOrder: "asc" } }),
        prisma.historyMilestone.findMany({ orderBy: [{ sortOrder: "asc" }, { date: "asc" }] }),
        prisma.ancien.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
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
                    {/* Background layers */}
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-background to-background" />
                    <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4 pointer-events-none" />

                    <div className="relative container mx-auto px-4 py-20 md:py-32">
                        <div className="max-w-3xl">
                            {/* Eyebrow */}
                            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest mb-6">
                                <Calendar className="w-3.5 h-3.5" /> Est. {foundedYear}
                            </div>

                            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-none mb-5">
                                Our<br />
                                <span className="text-primary">History</span>
                            </h1>

                            <p className="text-lg md:text-xl text-muted-foreground max-w-xl leading-relaxed mb-10">
                                Over {yearsActive} years of scouting, adventure, and community.
                                Every milestone tells a story of people, purpose, and perseverance.
                            </p>

                            {/* Stat row */}
                            <div className="flex flex-wrap gap-3">
                                {[
                                    { icon: <Calendar className="w-4 h-4" />, value: String(foundedYear), label: "Founded" },
                                    { icon: <Trophy className="w-4 h-4" />, value: String(milestones.length), label: "Milestones" },
                                    { icon: <Clock className="w-4 h-4" />, value: `${yearsActive}`, label: "Years active" },
                                ].map((s) => (
                                    <div key={s.label} className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-card border shadow-sm">
                                        <span className="text-primary">{s.icon}</span>
                                        <div>
                                            <div className="text-xl font-extrabold leading-none">{s.value}</div>
                                            <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {/* ════════════════════ FOUNDING ORIGIN ════════════════════ */}
                <section className="container mx-auto px-4 py-14 md:py-20">
                    <div className="max-w-3xl mx-auto">
                        <div className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-primary/5 to-background p-7 md:p-10 shadow-sm">
                            {/* Decorative circle */}
                            <div className="absolute top-0 right-0 w-48 h-48 bg-primary/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

                            <div className="relative">
                                <div className="flex items-center gap-3 mb-5">
                                    <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30 shrink-0">
                                        <BookOpen className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <div className="text-xs font-bold text-primary uppercase tracking-widest">The Beginning</div>
                                        <div className="text-2xl font-extrabold">{foundedYear}</div>
                                    </div>
                                </div>

                                <h2 className="text-xl md:text-2xl font-bold mb-3">Group SHS is founded</h2>
                                <p className="text-muted-foreground leading-relaxed">
                                    In {foundedYear}, a group of passionate scouts and dedicated leaders came together
                                    with a shared vision: to build a scouting community rooted in leadership,
                                    brotherhood, and service. From a handful of members and a single unit, Group SHS
                                    has grown into a vibrant family that has shaped the lives of hundreds across
                                    the years — and continues to grow.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ════════════════════ MILESTONES TIMELINE ════════════════════ */}
                <section className="container mx-auto px-4 pb-20 md:pb-28">
                    <div className="max-w-3xl mx-auto">

                        {milestones.length === 0 ? (
                            <div className="text-center py-16 border border-dashed rounded-2xl bg-muted/20">
                                <Trophy className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                                <p className="text-muted-foreground">
                                    Our history timeline is being built. Check back soon.
                                </p>
                            </div>
                        ) : (
                            <>
                                <h2 className="text-2xl md:text-3xl font-extrabold mb-12 flex items-center gap-3">
                                    <Trophy className="w-7 h-7 text-primary" /> Key Milestones
                                </h2>

                                <div className="relative">
                                    {/* Vertical timeline line */}
                                    <div className="absolute left-[1.375rem] top-3 bottom-3 w-0.5 bg-gradient-to-b from-primary via-border to-transparent" />

                                    <div className="space-y-8">
                                        {milestones.map((m, idx) => (
                                            m.type === "achievement"
                                                ? <AchievementCard key={m.id} m={m} />
                                                : <MilestoneCard key={m.id} m={m} idx={idx} milestones={milestones} />
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </section>

                {/* ════════════════════ ANCIENS (admin-only) ════════════════════ */}
                {adminUser && (
                    <section className="border-t bg-muted/20 py-16 md:py-24">
                        <div className="container mx-auto px-4">
                            <div className="max-w-5xl mx-auto">

                                {/* Section header */}
                                <div className="flex flex-wrap items-end justify-between gap-4 mb-10">
                                    <div>
                                        <div className="flex items-center gap-3 mb-2">
                                            <h2 className="text-2xl md:text-3xl font-extrabold flex items-center gap-3">
                                                <Users className="w-7 h-7 text-primary" /> Anciens
                                            </h2>
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 text-xs font-bold shrink-0">
                                                <Lock className="w-3 h-3" /> Admin only
                                            </span>
                                        </div>
                                        <p className="text-muted-foreground max-w-lg">
                                            Former members who shaped our group. Their dedication built the foundation we stand on today.
                                        </p>
                                    </div>
                                    <a
                                        href="/admin/history"
                                        className="text-xs text-primary underline underline-offset-4 hover:text-primary/80 transition-colors shrink-0"
                                    >
                                        Manage in admin →
                                    </a>
                                </div>

                                {anciens.length === 0 ? (
                                    <div className="text-center py-12 border border-dashed rounded-2xl bg-background">
                                        <Users className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                                        <p className="text-muted-foreground text-sm">
                                            No anciens added yet.{" "}
                                            <a href="/admin/history" className="text-primary underline underline-offset-4">
                                                Add them in the admin panel.
                                            </a>
                                        </p>
                                    </div>
                                ) : (
                                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                                        {anciens.map((a) => (
                                            <div
                                                key={a.id}
                                                className="group relative overflow-hidden flex flex-col items-center text-center p-7 rounded-2xl bg-card border shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-200"
                                            >
                                                {/* Subtle gradient accent */}
                                                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/0 via-primary/40 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity" />

                                                {a.photoUrl ? (
                                                    /* eslint-disable-next-line @next/next/no-img-element */
                                                    <img
                                                        src={a.photoUrl} alt={a.name}
                                                        className="w-20 h-20 rounded-full object-cover border-4 border-background shadow-md mb-4"
                                                    />
                                                ) : (
                                                    <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4 border-4 border-background shadow-md">
                                                        <span className="text-primary font-extrabold text-xl">
                                                            {a.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                                                        </span>
                                                    </div>
                                                )}

                                                <h3 className="font-bold text-base mb-1">{a.name}</h3>
                                                <span className="inline-block text-xs font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full mb-2">
                                                    {a.lastRole}
                                                </span>

                                                {a.yearsActive && (
                                                    <p className="text-xs text-muted-foreground flex items-center justify-center gap-1 mb-3">
                                                        <Clock className="w-3 h-3" /> {a.yearsActive}
                                                    </p>
                                                )}

                                                {a.bio && (
                                                    <p className="text-xs text-muted-foreground leading-relaxed mt-1 border-t pt-3 w-full">
                                                        {a.bio}
                                                    </p>
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

// ─── Milestone Card ───────────────────────────────────────────────────────────

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

// ─── Achievement Card (compact) ───────────────────────────────────────────────

function AchievementCard({ m }: { m: MilestoneData }) {
    return (
        <div className="relative pl-14">
            {/* Small node */}
            <div className="absolute left-1.5 top-2.5 w-8 h-8 rounded-full bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-700 flex items-center justify-center">
                <Star className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
            </div>

            <div className="rounded-2xl border border-amber-200/70 dark:border-amber-800/40 bg-amber-50/30 dark:bg-amber-950/10 px-5 py-4">
                {/* Header row */}
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/40 px-2.5 py-0.5 rounded-full">
                        <Star className="w-3 h-3" /> {formatMonthYear(m.date)}
                    </span>
                    {m.unitCount != null && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Trophy className="w-3 h-3" /> {m.unitCount} unit{m.unitCount !== 1 ? "s" : ""}
                        </span>
                    )}
                    {m.memberCount != null && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Users className="w-3 h-3" /> {m.memberCount} member{m.memberCount !== 1 ? "s" : ""}
                        </span>
                    )}
                </div>

                <h3 className="text-base font-bold leading-snug">{m.title}</h3>

                {m.description && (
                    <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{m.description}</p>
                )}

                {/* Images — compact 2-row scroll if present */}
                {m.imageUrls?.length > 0 && (
                    <div className="flex gap-2 mt-3 overflow-x-auto snap-x pb-1">
                        {m.imageUrls.map((url, i) => (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img key={i} src={url} alt={`${m.title} ${i + 1}`}
                                className="flex-none w-28 h-20 object-cover rounded-lg snap-start border"
                            />
                        ))}
                    </div>
                )}

                {/* Long description */}
                {m.longDescription && (
                    <p className="text-sm text-muted-foreground mt-3 leading-relaxed border-t pt-3 whitespace-pre-line">
                        {m.longDescription}
                    </p>
                )}

                {/* Challenges + Motivations — inline compact */}
                {(m.challenges || m.motivations) && (
                    <div className="mt-3 grid sm:grid-cols-2 gap-3">
                        {m.challenges && (
                            <div className="rounded-xl border border-orange-200 dark:border-orange-800/40 bg-orange-50/50 dark:bg-orange-950/10 p-3">
                                <div className="flex items-center gap-1.5 mb-1.5">
                                    <Zap className="w-3 h-3 text-orange-500" />
                                    <span className="text-xs font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wide">Challenges</span>
                                </div>
                                <ul className="space-y-1">
                                    {m.challenges.split("\n").filter(l => l.trim()).map((line, i) => (
                                        <li key={i} className="flex items-start gap-1.5 text-xs text-orange-900/70 dark:text-orange-200/70">
                                            <span className="mt-1.5 w-1 h-1 rounded-full bg-orange-400 shrink-0" />
                                            {line.trim()}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        {m.motivations && (
                            <div className="rounded-xl border border-emerald-200 dark:border-emerald-800/40 bg-emerald-50/50 dark:bg-emerald-950/10 p-3">
                                <div className="flex items-center gap-1.5 mb-1.5">
                                    <Target className="w-3 h-3 text-emerald-500" />
                                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">Motivations</span>
                                </div>
                                <ul className="space-y-1">
                                    {m.motivations.split("\n").filter(l => l.trim()).map((line, i) => (
                                        <li key={i} className="flex items-start gap-1.5 text-xs text-emerald-900/70 dark:text-emerald-200/70">
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
        </div>
    );
}

// ─── Milestone Card (full size) ───────────────────────────────────────────────

function MilestoneCard({ m, idx, milestones }: { m: MilestoneData; idx: number; milestones: MilestoneData[] }) {
    // "first" means the first major milestone in the list (achievements don't count)
    const isFirst = milestones.filter(x => x.type !== "achievement").indexOf(m) === 0;
    const hasExtra = m.longDescription || m.challenges || m.motivations;
    const imgCount = m.imageUrls?.length ?? 0;

    return (
        <div className="relative pl-14">
            {/* Timeline node */}
            <div className={`absolute left-0 top-3 w-11 h-11 rounded-full border-4 flex items-center justify-center shadow-sm transition-all ${
                isFirst
                    ? "bg-primary border-primary shadow-primary/30 shadow-md"
                    : "bg-card border-border"
            }`}>
                <Trophy className={`w-4 h-4 ${isFirst ? "text-white" : "text-primary"}`} />
            </div>

            {/* Card */}
            <div className="rounded-3xl border bg-card overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300">

                {/* Card header strip */}
                <div className="px-6 pt-6 pb-4 border-b bg-gradient-to-r from-primary/5 to-transparent">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                        {/* Date badge */}
                        <span className="inline-flex items-center gap-1.5 text-sm font-bold text-primary bg-primary/10 px-3 py-1 rounded-full">
                            <Clock className="w-3.5 h-3.5" />
                            {formatMonthYear(m.date)}
                        </span>

                        {/* Stats */}
                        {m.unitCount != null && (
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
                                <Trophy className="w-3 h-3 text-primary" />
                                {m.unitCount} unit{m.unitCount !== 1 ? "s" : ""}
                            </span>
                        )}
                        {m.memberCount != null && (
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
                                <Users className="w-3 h-3 text-primary" />
                                {m.memberCount} member{m.memberCount !== 1 ? "s" : ""}
                            </span>
                        )}
                    </div>

                    <h3 className="text-xl md:text-2xl font-extrabold leading-snug">{m.title}</h3>

                    {m.description && (
                        <p className="text-muted-foreground mt-2 leading-relaxed text-[15px]">
                            {m.description}
                        </p>
                    )}
                </div>

                {/* Image gallery */}
                {imgCount > 0 && (
                    <div className={`${imgCount === 1 ? "" : "p-4"}`}>
                        {imgCount === 1 && (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                                src={m.imageUrls[0]} alt={m.title}
                                className="w-full h-56 md:h-72 object-cover"
                            />
                        )}
                        {imgCount === 2 && (
                            <div className="grid grid-cols-2 gap-2">
                                {m.imageUrls.map((url, i) => (
                                    /* eslint-disable-next-line @next/next/no-img-element */
                                    <img key={i} src={url} alt={`${m.title} ${i + 1}`}
                                        className="w-full h-44 object-cover rounded-xl"
                                    />
                                ))}
                            </div>
                        )}
                        {imgCount >= 3 && (
                            <div className="flex gap-2 overflow-x-auto snap-x snap-mandatory pb-1 scrollbar-thin">
                                {m.imageUrls.map((url, i) => (
                                    /* eslint-disable-next-line @next/next/no-img-element */
                                    <img key={i} src={url} alt={`${m.title} ${i + 1}`}
                                        className="flex-none w-64 md:w-80 h-44 md:h-52 object-cover rounded-xl snap-start"
                                    />
                                ))}
                            </div>
                        )}
                        {imgCount >= 3 && (
                            <p className="flex items-center gap-1.5 text-xs text-muted-foreground mt-2 px-1">
                                <ImageIcon className="w-3 h-3" /> {imgCount} photos — scroll to see more
                            </p>
                        )}
                    </div>
                )}

                {/* Rich content sections */}
                {hasExtra && (
                    <div className="px-6 pb-6 pt-2 space-y-4">

                        {/* Full story */}
                        {m.longDescription && (
                            <div>
                                <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">
                                    {m.longDescription}
                                </p>
                            </div>
                        )}

                        {/* Challenges */}
                        {m.challenges && (
                            <div className="rounded-2xl border border-orange-200 dark:border-orange-800/50 bg-orange-50/60 dark:bg-orange-950/20 p-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="w-7 h-7 rounded-lg bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center shrink-0">
                                        <Zap className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
                                    </div>
                                    <span className="text-sm font-bold text-orange-700 dark:text-orange-400 uppercase tracking-wide">
                                        Challenges & Obstacles
                                    </span>
                                </div>
                                <ul className="space-y-1.5">
                                    {m.challenges.split("\n").filter(l => l.trim()).map((line, i) => (
                                        <li key={i} className="flex items-start gap-2 text-sm text-orange-900/80 dark:text-orange-200/80 leading-relaxed">
                                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-orange-400 dark:bg-orange-500 shrink-0" />
                                            {line.trim()}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Motivations */}
                        {m.motivations && (
                            <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/60 dark:bg-emerald-950/20 p-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0">
                                        <Target className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                    </div>
                                    <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">
                                        Motivations & Goals
                                    </span>
                                </div>
                                <ul className="space-y-1.5">
                                    {m.motivations.split("\n").filter(l => l.trim()).map((line, i) => (
                                        <li key={i} className="flex items-start gap-2 text-sm text-emerald-900/80 dark:text-emerald-200/80 leading-relaxed">
                                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-400 dark:bg-emerald-500 shrink-0" />
                                            {line.trim()}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}

            </div>
        </div>
    );
}
