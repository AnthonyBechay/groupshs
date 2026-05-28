import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { getCachedSettings, getCachedSocialLinks } from "@/lib/query-cache";
import { Compass, Heart, Mountain, Users, Target } from "lucide-react";

// force-dynamic: DB is unreachable during `docker build`; queries are cached
// via unstable_cache in query-cache.ts so runtime performance is still fast.
export const dynamic = "force-dynamic";

export default async function AboutPage() {
    const [settings, socialLinks] = await Promise.all([
        prisma.siteSettings.findUnique({ where: { id: "default" } }),
        prisma.socialLink.findMany({ orderBy: { sortOrder: "asc" } }),
    ]);

    const heroTitle = settings?.aboutTitle || "Our Story";
    const heroSubtitle = settings?.aboutSubtitle || "Building leaders since the founding year of our group";
    const intro = settings?.aboutIntro
        || "Scout du Liban - Sagesse High School (Ain Saade) is dedicated to fostering the physical, mental, and spiritual development of young people through scouting.";
    const mission = settings?.aboutMission
        || "Our mission is to contribute to the education of young people, through a value system based on the Scout Promise and Law, to help build a better world where people are self-fulfilled as individuals and play a constructive role in society.";

    const siteLogoUrl = settings?.logoUrl;

    return (
        <div className="min-h-screen flex flex-col font-sans">
            <Navbar logoUrl={siteLogoUrl} />
            <main className="flex-1">
                {/* Hero */}
                <section className="relative overflow-hidden bg-gradient-to-br from-primary via-primary to-emerald-800 text-white py-24 md:py-32">
                    <div className="absolute inset-0 opacity-15">
                        <div className="absolute top-10 left-10 w-96 h-96 rounded-full bg-scout-gold/30 blur-3xl animate-pulse" />
                        <div className="absolute bottom-10 right-10 w-72 h-72 rounded-full bg-emerald-300/30 blur-3xl animate-pulse [animation-delay:1.5s]" />
                    </div>
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDE0YTIgMiAwIDEgMSAwLTQgMiAyIDAgMCAxIDAgNHptMCAyOGEyIDIgMCAxIDEgMC00IDIgMiAwIDAgMSAwIDR6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-50" />
                    <div className="container mx-auto px-4 relative z-10 text-center">
                        <div className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm backdrop-blur-xl mb-6">
                            <Compass className="w-4 h-4 mr-2 text-scout-gold" />
                            <span className="text-white/90">About Group SHS</span>
                        </div>
                        <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-4 leading-[0.95]">
                            {heroTitle.split(" ").map((w, i, arr) =>
                                i === arr.length - 1
                                    ? <span key={i} className="bg-gradient-to-r from-scout-gold via-yellow-300 to-scout-gold bg-clip-text text-transparent">{w}</span>
                                    : <span key={i}>{w} </span>
                            )}
                        </h1>
                        <p className="text-lg md:text-xl text-white/85 max-w-2xl mx-auto">{heroSubtitle}</p>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0">
                        <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
                            <path d="M0,40 C360,80 720,0 1080,40 C1260,60 1380,50 1440,40 L1440,80 L0,80 Z" className="fill-background" />
                        </svg>
                    </div>
                </section>

                {/* Intro + Mission */}
                <section className="py-14 md:py-20 bg-background">
                    <div className="container mx-auto px-4 grid md:grid-cols-2 gap-5 md:gap-8 max-w-5xl">
                        <div className="bg-card border rounded-3xl p-6 md:p-8 shadow-sm">
                            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                                <Users className="w-6 h-6" />
                            </div>
                            <h2 className="text-xl md:text-2xl font-extrabold mb-3">Who we are</h2>
                            <p className="text-muted-foreground leading-relaxed whitespace-pre-line text-sm md:text-base">{intro}</p>
                        </div>
                        <div className="bg-card border rounded-3xl p-6 md:p-8 shadow-sm">
                            <div className="w-12 h-12 rounded-2xl bg-scout-gold/10 text-scout-gold flex items-center justify-center mb-4">
                                <Target className="w-6 h-6" />
                            </div>
                            <h2 className="text-xl md:text-2xl font-extrabold mb-3">Our mission</h2>
                            <p className="text-muted-foreground leading-relaxed whitespace-pre-line text-sm md:text-base">{mission}</p>
                        </div>
                    </div>
                </section>

                {/* Values */}
                <section className="py-14 md:py-20 bg-gradient-to-b from-background to-muted/20 border-y">
                    <div className="container mx-auto px-4">
                        <div className="text-center mb-10 md:mb-12">
                            <span className="inline-block text-sm font-bold tracking-widest uppercase text-primary mb-3">What guides us</span>
                            <h2 className="text-2xl md:text-4xl font-extrabold">Three pillars</h2>
                        </div>
                        <div className="grid sm:grid-cols-3 gap-4 md:gap-6 max-w-5xl mx-auto">
                            {[
                                { icon: Users, title: "Brotherhood", desc: "Friendships forged through shared challenges.", color: "bg-primary/10 text-primary" },
                                { icon: Mountain, title: "Adventure", desc: "From mountain hikes to winter camps, we explore.", color: "bg-scout-gold/10 text-scout-gold" },
                                { icon: Heart, title: "Service", desc: "Giving back to our community and to nature.", color: "bg-red-100 text-red-600" },
                            ].map((v, i) => (
                                <div key={i} className="bg-card border rounded-3xl p-5 md:p-6 hover:shadow-lg transition-all hover:-translate-y-1 active:scale-[0.98]">
                                    <div className={`w-11 h-11 md:w-12 md:h-12 rounded-2xl ${v.color} flex items-center justify-center mb-4`}>
                                        <v.icon className="w-5 h-5 md:w-6 md:h-6" />
                                    </div>
                                    <h3 className="font-bold text-base md:text-lg mb-1">{v.title}</h3>
                                    <p className="text-sm text-muted-foreground">{v.desc}</p>
                                </div>
                            ))}
                        </div>
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

