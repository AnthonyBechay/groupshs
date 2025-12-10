import Link from "next/link";
import { Button } from "./ui/button";
import Image from "next/image";

export function Navbar() {
    return (
        <nav className="border-b bg-background sticky top-0 z-50 backdrop-blur-md bg-background/80 supports-[backdrop-filter]:bg-background/60">
            <div className="container mx-auto flex h-16 items-center justify-between px-4">
                <Link href="/" className="flex items-center gap-2 text-xl font-bold text-primary transition-colors hover:text-primary/90">
                    <Image src="/logo.png" alt="Group SHS Logo" width={40} height={40} className="w-10 h-10 object-contain" />
                    <span>Group SHS</span>
                </Link>
                <div className="flex items-center gap-6">
                    <Link href="/about" className="text-sm font-medium hover:text-primary transition-colors">
                        About
                    </Link>
                    <Link href="/news" className="text-sm font-medium hover:text-primary transition-colors">
                        News
                    </Link>
                    <Link href="/register">
                        <Button className="font-semibold shadow-sm">Register</Button>
                    </Link>
                </div>
            </div>
        </nav>
    );
}
