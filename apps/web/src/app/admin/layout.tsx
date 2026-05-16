import { getSession, isAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminNav } from "./admin-nav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
    const session = await getSession();

    if (!session) {
        redirect("/login");
    }

    if (!isAdmin(session)) {
        redirect("/");
    }

    return (
        <div className="min-h-screen flex flex-col">
            <AdminNav
                name={session.name}
                isSuperAdmin={session.isSuperAdmin}
                permissions={session.permissions}
            />
            <main className="flex-1 container mx-auto px-4 py-8">
                {children}
            </main>
        </div>
    );
}
