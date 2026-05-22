import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { GalleryCarousel } from "@/components/gallery-carousel";
import { Tent, Users, ArrowRight, Calendar, MapPin, Clock, Compass, TreePine, Mountain, Heart, Sparkles, Award } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/db";
import { SocialIcon } from "@/components/social-icons";

export const dynamic = "force-dynamic";

function formatDate(d: Date) {
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  CAMP: "Camp", JOURNEE: "Day out", TEMPS: "Meeting", MARCHE: "Hike", OTHER: "Other",
};

export default async function Home() {
  const currentYear = new Date().getFullYear();
  const now = new Date();

  const [upcomingActivities, galleryPhotos, partners, socialLinks, thisYearActivities, memberCount, unitCount, totalActivitiesCount, settings] = await Promise.all([
    prisma.activity.findMany({
      where: {
        hidden: false,
        OR: [
          { endDate: { gte: now } },
          { endDate: null, startDate: { gte: now } },
        ],
      },
      include: { unit: { select: { name: true } } },
      orderBy: { startDate: "asc" },
      take: 3,
    }),
    prisma.galleryPhoto.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.partner.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.socialLink.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.activity.findMany({
      where: {
        hidden: false,
        year: currentYear,
        AND: [
          {
            OR: [
              { endDate: { lt: now } },
              { endDate: null, startDate: { lt: now } },
            ],
          },
        ],
      },
      include: { unit: { select: { name: true } } },
      orderBy: { startDate: "desc" },
    }),
    prisma.member.count(),
    prisma.unit.count(),
    prisma.activity.count({ where: { hidden: false } }),
    prisma.siteSettings.findUnique({ where: { id: "default" } }),
  ]);

  const groupFoundedYear = settings?.groupFoundedYear ?? 2014;
  const yearsStrong = currentYear - groupFoundedYear;
  const displayedUnitCount = settings?.manualUnitCount ?? unitCount;
  const displayedMemberCount = settings?.manualMemberCount ?? memberCount;
  const siteLogoUrl = settings?.logoUrl;

  return (
    <div className="min-h-screen flex flex-col font-sans">
      <Navbar logoUrl={siteLogoUrl} />
      <main className="flex-1">
        {/* ═══ Hero ═══ */}
        <section className="relative overflow-hidden bg-gradient-to-br from-primary via-primary to-emerald-800 text-white pt-28 pb-32 lg:pt-36 lg:pb-44">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-10 left-10 w-72 h-72 rounded-full bg-white/30 blur-3xl animate-pulse" />
            <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full bg-emerald-300/30 blur-3xl animate-pulse [animation-delay:1s]" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-yellow-300/20 blur-3xl" />
          </div>
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDE0YTIgMiAwIDEgMSAwLTQgMiAyIDAgMCAxIDAgNHptMCAyOGEyIDIgMCAxIDEgMC00IDIgMiAwIDAgMSAwIDR6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-50" />

          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-4xl mx-auto text-center">
              <div className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm backdrop-blur-xl mb-8 animate-fade-in shadow-lg shadow-black/5">
                <Compass className="w-4 h-4 mr-2 text-scout-gold" />
                <span className="text-white/95 font-medium">Les Scouts du Liban - Groupe Sagesse High School</span>
              </div>

              <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter mb-8 leading-[0.95]">
                <span className="block text-white drop-shadow-lg">Always Ready</span>
                <span className="block bg-gradient-to-r from-red-400 via-red-500 to-red-600 bg-clip-text text-transparent">to Serve</span>
                <span className="block bg-gradient-to-r from-scout-gold via-yellow-300 to-scout-gold bg-clip-text text-transparent">Our Best</span>
              </h1>

              <p className="text-lg md:text-xl text-white/85 mb-10 max-w-xl mx-auto leading-relaxed">
                Building tomorrow&apos;s leaders through adventure, service, and brotherhood since 2014 in the heart of Ain Saade.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/join">
                  <Button size="lg" className="w-full sm:w-auto font-bold gap-2 bg-scout-gold hover:bg-scout-gold/90 text-scout-brown shadow-xl shadow-scout-gold/30 px-8 transition-all hover:scale-105 hover:shadow-scout-gold/50">
                    Join the Adventure <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
                <Link href="/about">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto bg-white/5 border-white/30 text-white hover:bg-white/15 hover:border-white/50 gap-2 px-8 backdrop-blur-md transition-all">
                    Discover Our Story
                  </Button>
                </Link>
              </div>

              {socialLinks.length > 0 && (
                <div className="flex items-center justify-center gap-3 mt-12">
                  {socialLinks.map((link) => (
                    <a
                      key={link.id}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/25 border border-white/20 text-white/80 hover:text-white flex items-center justify-center transition-all duration-200 hover:scale-110 hover:-translate-y-0.5 backdrop-blur-md shadow-lg shadow-black/5"
                      title={link.platform}
                    >
                      <SocialIcon platform={link.platform} className="w-[18px] h-[18px]" />
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="absolute bottom-0 left-0 right-0">
            <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
              <path d="M0,40 C360,80 720,0 1080,40 C1260,60 1380,50 1440,40 L1440,80 L0,80 Z" className="fill-background" />
            </svg>
          </div>
        </section>

        {/* ═══ Stats Bar ═══ */}
        <section className="relative -mt-8 sm:-mt-12 z-20 px-4">
          <div className="container mx-auto">
            <div className="bg-card border rounded-3xl shadow-2xl shadow-primary/5 max-w-4xl mx-auto p-5 md:p-8 grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {[
                { value: `${yearsStrong}+`, label: "Years strong", icon: Award },
                { value: `${displayedMemberCount}+`, label: "Members", icon: Users },
                { value: displayedUnitCount.toString(), label: "Units", icon: Tent },
                { value: totalActivitiesCount.toString(), label: "Activities", icon: Sparkles },
              ].map((stat, i) => (
                <div key={i} className="text-center group">
                  <div className="inline-flex items-center justify-center w-9 h-9 md:w-10 md:h-10 rounded-xl bg-primary/10 text-primary mb-2 group-hover:scale-110 transition-transform">
                    <stat.icon className="w-4 h-4 md:w-5 md:h-5" />
                  </div>
                  <div className="text-2xl md:text-4xl font-black text-foreground tracking-tight">{stat.value}</div>
                  <div className="text-xs md:text-sm text-muted-foreground font-medium mt-0.5">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ Gallery ═══ */}
        {galleryPhotos.length > 0 && (
          <section className="py-24 bg-background">
            <div className="container mx-auto px-4">
              <div className="text-center mb-12">
                <span className="inline-block text-sm font-bold tracking-widest uppercase text-primary mb-3">Our Life</span>
                <h2 className="text-4xl md:text-5xl font-black tracking-tight">Moments That Define Us</h2>
              </div>
              <GalleryCarousel photos={galleryPhotos} />
            </div>
          </section>
        )}

        {/* ═══ Values ═══ */}
        <section className="py-16 md:py-24 bg-gradient-to-b from-background to-muted/20 relative">
          <div className="container mx-auto px-4">
            <div className="text-center mb-10 md:mb-16">
              <span className="inline-block text-sm font-bold tracking-widest uppercase text-primary mb-3">Our Values</span>
              <h2 className="text-3xl md:text-5xl font-black tracking-tight">What Makes Us Scouts</h2>
            </div>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-5 md:gap-6 max-w-5xl mx-auto">
              {[
                { icon: Users, title: "Brotherhood", desc: "Lifelong friendships forged through shared adventures and challenges within the Sagesse scout family.", color: "from-primary to-emerald-700", iconBg: "bg-primary/10 text-primary" },
                { icon: Mountain, title: "Adventure", desc: "From mountain hikes to winter camps, we push boundaries and discover the beauty of Lebanon together.", color: "from-scout-gold to-amber-600", iconBg: "bg-scout-gold/10 text-scout-gold" },
                { icon: Heart, title: "Service", desc: "Giving back to our community through volunteer work, helping those in need, and protecting nature.", color: "from-red-500 to-red-700", iconBg: "bg-red-100 text-red-600" },
              ].map((item, i) => (
                <div key={i} className="group relative bg-card rounded-3xl border p-6 md:p-8 hover:shadow-2xl hover:shadow-primary/10 transition-all duration-500 hover:-translate-y-2 active:scale-[0.98] overflow-hidden sm:col-span-1 last:sm:col-span-2 last:md:col-span-1">
                  <div className={`absolute inset-0 bg-gradient-to-br ${item.color} opacity-0 group-hover:opacity-[0.03] transition-opacity duration-500`} />
                  <div className={`h-12 w-12 md:h-14 md:w-14 rounded-2xl ${item.iconBg} flex items-center justify-center mb-5 md:mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
                    <item.icon className="w-6 h-6 md:w-7 md:h-7" />
                  </div>
                  <h3 className="text-xl md:text-2xl font-bold mb-2 md:mb-3">{item.title}</h3>
                  <p className="text-muted-foreground leading-relaxed text-sm md:text-base">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ Units Banner ═══ */}
        <section className="py-16 md:py-20 bg-gradient-to-r from-primary/5 via-scout-gold/5 to-primary/5 border-y">
          <div className="container mx-auto px-4">
            <div className="text-center mb-10 md:mb-12">
              <span className="inline-block text-sm font-bold tracking-widest uppercase text-primary mb-3">Our Branches</span>
              <h2 className="text-3xl md:text-5xl font-black tracking-tight">A Path for Every Age</h2>
            </div>
            <div className="grid grid-cols-3 max-w-2xl mx-auto gap-3 sm:gap-6">
              {[
                { name: "Louveteaux", age: "8-12 yrs", icon: TreePine, desc: "Learning by playing" },
                { name: "Eclaireurs", age: "12-17 yrs", icon: Compass, desc: "Exploring the path" },
                { name: "Routiers", age: "17+ yrs", icon: Mountain, desc: "Serving the community" },
              ].map((unit, i) => (
                <div key={i} className="text-center group cursor-default">
                  <div className="mx-auto w-14 h-14 sm:w-20 sm:h-20 rounded-2xl bg-card border flex items-center justify-center mb-3 md:mb-4 group-hover:bg-primary group-hover:text-white group-hover:border-primary transition-all duration-300 shadow-sm group-hover:shadow-xl group-hover:shadow-primary/30 group-hover:scale-110 group-hover:rotate-3 active:bg-primary active:text-white active:border-primary active:scale-105">
                    <unit.icon className="w-6 h-6 sm:w-9 sm:h-9 text-primary group-hover:text-white transition-colors" />
                  </div>
                  <h3 className="font-bold text-sm sm:text-lg mb-0.5 leading-tight">{unit.name}</h3>
                  <p className="text-xs sm:text-sm text-primary font-semibold mb-0.5 sm:mb-1">{unit.age}</p>
                  <p className="text-xs text-muted-foreground hidden sm:block">{unit.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ Upcoming Activities ═══ */}
        <section className="py-24 bg-background">
          <div className="container mx-auto px-4">
            <div className="flex justify-between items-end mb-8 md:mb-12">
              <div>
                <span className="inline-block text-sm font-bold tracking-widest uppercase text-primary mb-2 md:mb-3">What&apos;s Next</span>
                <h2 className="text-3xl md:text-5xl font-black tracking-tight">Upcoming Activities</h2>
              </div>
              <Link href="/activities" className="hidden md:block">
                <Button variant="outline" className="gap-2 font-semibold hover:bg-primary hover:text-white hover:border-primary transition-colors">View All <ArrowRight className="w-4 h-4" /></Button>
              </Link>
            </div>

            {upcomingActivities.length === 0 ? (
              <div className="text-center py-20 bg-muted/20 rounded-3xl border-2 border-dashed">
                <Tent className="w-14 h-14 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground font-medium">No upcoming activities at the moment. Check back soon!</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                {upcomingActivities.map((act) => (
                  <div key={act.id} className="group relative overflow-hidden rounded-3xl bg-card border shadow-sm hover:shadow-2xl hover:shadow-primary/10 transition-all duration-500 hover:-translate-y-1.5">
                    <div className="aspect-[16/10] bg-muted relative overflow-hidden">
                      {act.imageUrl ? (
                        <Image
                          src={act.imageUrl}
                          alt={act.title}
                          fill
                          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          className="object-cover group-hover:scale-110 transition-transform duration-700"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                          <Tent className="w-16 h-16 text-primary/20" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      <div className="absolute top-3 left-3 flex gap-2 flex-wrap">
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-primary text-white shadow-lg">{act.unit.name}</span>
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-white/95 text-foreground shadow-lg backdrop-blur-sm">{ACTIVITY_TYPE_LABELS[act.activityType] || act.activityType}</span>
                      </div>
                      <div className="absolute top-3 right-3">
                        <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500 text-white shadow-lg">
                          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                          Upcoming
                        </span>
                      </div>
                    </div>
                    <div className="p-6">
                      <div className="flex items-center gap-2 text-xs font-semibold text-primary mb-3">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{formatDate(act.startDate)}{act.endDate ? ` - ${formatDate(act.endDate)}` : ""}</span>
                      </div>
                      <h3 className="text-lg font-bold mb-2 group-hover:text-primary transition-colors">{act.title}</h3>
                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mb-3">
                        {act.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{act.location}</span>}
                        {(act.dropoffTime || act.pickupTime) && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{act.dropoffTime || ""}{act.dropoffTime && act.pickupTime ? ` - ${act.pickupTime}` : act.pickupTime || ""}</span>}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">{act.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-10 text-center md:hidden">
              <Link href="/activities"><Button variant="outline" className="gap-2 font-semibold">View All Activities <ArrowRight className="w-4 h-4" /></Button></Link>
            </div>
          </div>
        </section>

        {/* ═══ This Year ═══ */}
        {thisYearActivities.length > 0 && (
          <section className="py-24 bg-muted/30 border-t">
            <div className="container mx-auto px-4">
              <div className="mb-8 md:mb-12 flex justify-between items-end">
                <div>
                  <span className="inline-block text-sm font-bold tracking-widest uppercase text-primary mb-2 md:mb-3">Memories</span>
                  <h2 className="text-3xl md:text-5xl font-black tracking-tight">This Year&apos;s Activities</h2>
                  <p className="text-muted-foreground mt-2 text-sm md:text-base">A look at what we&apos;ve accomplished in {currentYear}.</p>
                </div>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                {thisYearActivities.slice(0, 6).map((act) => (
                  <div key={act.id} className="group relative overflow-hidden rounded-3xl bg-card border shadow-sm hover:shadow-2xl hover:shadow-primary/10 transition-all duration-500 hover:-translate-y-1.5">
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
                          <Tent className="w-16 h-16 text-primary/20" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      <div className="absolute top-3 left-3">
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-primary text-white shadow-lg">{act.unit.name}</span>
                      </div>
                    </div>
                    <div className="p-6">
                      <div className="flex items-center gap-2 text-xs font-semibold text-primary mb-3">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{formatDate(act.startDate)}{act.endDate ? ` - ${formatDate(act.endDate)}` : ""}</span>
                      </div>
                      <h3 className="text-lg font-bold mb-2 group-hover:text-primary transition-colors">{act.title}</h3>
                      {act.location && <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2"><MapPin className="w-3 h-3" /><span>{act.location}</span></div>}
                      <p className="text-sm text-muted-foreground line-clamp-2">{act.description}</p>
                    </div>
                  </div>
                ))}
              </div>
              {thisYearActivities.length > 6 && (
                <div className="mt-10 text-center">
                  <Link href="/activities"><Button variant="outline" className="gap-2 font-semibold">See all {thisYearActivities.length} <ArrowRight className="w-4 h-4" /></Button></Link>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ═══ Partners & Sponsors ═══ */}
        {partners.length > 0 && (
          <section className="py-24 bg-background border-t">
            <div className="container mx-auto px-4">
              <div className="text-center mb-14">
                <span className="inline-block text-sm font-bold tracking-widest uppercase text-primary mb-3">Together</span>
                <h2 className="text-4xl md:text-5xl font-black tracking-tight">Our Partners & Sponsors</h2>
                <p className="text-muted-foreground mt-3 max-w-md mx-auto">Proud to work alongside organizations that share our vision for youth development.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                {partners.map((partner) => {
                  const inner = (
                    <div className="group h-full bg-card border rounded-2xl p-6 hover:shadow-xl hover:shadow-primary/5 hover:border-primary/20 transition-all duration-300 hover:-translate-y-1 flex flex-col items-center text-center">
                      <div className="h-24 w-full flex items-center justify-center mb-4 grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500">
                        <Image
                          src={partner.logoUrl}
                          alt={partner.name}
                          width={160}
                          height={96}
                          loading="lazy"
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                      <h3 className="font-bold text-base mb-1">{partner.name}</h3>
                      {partner.description && (
                        <p className="text-xs text-muted-foreground leading-relaxed">{partner.description}</p>
                      )}
                    </div>
                  );
                  return partner.websiteUrl ? (
                    <a key={partner.id} href={partner.websiteUrl} target="_blank" rel="noopener noreferrer" className="block h-full">
                      {inner}
                    </a>
                  ) : (
                    <div key={partner.id} className="h-full">{inner}</div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* ═══ CTA ═══ */}
        <section className="py-28 bg-gradient-to-br from-primary via-primary to-emerald-800 text-white relative overflow-hidden">
          <div className="absolute inset-0 opacity-15">
            <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-scout-gold/40 blur-3xl animate-pulse" />
            <div className="absolute bottom-0 left-0 w-72 h-72 rounded-full bg-white/30 blur-3xl animate-pulse [animation-delay:1.5s]" />
          </div>
          <div className="container mx-auto px-4 relative z-10 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-white/10 border border-white/20 mb-8 backdrop-blur-md shadow-2xl shadow-black/10">
              <Tent className="w-10 h-10 text-scout-gold" />
            </div>
            <h2 className="text-4xl md:text-6xl font-black tracking-tight mb-6">Ready for the Adventure?</h2>
            <p className="text-lg md:text-xl text-white/85 max-w-lg mx-auto mb-10">
              Boys aged 8-18 are welcome to join Les Scouts du Liban - Group Sagesse High School, Ain Saade.
            </p>
            <Link href="/join">
              <Button size="lg" className="font-bold gap-2 bg-scout-gold hover:bg-scout-gold/90 text-scout-brown shadow-xl shadow-scout-gold/30 px-12 py-6 text-base transition-all hover:scale-105 hover:shadow-scout-gold/50">
                Join Now <ArrowRight className="w-5 h-5" />
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
