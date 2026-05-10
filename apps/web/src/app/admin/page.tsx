import Link from "next/link";
import { Users, Calendar, FileText, Shield, UserCheck, ImageIcon, Handshake, Share2, Settings, Newspaper } from "lucide-react";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AdminPage() {
    const session = await getSession();
    if (!session) redirect("/login");

    const p = session.permissions;

    const cards = [
        { href: "/admin/units", icon: Shield, title: "Units", desc: "Manage scout units (Louveteaux, Eclaireurs, Routiers, Chefs)", show: p.canManageUnits },
        { href: "/admin/members", icon: UserCheck, title: "Members", desc: "Manage members, roles, and progression", show: p.canManageMembers },
        { href: "/admin/activities", icon: Calendar, title: "Activities", desc: "Manage camps, journées, and events", show: p.canManageActivities },
        { href: "/admin/gallery", icon: ImageIcon, title: "Gallery", desc: "Manage homepage carousel photos", show: p.canManageGallery },
        { href: "/admin/partners", icon: Handshake, title: "Partners", desc: "Manage partner and sponsor logos", show: p.canManagePartners },
        { href: "/admin/social-links", icon: Share2, title: "Social Media", desc: "Manage social media links", show: p.canManageSocialLinks },
        { href: "/admin/news", icon: Newspaper, title: "News", desc: "Publish news and announcements", show: p.canManageNews },
        { href: "/admin/submissions", icon: FileText, title: "Submissions", desc: "View recruitment form submissions", show: p.canViewSubmissions },
        { href: "/admin/settings", icon: Settings, title: "Settings", desc: "Group founding year, manual stats", show: p.canManageSettings },
        { href: "/admin/users", icon: Users, title: "Users", desc: "Manage admin accounts and permissions", show: session.isSuperAdmin },
    ].filter(c => c.show);

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-3xl font-bold">Dashboard</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Welcome back, {session.name}{session.isSuperAdmin ? " (Super Admin)" : ""}
                </p>
            </div>
            {cards.length === 0 ? (
                <div className="text-center py-20 bg-muted/30 rounded-2xl border border-dashed">
                    <Shield className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                    <p className="text-muted-foreground">You don&apos;t have any permissions yet. Contact a super admin.</p>
                </div>
            ) : (
                <div className="grid md:grid-cols-3 gap-6">
                    {cards.map(card => (
                        <Link key={card.href} href={card.href} className="border rounded-xl p-6 hover:shadow-md hover:border-primary/30 transition-all group">
                            <card.icon className="w-8 h-8 text-primary mb-4" />
                            <h2 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">{card.title}</h2>
                            <p className="text-sm text-muted-foreground">{card.desc}</p>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
