"use client";

import Link from "next/link";
import { Button } from "./ui/button";
import Image from "next/image";
import { useState } from "react";
import { Menu, X } from "lucide-react";

const links = [
    { href: "/about", label: "About" },
    { href: "/activities", label: "Activities" },
    { href: "/news", label: "News" },
    { href: "/join", label: "Join Us" },
];

export function Navbar() {
    const [open, setOpen] = useState(false);

    return (
        <nav className="border-b bg-background/95 sticky top-0 z-50 backdrop-blur-lg supports-[backdrop-filter]:bg-background/80">
            <div className="container mx-auto flex h-16 items-center justify-between px-4">
                <Link href="/" className="flex items-center gap-2.5 text-xl font-bold text-primary transition-colors hover:text-primary/90">
                    <Image src="/logo.png" alt="Group SHS Logo" width={40} height={40} className="w-10 h-10 object-contain" />
                    <div className="flex flex-col leading-none">
                        <span className="text-lg font-extrabold tracking-tight">Group SHS</span>
                        <span className="text-[10px] font-medium text-muted-foreground tracking-widest uppercase">Scouts du Liban</span>
                    </div>
                </Link>

                {/* Desktop nav */}
                <div className="hidden md:flex items-center gap-1">
                    {links.map((l) => (
                        <Link key={l.href} href={l.href} className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-primary rounded-md hover:bg-primary/5 transition-all">
                            {l.label}
                        </Link>
                    ))}
                    <Link href="/login" className="ml-2">
                        <Button size="sm" className="font-semibold shadow-sm px-5">Login</Button>
                    </Link>
                </div>

                {/* Mobile hamburger */}
                <button className="md:hidden p-2 rounded-md hover:bg-muted" onClick={() => setOpen(!open)}>
                    {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
            </div>

            {/* Mobile menu */}
            {open && (
                <div className="md:hidden border-t bg-background/98 backdrop-blur-lg">
                    <div className="container mx-auto px-4 py-4 flex flex-col gap-1">
                        {links.map((l) => (
                            <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="px-3 py-2.5 text-sm font-medium text-muted-foreground hover:text-primary rounded-md hover:bg-primary/5 transition-all">
                                {l.label}
                            </Link>
                        ))}
                        <Link href="/login" onClick={() => setOpen(false)} className="mt-2">
                            <Button className="w-full font-semibold">Login</Button>
                        </Link>
                    </div>
                </div>
            )}
        </nav>
    );
}
