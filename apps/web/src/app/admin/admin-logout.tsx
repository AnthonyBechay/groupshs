"use client";

import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export function AdminLogout() {
    async function handleLogout() {
        await fetch("/api/auth/logout", { method: "POST" });
        // replace(): after signing out, Back must not return to an admin page
        // (which would bounce straight to /login again, or worse, show a stale
        // copy of it from the browser's back/forward cache).
        window.location.replace("/login");
    }

    return (
        <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-2">
            <LogOut className="w-4 h-4" /> Logout
        </Button>
    );
}
