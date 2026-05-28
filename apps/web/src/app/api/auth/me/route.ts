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

    return NextResponse.json({ user }, {
        headers: { "Cache-Control": AUTH_CACHE },
    });
}
