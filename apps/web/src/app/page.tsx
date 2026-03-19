import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Tent, Users, Star, ArrowRight, Calendar, MapPin, Clock } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/db";

export const dynamic = "force-dynamic";

function formatDate(d: Date) {
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default async function Home() {
  const currentYear = new Date().getFullYear();

  const upcomingActivities = await prisma.activity.findMany({
    where: { isUpcoming: true },
    include: { unit: { select: { name: true } } },
    orderBy: { startDate: "asc" },
    take: 3,
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
        <section className="relative overflow-hidden bg-primary text-primary-foreground py-24 lg:py-32">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-green-400/20 via-transparent to-transparent opacity-50" />
          <div className="container mx-auto px-4 relative z-10 text-center">
            <div className="inline-flex items-center rounded-full border border-primary-foreground/30 bg-primary-foreground/10 px-3 py-1 text-sm text-primary-foreground backdrop-blur-xl mb-6">
              <span className="flex h-2 w-2 rounded-full bg-green-400 mr-2 animate-pulse" />
              Sagesse High School Group
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 leading-tight">
              Scouts du Liban <br className="hidden md:block" />
              <span className="text-green-100">Toujours Pr&ecirc;ts</span>
            </h1>
            <p className="text-lg md:text-xl text-green-50 mb-10 max-w-2xl mx-auto leading-relaxed">
              Empowering youth through adventure, leadership, and service.
              Join the Sagesse High School scout group and start your journey today.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/join">
                <Button size="lg" variant="secondary" className="w-full sm:w-auto font-semibold gap-2">
                  Join the Adventure <Tent className="w-4 h-4" />
                </Button>
              </Link>
              <Link href="/about">
                <Button size="lg" variant="outline" className="w-full sm:w-auto bg-transparent border-primary-foreground/50 text-white hover:bg-white/10 gap-2">
                  Learn More <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Mission / About Section */}
        <section className="py-24 bg-background">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-3 gap-12 text-center">
              <div className="flex flex-col items-center">
                <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-6"><Users className="w-7 h-7" /></div>
                <h3 className="text-xl font-bold mb-3">Community & Brotherhood</h3>
                <p className="text-muted-foreground leading-relaxed">Building lifelong friendships and a strong sense of belonging within the Sagesse family.</p>
              </div>
              <div className="flex flex-col items-center">
                <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-6"><Star className="w-7 h-7" /></div>
                <h3 className="text-xl font-bold mb-3">Leadership & Growth</h3>
                <p className="text-muted-foreground leading-relaxed">Developing character and leadership skills through hands-on experiences and challenges.</p>
              </div>
              <div className="flex flex-col items-center">
                <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-6"><MapPin className="w-7 h-7" /></div>
                <h3 className="text-xl font-bold mb-3">Service & Nature</h3>
                <p className="text-muted-foreground leading-relaxed">Connecting with nature and serving our community with the core values of Scouting.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Upcoming Activities */}
        <section className="py-24 bg-muted/30 border-t">
          <div className="container mx-auto px-4">
            <div className="flex justify-between items-end mb-12">
              <div>
                <h2 className="text-3xl font-bold tracking-tight mb-2">Upcoming Activities</h2>
                <p className="text-muted-foreground">The adventure never stops. See what we have planned.</p>
              </div>
              <Link href="/activities" className="hidden md:block">
                <Button variant="ghost" className="gap-2 text-primary">View all <ArrowRight className="w-4 h-4" /></Button>
              </Link>
            </div>

            {upcomingActivities.length === 0 ? (
              <p className="text-center text-muted-foreground py-12">No upcoming activities at the moment. Check back soon!</p>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {upcomingActivities.map((act) => (
                  <div key={act.id} className="group relative overflow-hidden rounded-xl bg-card border shadow-sm hover:shadow-md transition-all">
                    <div className="aspect-video bg-muted relative overflow-hidden">
                      {act.imageUrl ? (
                        <Image src={act.imageUrl} alt={act.title} fill className="object-cover" unoptimized />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/20"><Tent className="w-12 h-12" /></div>
                      )}
                      <div className="absolute top-3 left-3">
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-primary text-primary-foreground">{act.unit.name}</span>
                      </div>
                    </div>
                    <div className="p-6">
                      <div className="flex items-center gap-2 text-xs font-medium text-primary mb-2">
                        <Calendar className="w-3 h-3" />
                        <span>{formatDate(act.startDate)}{act.endDate ? ` - ${formatDate(act.endDate)}` : ""}</span>
                      </div>
                      <h3 className="text-lg font-bold mb-2 group-hover:text-primary transition-colors">{act.title}</h3>
                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mb-2">
                        {act.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{act.location}</span>}
                        {act.pickupTime && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{act.pickupTime}{act.dropoffTime ? ` - ${act.dropoffTime}` : ""}</span>}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">{act.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-8 text-center md:hidden">
              <Link href="/activities"><Button variant="ghost" className="gap-2 text-primary">View all <ArrowRight className="w-4 h-4" /></Button></Link>
            </div>
          </div>
        </section>

        {/* This Year's Activities */}
        <section className="py-24 bg-background border-t">
          <div className="container mx-auto px-4">
            <div className="mb-12">
              <h2 className="text-3xl font-bold tracking-tight mb-2">This Year&apos;s Activities</h2>
              <p className="text-muted-foreground">A look at what we&apos;ve accomplished in {currentYear}.</p>
            </div>

            {thisYearActivities.length === 0 ? (
              <p className="text-center text-muted-foreground py-12">No past activities recorded for {currentYear} yet.</p>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {thisYearActivities.map((act) => (
                  <div key={act.id} className="group relative overflow-hidden rounded-xl bg-card border shadow-sm hover:shadow-md transition-all">
                    <div className="aspect-video bg-muted relative overflow-hidden">
                      {act.imageUrl ? (
                        <Image src={act.imageUrl} alt={act.title} fill className="object-cover" unoptimized />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/20"><Tent className="w-12 h-12" /></div>
                      )}
                      <div className="absolute top-3 left-3">
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-primary text-primary-foreground">{act.unit.name}</span>
                      </div>
                    </div>
                    <div className="p-6">
                      <div className="flex items-center gap-2 text-xs font-medium text-primary mb-2">
                        <Calendar className="w-3 h-3" />
                        <span>{formatDate(act.startDate)}{act.endDate ? ` - ${formatDate(act.endDate)}` : ""}</span>
                      </div>
                      <h3 className="text-lg font-bold mb-2 group-hover:text-primary transition-colors">{act.title}</h3>
                      {act.location && <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2"><MapPin className="w-3 h-3" /><span>{act.location}</span></div>}
                      <p className="text-sm text-muted-foreground line-clamp-2">{act.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      <footer className="bg-background border-t py-12">
        <div className="container mx-auto px-4 text-center md:text-left">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div className="col-span-1 md:col-span-2">
              <h4 className="text-lg font-bold mb-4 flex items-center justify-center md:justify-start gap-2"><Tent className="w-5 h-5 text-primary" />Group SHS</h4>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto md:mx-0">Official website of the Scouts du Liban group at Sagesse High School. Dedicated to fostering the next generation of leaders.</p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/about" className="hover:text-primary">About Us</Link></li>
                <li><Link href="/activities" className="hover:text-primary">Activities</Link></li>
                <li><Link href="/join" className="hover:text-primary">Join Now</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Contact</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>Ain Saade, Metn</li>
                <li>info@groupshs.org</li>
              </ul>
            </div>
          </div>
          <div className="border-t pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
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
