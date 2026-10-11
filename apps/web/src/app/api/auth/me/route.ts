import { getSession } from "@/lib/auth";
import { prisma } from "@/db";
import { NextResponse } from "next/server";

// Cache-Control: private (per-browser) so repeated same-tab navigations skip the DB.
// max-age=30: serve cached for 30s. stale-while-revalidate=60: serve stale + refresh in background.
const AUTH_CACHE = "private, max-age=30, stale-while-revalidate=60";

export async function GET() {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ user: null }, {
            headers: { "Cache-Control": AUTH_CACHE },
        });
    }

    const user = await prisma.user.findUnique({
        where: { id: session.userId },
        select: { id: true, name: true, email: true, role: true },
    });

    // isSuperAdmin lets the UI hide what only the super admin may do (the
    // API enforces it regardless).
    return NextResponse.json({ user: user && { ...user, isSuperAdmin: session.isSuperAdmin } }, {
        headers: { "Cache-Control": AUTH_CACHE },
    });
}
