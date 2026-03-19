import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { GalleryCarousel } from "@/components/gallery-carousel";
import { Tent, Users, Star, ArrowRight, Calendar, MapPin, Clock, Compass, TreePine, Mountain, Heart } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/db";

export const dynamic = "force-dynamic";

function formatDate(d: Date) {
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  CAMP: "Camp", JOURNEE: "Journée", TEMPS: "Temps", MARCHE: "Marche", OTHER: "Activité",
};

export default async function Home() {
  const currentYear = new Date().getFullYear();

  const upcomingActivities = await prisma.activity.findMany({
    where: { isUpcoming: true },
    include: { unit: { select: { name: true } } },
    orderBy: { startDate: "asc" },
    take: 3,
  });

  const galleryPhotos = await prisma.galleryPhoto.findMany({
    orderBy: { sortOrder: "asc" },
  });

  const thisYearActivities = await prisma.activity.findMany({
    where: { year: currentYear, isUpcoming: false },
    include: { unit: { select: { name: true } } },
    orderBy: { startDate: "desc" },
  });

  return (
    <div className="min-h-screen flex flex-col font-sans">
      <Navbar />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-br from-primary via-primary to-emerald-800 text-white py-28 lg:py-40">
          {/* Decorative background elements */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-10 left-10 w-72 h-72 rounded-full bg-white/20 blur-3xl" />
            <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full bg-emerald-300/20 blur-3xl" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-yellow-300/10 blur-3xl" />
          </div>
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDE0YTIgMiAwIDEgMSAwLTQgMiAyIDAgMCAxIDAgNHptMCAyOGEyIDIgMCAxIDEgMC00IDIgMiAwIDAgMSAwIDR6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-50" />

          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm backdrop-blur-xl mb-8">
                <Compass className="w-4 h-4 mr-2 text-scout-gold" />
                <span className="text-white/90">Les Scouts du Liban - Groupe Sagesse High School</span>
              </div>

              <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-6 leading-[1.1]">
                <span className="block text-white">Always Ready</span>
                <span className="block text-[#D4456A]">to Serve</span>
                <span className="block text-scout-gold">Our Best</span>
              </h1>

              <p className="text-lg md:text-xl text-white/80 mb-10 max-w-xl mx-auto leading-relaxed">
                Building tomorrow&apos;s leaders through adventure, service, and brotherhood since 2014 in the heart of Ain Saade.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/join">
                  <Button size="lg" className="w-full sm:w-auto font-bold gap-2 bg-scout-gold hover:bg-scout-gold/90 text-scout-brown shadow-lg shadow-scout-gold/20 px-8">
                    Join the Adventure <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
                <Link href="/about">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto bg-white/5 border-white/20 text-white hover:bg-white/10 gap-2 px-8 backdrop-blur-sm">
                    Discover Our Story
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Bottom wave */}
          <div className="absolute bottom-0 left-0 right-0">
            <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
              <path d="M0,40 C360,80 720,0 1080,40 C1260,60 1380,50 1440,40 L1440,80 L0,80 Z" className="fill-background" />
            </svg>
          </div>
        </section>

        {/* Gallery Carousel */}
        {galleryPhotos.length > 0 && (
          <section className="py-20 bg-background">
            <div className="container mx-auto px-4">
              <div className="text-center mb-10">
                <span className="inline-block text-sm font-bold tracking-widest uppercase text-primary mb-3">Our Life</span>
                <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">Moments That Define Us</h2>
              </div>
              <GalleryCarousel photos={galleryPhotos} />
            </div>
          </section>
        )}

        {/* Values Section */}
        <section className="py-24 bg-background relative">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <span className="inline-block text-sm font-bold tracking-widest uppercase text-primary mb-3">Our Values</span>
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">What Makes Us Scouts</h2>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              {[
                { icon: Users, title: "Brotherhood", desc: "Lifelong friendships forged through shared adventures and challenges within the Sagesse scout family.", color: "bg-primary/10 text-primary" },
                { icon: Mountain, title: "Adventure", desc: "From mountain hikes to winter camps, we push boundaries and discover the beauty of Lebanon together.", color: "bg-scout-gold/10 text-scout-gold" },
                { icon: Heart, title: "Service", desc: "Giving back to our community through volunteer work, helping those in need, and protecting nature.", color: "bg-red-50 text-red-700" },
              ].map((item, i) => (
                <div key={i} className="group relative bg-card rounded-2xl border p-8 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 hover:-translate-y-1">
                  <div className={`h-14 w-14 rounded-xl ${item.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                    <item.icon className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Units Banner */}
        <section className="py-20 bg-gradient-to-r from-primary/5 via-scout-gold/5 to-primary/5 border-y">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <span className="inline-block text-sm font-bold tracking-widest uppercase text-primary mb-3">Our Branches</span>
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">A Path for Every Age</h2>
            </div>
            <div className="grid grid-cols-3 max-w-2xl mx-auto gap-6">
              {[
                { name: "Louveteaux", age: "8-12 ans", icon: TreePine, desc: "Learning by playing" },
                { name: "Eclaireurs", age: "12-16 ans", icon: Compass, desc: "Exploring the path" },
                { name: "Routiers", age: "16+ ans", icon: Mountain, desc: "Serving the community" },
              ].map((unit, i) => (
                <div key={i} className="text-center group">
                  <div className="mx-auto w-20 h-20 rounded-2xl bg-card border flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-white group-hover:border-primary transition-all duration-300 shadow-sm">
                    <unit.icon className="w-8 h-8 text-primary group-hover:text-white transition-colors" />
                  </div>
                  <h3 className="font-bold text-lg mb-0.5">{unit.name}</h3>
                  <p className="text-sm text-primary font-semibold mb-1">{unit.age}</p>
                  <p className="text-xs text-muted-foreground">{unit.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Upcoming Activities */}
        <section className="py-24 bg-background">
          <div className="container mx-auto px-4">
            <div className="flex justify-between items-end mb-12">
              <div>
                <span className="inline-block text-sm font-bold tracking-widest uppercase text-primary mb-3">What&apos;s Next</span>
                <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">Upcoming Activities</h2>
              </div>
              <Link href="/activities" className="hidden md:block">
                <Button variant="outline" className="gap-2 font-semibold">View All <ArrowRight className="w-4 h-4" /></Button>
              </Link>
            </div>

            {upcomingActivities.length === 0 ? (
              <div className="text-center py-16 bg-muted/30 rounded-2xl border border-dashed">
                <Tent className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground">No upcoming activities at the moment. Check back soon!</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {upcomingActivities.map((act) => (
                  <div key={act.id} className="group relative overflow-hidden rounded-2xl bg-card border shadow-sm hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 hover:-translate-y-1">
                    <div className="aspect-[16/10] bg-muted relative overflow-hidden">
                      {act.imageUrl ? (
                        <img src={act.imageUrl} alt={act.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                          <Tent className="w-16 h-16 text-primary/20" />
                        </div>
                      )}
                      <div className="absolute top-3 left-3 flex gap-2">
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-primary text-white shadow-lg">{act.unit.name}</span>
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-white/90 text-foreground shadow-lg backdrop-blur-sm">{ACTIVITY_TYPE_LABELS[act.activityType] || act.activityType}</span>
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
                        {act.pickupTime && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{act.pickupTime}{act.dropoffTime ? ` -${act.dropoffTime}` : ""}</span>}
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

        {/* This Year's Activities */}
        {thisYearActivities.length > 0 && (
          <section className="py-24 bg-muted/30 border-t">
            <div className="container mx-auto px-4">
              <div className="mb-12">
                <span className="inline-block text-sm font-bold tracking-widest uppercase text-primary mb-3">Memories</span>
                <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">This Year&apos;s Activities</h2>
                <p className="text-muted-foreground mt-2">A look at what we&apos;ve accomplished in {currentYear}.</p>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {thisYearActivities.map((act) => (
                  <div key={act.id} className="group relative overflow-hidden rounded-2xl bg-card border shadow-sm hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 hover:-translate-y-1">
                    <div className="aspect-[16/10] bg-muted relative overflow-hidden">
                      {act.imageUrl ? (
                        <img src={act.imageUrl} alt={act.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                          <Tent className="w-16 h-16 text-primary/20" />
                        </div>
                      )}
                      <div className="absolute top-3 left-3">
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-primary text-white shadow-lg">{act.unit.name}</span>
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
            </div>
          </section>
        )}

        {/* CTA Section */}
        <section className="py-24 bg-gradient-to-br from-primary via-primary to-emerald-800 text-white relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-scout-gold/30 blur-3xl" />
            <div className="absolute bottom-0 left-0 w-72 h-72 rounded-full bg-white/20 blur-3xl" />
          </div>
          <div className="container mx-auto px-4 relative z-10 text-center">
            <Tent className="w-12 h-12 mx-auto mb-6 text-scout-gold" />
            <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-6">Ready for the Adventure?</h2>
            <p className="text-lg text-white/80 max-w-lg mx-auto mb-10">
              Boys aged 8-18 are welcome to join Les Scouts du Liban - Group Sagesse High School, Ain Saade.
            </p>
            <Link href="/join">
              <Button size="lg" className="font-bold gap-2 bg-scout-gold hover:bg-scout-gold/90 text-scout-brown shadow-lg shadow-scout-gold/20 px-10">
                Join Now <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-card border-t py-16">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-10 mb-10">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2.5 mb-4">
                <Image src="/logo.png" alt="Logo" width={36} height={36} className="w-9 h-9 object-contain" />
                <div>
                  <h4 className="text-lg font-extrabold text-primary leading-none">Group SHS</h4>
                  <span className="text-[10px] font-medium text-muted-foreground tracking-widest uppercase">Scouts du Liban</span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
                Official website of Les Scouts du Liban group at Sagesse High School, Ain Saade.
                Fostering the next generation of leaders since the heart of Metn.
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-4 text-sm uppercase tracking-wider">Links</h4>
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                <li><Link href="/about" className="hover:text-primary transition-colors">About Us</Link></li>
                <li><Link href="/activities" className="hover:text-primary transition-colors">Activities</Link></li>
                <li><Link href="/join" className="hover:text-primary transition-colors">Join Now</Link></li>
                <li><Link href="/news" className="hover:text-primary transition-colors">News</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4 text-sm uppercase tracking-wider">Contact</h4>
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                <li>Ain Saade, Metn, Lebanon</li>
                <li>CG Johnny Saad -71 297 333</li>
                <li>info@groupshs.org</li>
              </ul>
            </div>
          </div>
          <div className="border-t pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} Group SHS - Les Scouts du Liban. All rights reserved.</p>
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
