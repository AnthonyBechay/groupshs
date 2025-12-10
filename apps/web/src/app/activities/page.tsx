import { Navbar } from "@/components/navbar";
import { Calendar, MapPin, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = {
    title: "Activities - Group SHS",
    description: "Upcoming camps, meetings, and events for Scouts du Liban at Sagesse High School.",
};

export default function ActivitiesPage() {
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
                            From weekly meetings to annual camps, discover what we're up to.
                        </p>
                    </div>
                </section>

                <section className="py-12 md:py-24 container mx-auto px-4">
                    <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                        {/* Mock Activities for now */}
                        {[
                            { title: "Winter Camp 2025", date: "Dec 27-30, 2025", location: "Laklouk", description: "Snow camping, skiing, and winter survival skills." },
                            { title: "Independance Day Parade", date: "Nov 22, 2025", location: "Beirut", description: "Marching with fellow scouts to celebrate our nation." },
                            { title: "Weekly Gathering", date: "Every Saturday", location: "Sagesse High School", description: "Regular patrol meetings, games, and training." },
                        ].map((activity, i) => (
                            <div key={i} className="group flex flex-col bg-card border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all">
                                <div className="h-48 bg-muted flex items-center justify-center text-muted-foreground/30">
                                    <Calendar className="h-12 w-12" />
                                </div>
                                <div className="p-6 flex-1 flex flex-col">
                                    <div className="flex items-center gap-2 text-xs font-medium text-primary mb-3">
                                        <Calendar className="w-3 h-3" />
                                        <span>{activity.date}</span>
                                    </div>
                                    <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">{activity.title}</h3>
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                                        <MapPin className="w-4 h-4" />
                                        <span>{activity.location}</span>
                                    </div>
                                    <p className="text-sm text-muted-foreground mb-6 flex-1">
                                        {activity.description}
                                    </p>
                                    <Button variant="outline" className="w-full">Details</Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </main>
            <footer className="bg-background border-t py-12">
                <div className="container mx-auto px-4">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
                        <p>&copy; {new Date().getFullYear()} Group SHS. All rights reserved.</p>
                        <div className="flex items-center gap-2">
                            <span>Made with ❤️ by</span>
                            <a
                                href="https://bechai.ai"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 font-medium text-foreground hover:text-primary transition-colors bg-muted px-2 py-1 rounded-md"
                            >
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
