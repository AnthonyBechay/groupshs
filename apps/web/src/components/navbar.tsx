import Link from "next/link";
import { Button } from "./ui/button";

export function Navbar() {
    return (
        <nav className="border-b bg-background">
            <div className="container mx-auto flex h-16 items-center justify-between px-4">
                <Link href="/" className="text-xl font-bold">
                    Group SHS
                </Link>
                <div className="flex items-center gap-4">
                    <Link href="/about" className="text-sm font-medium hover:underline">
                        About
                    </Link>
                    <Link href="/news" className="text-sm font-medium hover:underline">
                        News
                    </Link>
                    <Link href="/register">
                        <Button>Register</Button>
                    </Link>
                </div>
            </div>
        </nav>
    );
}
