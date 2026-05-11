import { getSession, isAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { AdminLogout } from "./admin-logout";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
    const session = await getSession();

    if (!session) {
        redirect("/login");
    }

    if (!isAdmin(session)) {
        redirect("/");
    }

    const p = session.permissions;

    const links = [
        { href: "/admin/units", label: "Units", show: p.canManageUnits },
        { href: "/admin/members", label: "Members", show: p.canManageMembers },
        { href: "/admin/activities", label: "Activities", show: p.canManageActivities },
        { href: "/admin/gallery", label: "Gallery", show: p.canManageGallery },
        { href: "/admin/partners", label: "Partners", show: p.canManagePartners },
        { href: "/admin/social-links", label: "Social", show: p.canManageSocialLinks },
        { href: "/admin/news", label: "News", show: p.canManageNews },
        { href: "/admin/submissions", label: "Submissions", show: p.canViewSubmissions },
        { href: "/admin/settings", label: "Settings", show: p.canManageSettings },
        { href: "/admin/users", label: "Users", show: session.isSuperAdmin },
    ].filter(l => l.show);

    return (
        <div className="min-h-screen flex flex-col">
            <nav className="border-b bg-background/95 backdrop-blur-md sticky top-0 z-50">
                <div className="container mx-auto flex h-14 items-center justify-between px-4">
                    <div className="flex items-center gap-1 overflow-x-auto">
                        <Link href="/admin" className="text-lg font-bold text-primary mr-4 shrink-0">
                            Admin Panel
                        </Link>
                        {links.map(l => (
                            <Link
                                key={l.href}
                                href={l.href}
                                className="text-sm font-medium px-3 py-1.5 rounded-md hover:text-primary hover:bg-primary/5 transition-colors whitespace-nowrap"
                            >
                                {l.label}
                            </Link>
                        ))}
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                        <span className="text-xs text-muted-foreground hidden sm:inline">
                            {session.isSuperAdmin ? "Super Admin" : "Admin"}: {session.name}
                        </span>
                        <Link
                            href="/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-muted-foreground hover:text-primary transition-colors"
                        >
                            View Site ↗
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
