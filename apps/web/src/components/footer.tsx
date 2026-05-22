import Link from "next/link";
import Image from "next/image";
import { SocialIcon } from "./social-icons";

type SocialLink = {
    id: string;
    platform: string;
    url: string;
};

type FooterProps = {
    socialLinks?: SocialLink[];
    logoUrl?: string | null;
    description?: string | null;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
};

const DEFAULT_DESCRIPTION = "Official website of Les Scouts du Liban group at Sagesse High School, Ain Saade. Fostering the next generation of leaders.";
const DEFAULT_ADDRESS = "Ain Saade, Metn, Lebanon";
const DEFAULT_PHONE = "CG Johnny Saad - 71 297 333";
const DEFAULT_EMAIL = "info@groupshs.org";

export function Footer({
    socialLinks = [],
    logoUrl,
    description,
    address,
    phone,
    email,
}: FooterProps) {
    const src = logoUrl || "/logo.png";
    const desc = description || DEFAULT_DESCRIPTION;
    const addr = address || DEFAULT_ADDRESS;
    const ph = phone || DEFAULT_PHONE;
    const em = email || DEFAULT_EMAIL;

    return (
        <footer className="bg-gradient-to-b from-card to-muted/30 border-t">
            <div className="container mx-auto px-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-10 py-12 md:py-16">
                    <div className="col-span-2">
                        <div className="flex items-center gap-2.5 mb-4">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={src} alt="Logo" width={36} height={36} className="w-9 h-9 object-contain" style={{ background: "transparent" }} />
                            <div>
                                <h4 className="text-lg font-extrabold text-primary leading-none">Group SHS</h4>
                                <span className="text-[10px] font-medium text-muted-foreground tracking-widest uppercase">Scouts du Liban</span>
                            </div>
                        </div>
                        <p className="text-sm text-muted-foreground max-w-sm leading-relaxed mb-5 whitespace-pre-line">
                            {desc}
                        </p>
                        {socialLinks.length > 0 && (
                            <div className="flex items-center flex-wrap gap-2">
                                {socialLinks.map((link) => (
                                    <a
                                        key={link.id}
                                        href={link.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-10 h-10 rounded-xl bg-muted/60 hover:bg-primary hover:text-white text-muted-foreground flex items-center justify-center transition-all duration-200 hover:scale-110 hover:shadow-lg hover:shadow-primary/20 active:bg-primary active:text-white"
                                        title={link.platform}
                                    >
                                        <SocialIcon platform={link.platform} className="w-[18px] h-[18px]" />
                                    </a>
                                ))}
                            </div>
                        )}
                    </div>
                    <div>
                        <h4 className="font-bold mb-3 md:mb-4 text-sm uppercase tracking-wider">Links</h4>
                        <ul className="space-y-2 md:space-y-2.5 text-sm text-muted-foreground">
                            <li><Link href="/about" className="hover:text-primary transition-colors active:text-primary">About Us</Link></li>
                            <li><Link href="/activities" className="hover:text-primary transition-colors active:text-primary">Activities</Link></li>
                            <li><Link href="/join" className="hover:text-primary transition-colors active:text-primary">Join Now</Link></li>
                            <li><Link href="/news" className="hover:text-primary transition-colors active:text-primary">News</Link></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-bold mb-3 md:mb-4 text-sm uppercase tracking-wider">Contact</h4>
                        <ul className="space-y-2 md:space-y-2.5 text-sm text-muted-foreground">
                            <li className="break-words">{addr}</li>
                            <li className="break-words">{ph}</li>
                            <li><a href={`mailto:${em}`} className="hover:text-primary transition-colors active:text-primary break-all">{em}</a></li>
                        </ul>
                    </div>
                </div>
                <div className="border-t py-6 md:py-8 flex flex-col sm:flex-row justify-between items-center gap-3 text-sm text-muted-foreground">
                    <p className="text-center sm:text-left">&copy; {new Date().getFullYear()} Group SHS - Les Scouts du Liban. All rights reserved.</p>
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
