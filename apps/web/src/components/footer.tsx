import Link from "next/link";
import Image from "next/image";
import { SocialIcon } from "./social-icons";

type SocialLink = {
    id: string;
    platform: string;
    url: string;
};

export function Footer({ socialLinks = [], logoUrl }: { socialLinks?: SocialLink[]; logoUrl?: string | null }) {
    const src = logoUrl || "/logo.png";
    return (
        <footer className="bg-gradient-to-b from-card to-muted/30 border-t">
            <div className="container mx-auto px-4">
                <div className="grid md:grid-cols-4 gap-10 py-16">
                    <div className="md:col-span-2">
                        <div className="flex items-center gap-2.5 mb-4">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={src} alt="Logo" width={36} height={36} className="w-9 h-9 object-contain" />
                            <div>
                                <h4 className="text-lg font-extrabold text-primary leading-none">Group SHS</h4>
                                <span className="text-[10px] font-medium text-muted-foreground tracking-widest uppercase">Scouts du Liban</span>
                            </div>
                        </div>
                        <p className="text-sm text-muted-foreground max-w-sm leading-relaxed mb-6">
                            Official website of Les Scouts du Liban group at Sagesse High School, Ain Saade.
                            Fostering the next generation of leaders since the heart of Metn.
                        </p>
                        {socialLinks.length > 0 && (
                            <div className="flex items-center gap-2">
                                {socialLinks.map((link) => (
                                    <a
                                        key={link.id}
                                        href={link.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-10 h-10 rounded-xl bg-muted/60 hover:bg-primary hover:text-white text-muted-foreground flex items-center justify-center transition-all duration-200 hover:scale-110 hover:shadow-lg hover:shadow-primary/20"
                                        title={link.platform}
                                    >
                                        <SocialIcon platform={link.platform} className="w-[18px] h-[18px]" />
                                    </a>
                                ))}
                            </div>
                        )}
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
                            <li>CG Johnny Saad - 71 297 333</li>
                            <li>info@groupshs.org</li>
                        </ul>
                    </div>
                </div>
                <div className="border-t py-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
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
    );
}
