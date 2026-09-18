import { getSession, hasPermission } from "@/lib/auth";
import { redirect } from "next/navigation";

/**
 * Hiding the nav link is not access control — the page must refuse to render
 * for anyone without the permission, or the URL alone would get them in.
 */
export default async function TransitionsLayout({ children }: { children: React.ReactNode }) {
    const session = await getSession();
    if (!hasPermission(session, "canManageTransitions")) {
        redirect("/admin");
    }
    return <>{children}</>;
}
