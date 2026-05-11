"use client";

import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export function AdminLogout() {
    async function handleLogout() {
        await fetch("/api/auth/logout", { method: "POST" });
        window.location.href = "/login";
    }

    return (
        <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-2">
            <LogOut className="w-4 h-4" /> Logout
        </Button>
    );
}
