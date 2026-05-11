"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "./ui/button";
import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";

const links = [
    { href: "/about", label: "About" },
    { href: "/activities", label: "Activities" },
    { href: "/news", label: "News" },
    { href: "/join", label: "Join Us" },
];

export function Navbar({ logoUrl }: { logoUrl?: string | null }) {
    const [open, setOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const pathname = usePathname();
    const src = logoUrl || "/logo.png";

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 8);
        onScroll();
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    return (
        <nav className={`sticky top-0 z-50 backdrop-blur-xl transition-all duration-300 ${
            scrolled ? "border-b bg-background/85 shadow-sm" : "border-b border-transparent bg-background/60"
        }`}>
            <div className="container mx-auto flex h-16 items-center justify-between px-4">
                <Link href="/" className="flex items-center gap-2.5 transition-transform hover:scale-105">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt="Group SHS Logo" width={40} height={40} className="w-10 h-10 object-contain" />
                    <div className="flex flex-col leading-none">
                        <span className="text-lg font-extrabold tracking-tight text-primary">Group SHS</span>
                        <span className="text-[10px] font-medium text-muted-foreground tracking-widest uppercase">Scouts du Liban</span>
                    </div>
                </Link>

                {/* Desktop nav */}
                <div className="hidden md:flex items-center gap-1">
                    {links.map((l) => {
                        const active = pathname === l.href || (l.href !== "/" && pathname?.startsWith(l.href));
                        return (
                            <Link
                                key={l.href}
                                href={l.href}
                                className={`relative px-4 py-2 text-sm font-medium rounded-full transition-all ${
                                    active
                                        ? "text-primary bg-primary/10"
                                        : "text-muted-foreground hover:text-primary hover:bg-primary/5"
                                }`}
                            >
                                {l.label}
                            </Link>
                        );
                    })}
                    <Link href="/login" className="ml-2">
                        <Button size="sm" className="font-semibold shadow-sm shadow-primary/20 px-5 hover:shadow-md hover:shadow-primary/30 transition-all">Login</Button>
                    </Link>
                </div>

                {/* Mobile hamburger */}
                <button className="md:hidden p-2 rounded-md hover:bg-muted transition-colors" onClick={() => setOpen(!open)} aria-label="Menu">
                    {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
            </div>

            {/* Mobile menu */}
            {open && (
                <div className="md:hidden border-t bg-background/95 backdrop-blur-xl animate-fade-in">
                    <div className="container mx-auto px-4 py-4 flex flex-col gap-1">
                        {links.map((l) => {
                            const active = pathname === l.href || (l.href !== "/" && pathname?.startsWith(l.href));
                            return (
                                <Link
                                    key={l.href}
                                    href={l.href}
                                    onClick={() => setOpen(false)}
                                    className={`px-3 py-2.5 text-sm font-medium rounded-md transition-all ${
                                        active ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-primary hover:bg-primary/5"
                                    }`}
                                >
                                    {l.label}
                                </Link>
                            );
                        })}
                        <Link href="/login" onClick={() => setOpen(false)} className="mt-2">
                            <Button className="w-full font-semibold">Login</Button>
                        </Link>
                    </div>
                </div>
            )}
        </nav>
    );
}
