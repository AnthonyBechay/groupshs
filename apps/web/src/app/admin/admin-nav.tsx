"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { ChevronDown, Menu, X, Shield } from "lucide-react";
import { AdminLogout } from "./admin-logout";

type Permission = {
    canManageUnits: boolean;
    canManageMembers: boolean;
    canManageActivities: boolean;
    canManageGallery: boolean;
    canManagePartners: boolean;
    canManageSocialLinks: boolean;
    canManageNews: boolean;
    canViewSubmissions: boolean;
    canManageSettings: boolean;
    canManageHistory: boolean;
};

type AdminNavProps = {
    name: string;
    isSuperAdmin: boolean;
    permissions: Permission;
};

type LinkItem = { href: string; label: string; show: boolean };
type MenuGroup = { label: string; items: LinkItem[] };

export function AdminNav({ name, isSuperAdmin, permissions: p }: AdminNavProps) {
    const pathname = usePathname();
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [openGroup, setOpenGroup] = useState<string | null>(null);
    const [mobileOpen, setMobileOpen] = useState(false);
    const navRef = useRef<HTMLDivElement>(null);

    // Close dropdowns on outside click
    useEffect(() => {
        const onClick = (e: MouseEvent) => {
            if (navRef.current && !navRef.current.contains(e.target as Node)) {
                setOpenGroup(null);
            }
        };
        document.addEventListener("mousedown", onClick);
        return () => document.removeEventListener("mousedown", onClick);
    }, []);

    // Close any open menu on route change
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setOpenGroup(null);
        setMobileOpen(false);
    }, [pathname]);

    const groups: MenuGroup[] = [
        {
            label: "Group",
            items: [
                { href: "/admin/units", label: "Units", show: p.canManageUnits },
                { href: "/admin/members", label: "Members", show: p.canManageMembers },
                { href: "/admin/activities", label: "Activities", show: p.canManageActivities },
            ],
        },
        {
            label: "Content",
            items: [
                { href: "/admin/gallery", label: "Gallery", show: p.canManageGallery },
                { href: "/admin/news", label: "News", show: p.canManageNews },
                { href: "/admin/history", label: "History", show: p.canManageHistory },
                { href: "/admin/partners", label: "Partners", show: p.canManagePartners },
                { href: "/admin/social-links", label: "Social Links", show: p.canManageSocialLinks },
            ],
        },
        {
            label: "Site",
            items: [
                { href: "/admin/about", label: "About Page", show: p.canManageSettings },
                { href: "/admin/settings", label: "Settings", show: p.canManageSettings },
                { href: "/admin/submissions", label: "Submissions", show: p.canViewSubmissions },
            ],
        },
    ].map(g => ({ ...g, items: g.items.filter(i => i.show) }))
     .filter(g => g.items.length > 0);

    function go(href: string) {
        setOpenGroup(null);
        setMobileOpen(false);
        startTransition(() => router.push(href));
    }

    const isActive = (href: string) => pathname === href || pathname?.startsWith(href + "/");
    const groupHasActive = (group: MenuGroup) => group.items.some(i => isActive(i.href));

    return (
        <nav
            ref={navRef}
            className="border-b bg-background/95 backdrop-blur-md sticky top-0 z-50"
        >
            {/* Top-of-page progress bar while a navigation is pending */}
            {isPending && (
                <div className="absolute top-0 left-0 right-0 h-0.5 overflow-hidden">
                    <div className="h-full w-1/3 bg-primary animate-[loading_1.2s_ease-in-out_infinite]" />
                </div>
            )}

            <div className="container mx-auto flex h-14 items-center justify-between px-4 gap-2">
                <div className="flex items-center gap-1 min-w-0">
                    <Link
                        href="/admin"
                        className="text-base font-bold text-primary mr-3 shrink-0 inline-flex items-center gap-1.5"
                        prefetch
                    >
                        <Shield className="w-4 h-4" /> Admin
                    </Link>

                    {/* Desktop menu */}
                    <div className="hidden md:flex items-center gap-1">
                        {groups.map(group => {
                            const active = groupHasActive(group);
                            const open = openGroup === group.label;
                            return (
                                <div key={group.label} className="relative">
                                    <button
                                        onClick={() => setOpenGroup(open ? null : group.label)}
                                        onMouseEnter={() => setOpenGroup(group.label)}
                                        className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                                            active
                                                ? "text-primary bg-primary/10"
                                                : "text-muted-foreground hover:text-primary hover:bg-primary/5"
                                        }`}
                                    >
                                        {group.label}
                                        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
                                    </button>
                                    {open && (
                                        <div
                                            onMouseLeave={() => setOpenGroup(null)}
                                            className="absolute left-0 top-full mt-1 w-52 rounded-xl border bg-card shadow-lg shadow-black/5 p-1.5 animate-fade-in z-50"
                                        >
                                            {group.items.map(item => (
                                                <button
                                                    key={item.href}
                                                    onClick={() => go(item.href)}
                                                    className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                                                        isActive(item.href)
                                                            ? "bg-primary/10 text-primary"
                                                            : "hover:bg-muted text-foreground"
                                                    }`}
                                                >
                                                    {item.label}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {isSuperAdmin && (
                            <button
                                onClick={() => go("/admin/users")}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                                    isActive("/admin/users")
                                        ? "text-primary bg-primary/10"
                                        : "text-muted-foreground hover:text-primary hover:bg-primary/5"
                                }`}
                            >
                                Users
                            </button>
                        )}
                    </div>

                    {/* Mobile burger */}
                    <button
                        className="md:hidden p-2 rounded-md hover:bg-muted transition-colors ml-auto"
                        onClick={() => setMobileOpen(o => !o)}
                        aria-label="Menu"
                    >
                        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                    </button>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-muted-foreground hidden lg:inline truncate max-w-[200px]">
                        {isSuperAdmin ? "Super Admin" : "Admin"}: {name}
                    </span>
                    <Link
                        href="/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-muted-foreground hover:text-primary transition-colors hidden sm:inline"
                    >
                        View Site ↗
                    </Link>
                    <AdminLogout />
                </div>
            </div>

            {/* Mobile dropdown */}
            {mobileOpen && (
                <div className="md:hidden border-t bg-background animate-fade-in">
                    <div className="container mx-auto px-4 py-3 space-y-4">
                        {groups.map(group => (
                            <div key={group.label}>
                                <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1.5 px-2">
                                    {group.label}
                                </div>
                                <div className="space-y-0.5">
                                    {group.items.map(item => (
                                        <button
                                            key={item.href}
                                            onClick={() => go(item.href)}
                                            className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium ${
                                                isActive(item.href)
                                                    ? "bg-primary/10 text-primary"
                                                    : "hover:bg-muted text-foreground"
                                            }`}
                                        >
                                            {item.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                        {isSuperAdmin && (
                            <div>
                                <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1.5 px-2">
                                    Admin
                                </div>
                                <button
                                    onClick={() => go("/admin/users")}
                                    className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium ${
                                        isActive("/admin/users")
                                            ? "bg-primary/10 text-primary"
                                            : "hover:bg-muted text-foreground"
                                    }`}
                                >
                                    Users
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </nav>
    );
}
