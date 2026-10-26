import { prisma } from "@/db";
import { getSession, hasPermission, canAccessUnit } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { linkState } from "@/lib/member-update";
import { createUpdateLink, linkUrl, validityDays } from "@/lib/member-update-service";

type Params = { params: Promise<{ id: string }> };

async function guard(params: Params["params"]) {
    const session = await getSession();
    if (!hasPermission(session, "canManageMembers")) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
    const { id } = await params;
    const member = await prisma.member.findUnique({ where: { id }, select: { id: true, unitId: true, status: true } });
    if (!member) return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) };
    if (!canAccessUnit(session, member.unitId)) return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
    return { session: session!, member };
}

/** GET — this member's links, newest first. */
export async function GET(_: NextRequest, { params }: Params) {
    try {
        const g = await guard(params);
        if (g.error) return g.error;
        const rows = await prisma.memberUpdateRequest.findMany({
            where: { memberId: g.member.id },
            orderBy: { createdAt: "desc" },
            take: 10,
        });
        return NextResponse.json(rows.map(r => ({ ...r, state: linkState(r), url: linkUrl(r.token) })));
    } catch (error) {
        console.error("Error listing update links:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

/** POST { days, sentTo } — open a new link (revoking any open one). */
export async function POST(request: NextRequest, { params }: Params) {
    try {
        const g = await guard(params);
        if (g.error) return g.error;
        if (g.member.status !== "ACTIVE") return NextResponse.json({ error: "This member has left the group" }, { status: 400 });
        const body = await request.json().catch(() => ({}));
        const link = await createUpdateLink(g.member.id, { days: validityDays(body.days), sentTo: body.sentTo }, g.session);
        return NextResponse.json({ ...link, state: "OPEN" });
    } catch (error) {
        console.error("Error creating update link:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
