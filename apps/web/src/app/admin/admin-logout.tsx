"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export function AdminLogout() {
    const router = useRouter();

    async function handleLogout() {
        await fetch("/api/auth/logout", { method: "POST" });
        router.push("/login");
        router.refresh();
    }

    return (
        <Button variant="ghost" size="sm" onClick={handleLogout}>
            Logout
        </Button>
    );
}
