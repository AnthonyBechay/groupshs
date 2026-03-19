import { Navbar } from "@/components/navbar";
import { Metadata } from "next";
import { prisma } from "@/db";
import { Calendar, Newspaper, Compass } from "lucide-react";
import Image from "next/image";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "News - Group SHS",
    description: "Latest news and updates from Scouts du Liban at Sagesse High School.",
};

function formatDate(d: Date) {
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default async function NewsPage() {
    const articles = await prisma.newsArticle.findMany({
        where: { published: true },
        orderBy: { date: "desc" },
    });

    return (
        <div className="min-h-screen flex flex-col font-sans">
            <Navbar />
            <main className="flex-1">
                {/* Hero */}
                <section className="relative overflow-hidden bg-gradient-to-br from-primary via-primary to-emerald-800 text-white py-20 md:py-28">
                    <div className="absolute inset-0 opacity-10">
                        <div className="absolute top-10 right-10 w-72 h-72 rounded-full bg-scout-gold/30 blur-3xl" />
                    </div>
                    <div className="container mx-auto px-4 relative z-10 text-center">
                        <div className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm backdrop-blur-xl mb-6">
                            <Compass className="w-4 h-4 mr-2 text-scout-gold" />
                            <span className="text-white/90">Stay Updated</span>
                        </div>
                        <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-6">
                            Latest <span className="bg-gradient-to-r from-scout-gold to-yellow-300 bg-clip-text text-transparent">News</span>
                        </h1>
                        <p className="text-lg text-white/80 max-w-xl mx-auto">
                            Announcements, updates, and stories from our scout group.
                        </p>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0">
                        <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
                            <path d="M0,40 C360,80 720,0 1080,40 C1260,60 1380,50 1440,40 L1440,80 L0,80 Z" className="fill-background" />
                        </svg>
                    </div>
                </section>

                {/* Articles */}
                <section className="py-16 md:py-24 container mx-auto px-4">
                    {articles.length === 0 ? (
                        <div className="text-center py-20 bg-muted/30 rounded-2xl border border-dashed">
                            <Newspaper className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                            <p className="text-muted-foreground">No news articles yet. Check back soon!</p>
                        </div>
                    ) : (
                        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                            {articles.map((article) => (
                                <div key={article.id} className="group flex flex-col bg-card border rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 hover:-translate-y-1">
                                    <div className="aspect-[16/10] bg-muted relative overflow-hidden">
                                        {article.imageUrl ? (
                                            <Image src={article.imageUrl} alt={article.title} fill className="object-cover group-hover:scale-105 transition-transform duration-500" unoptimized />
                                        ) : (
                                            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                                                <Newspaper className="w-16 h-16 text-primary/20" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-6 flex-1 flex flex-col">
                                        <div className="flex items-center gap-2 text-xs font-semibold text-primary mb-3">
                                            <Calendar className="w-3.5 h-3.5" />
                                            <span>{formatDate(article.date)}</span>
                                        </div>
                                        <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">{article.title}</h3>
                                        <p className="text-sm text-muted-foreground mb-4 flex-1">{article.summary}</p>
                                        {article.content && (
                                            <p className="text-sm text-muted-foreground line-clamp-3">{article.content}</p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </main>

            <footer className="bg-card border-t py-12">
                <div className="container mx-auto px-4">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
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
