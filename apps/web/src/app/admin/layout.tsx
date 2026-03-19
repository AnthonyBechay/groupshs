import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { AdminLogout } from "./admin-logout";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
    const session = await getSession();

    if (!session) {
        redirect("/login");
    }

    if (session.role !== "admin") {
        redirect("/");
    }

    return (
        <div className="min-h-screen flex flex-col">
            <nav className="border-b bg-background sticky top-0 z-50">
                <div className="container mx-auto flex h-14 items-center justify-between px-4">
                    <div className="flex items-center gap-6">
                        <Link href="/admin" className="text-lg font-bold text-primary">
                            Admin Panel
                        </Link>
                        <Link href="/admin/units" className="text-sm font-medium hover:text-primary transition-colors">
                            Units
                        </Link>
                        <Link href="/admin/members" className="text-sm font-medium hover:text-primary transition-colors">
                            Members
                        </Link>
                        <Link href="/admin/activities" className="text-sm font-medium hover:text-primary transition-colors">
                            Activities
                        </Link>
                        <Link href="/admin/gallery" className="text-sm font-medium hover:text-primary transition-colors">
                            Gallery
                        </Link>
                        <Link href="/admin/users" className="text-sm font-medium hover:text-primary transition-colors">
                            Users
                        </Link>
                        <Link href="/admin/submissions" className="text-sm font-medium hover:text-primary transition-colors">
                            Submissions
                        </Link>
                    </div>
                    <div className="flex items-center gap-4">
                        <Link href="/" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                            View Site
                        </Link>
                        <AdminLogout />
                    </div>
                </div>
            </nav>
            <main className="flex-1 container mx-auto px-4 py-8">
                {children}
            </main>
        </div>
    );
}
