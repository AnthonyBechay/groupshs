import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Compass, Sparkles } from "lucide-react";
import { Metadata } from "next";
import { getCachedUnitsWithActivities, getCachedAllActivities, getCachedSocialLinks, getCachedSettings } from "@/lib/query-cache";
import { UnitTabs } from "./unit-tabs";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "Activities - Group SHS",
    description: "Upcoming camps, meetings, and events for Scouts du Liban at Sagesse High School.",
};

export default async function ActivitiesPage() {
    const [units, allActivities, socialLinks, settings] = await Promise.all([
        getCachedUnitsWithActivities(),
        getCachedAllActivities(),
        getCachedSocialLinks(),
        getCachedSettings(),
    ]);
    const siteLogoUrl = settings?.logoUrl;

    const now = new Date();
    const upcomingCount = allActivities.filter(a => {
        const end = a.endDate ? new Date(a.endDate) : new Date(a.startDate);
        return end >= now;
    }).length;

    return (
        <div className="min-h-screen flex flex-col font-sans">
            <Navbar logoUrl={siteLogoUrl} />
            <main className="flex-1">
                {/* Hero */}
                <section className="relative overflow-hidden bg-gradient-to-br from-primary via-primary to-emerald-800 text-white py-20 md:py-32">
                    <div className="absolute inset-0 opacity-20">
                        <div className="absolute top-10 right-10 w-96 h-96 rounded-full bg-scout-gold/30 blur-3xl animate-pulse" />
                        <div className="absolute bottom-10 left-10 w-72 h-72 rounded-full bg-emerald-300/30 blur-3xl animate-pulse [animation-delay:1.5s]" />
                    </div>
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDE0YTIgMiAwIDEgMSAwLTQgMiAyIDAgMCAxIDAgNHptMCAyOGEyIDIgMCAxIDEgMC00IDIgMiAwIDAgMSAwIDR6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-50" />
                    <div className="container mx-auto px-4 relative z-10 text-center">
                        <div className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm backdrop-blur-xl mb-6">
                            <Compass className="w-4 h-4 mr-2 text-scout-gold" />
                            <span className="text-white/90">Camps, Hikes, Day Outs & More</span>
                        </div>
                        <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-6 leading-[1.05]">
                            Our <span className="bg-gradient-to-r from-scout-gold via-yellow-300 to-scout-gold bg-clip-text text-transparent">Activities</span>
                        </h1>
                        <p className="text-lg md:text-xl text-white/80 max-w-xl mx-auto">
                            From weekly meetings to annual camps, discover what we&apos;re up to.
                        </p>
                        <div className="mt-10 inline-flex items-center gap-3 rounded-full bg-white/10 border border-white/20 backdrop-blur-xl px-5 py-2 text-sm font-semibold">
                            <Sparkles className="w-4 h-4 text-scout-gold" />
                            <span>{upcomingCount} upcoming {upcomingCount === 1 ? "activity" : "activities"}</span>
                        </div>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0">
                        <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
                            <path d="M0,40 C360,80 720,0 1080,40 C1260,60 1380,50 1440,40 L1440,80 L0,80 Z" className="fill-background" />
                        </svg>
                    </div>
                </section>

                {/* Activities + Unit filter */}
                <section className="py-12 md:py-16 container mx-auto px-4">
                    <UnitTabs
                        units={units.map(u => ({
                            id: u.id,
                            name: u.name,
                            unitType: u.unitType,
                            description: u.description,
                            imageUrl: u.imageUrl,
                            contacts: u.contacts.map(c => ({
                                firstName: c.member.firstName,
                                lastName: c.member.lastName,
                                phone: c.member.phone,
                                role: c.member.role,
                                photoUrl: c.member.photoUrl,
                            })),
                        }))}
                        activities={allActivities.map(a => ({
                            id: a.id,
                            title: a.title,
                            description: a.description,
                            whatToBring: a.whatToBring,
                            activityType: a.activityType,
                            startDate: new Date(a.startDate).toISOString(),
                            endDate: a.endDate ? new Date(a.endDate).toISOString() : null,
                            pickupTime: a.pickupTime,
                            dropoffTime: a.dropoffTime,
                            pickupLocation: a.pickupLocation,
                            dropoffLocation: a.dropoffLocation,
                            location: a.location,
                            pickupLocationUrl: a.pickupLocationUrl,
                            dropoffLocationUrl: a.dropoffLocationUrl,
                            locationUrl: a.locationUrl,
                            imageUrl: a.imageUrl,
                            isUpcoming: a.isUpcoming,
                            unitId: a.unitId,
                            unitName: a.unit.name,
                        }))}
                    />
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
