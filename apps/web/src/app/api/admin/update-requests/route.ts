import { prisma } from "@/db";
import { getSession, hasPermission, canAccessUnit } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
import { changeCount, linkState, type SubmittedChanges } from "@/lib/member-update";
import { createUpdateLink, linkUrl, validityDays } from "@/lib/member-update-service";

/** Restrict to the units this user may access. */
function scope(session: { isSuperAdmin: boolean; allowedUnitIds: string[] }): Prisma.MemberWhereInput {
    if (session.isSuperAdmin || session.allowedUnitIds.length === 0) return {};
    return { unitId: { in: session.allowedUnitIds } };
}

/**
 * GET ?status=SUBMITTED|OPEN|all&unitId= — the review inbox, and the links
 * still waiting for a family.
 */
export async function GET(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session || !hasPermission(session, "canManageMembers")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const sp = new URL(request.url).searchParams;
        const status = sp.get("status") ?? "SUBMITTED";
        const unitId = sp.get("unitId");

        const memberWhere: Prisma.MemberWhereInput = { ...scope(session), ...(unitId ? { unitId } : {}) };
        const rows = await prisma.memberUpdateRequest.findMany({
            where: { member: memberWhere, ...(status === "all" ? {} : { status }) },
            include: { member: { select: { id: true, firstName: true, lastName: true, unit: { select: { id: true, name: true, unitType: true } } } } },
            orderBy: status === "SUBMITTED" ? { submittedAt: "asc" } : { createdAt: "desc" },
            take: 300,
        });
        return NextResponse.json(rows.map(r => ({
            id: r.id, status: r.status, state: linkState(r), sentTo: r.sentTo,
            createdAt: r.createdAt, expiresAt: r.expiresAt, submittedAt: r.submittedAt, submittedBy: r.submittedBy,
            reviewedAt: r.reviewedAt, reviewedByName: r.reviewedByName, createdByName: r.createdByName,
            changeCount: changeCount(r.changes as unknown as SubmittedChanges),
            url: linkUrl(r.token),
            member: r.member,
        })));
    } catch (error) {
        console.error("Error listing update requests:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

/**
 * POST { unitId, days, only: "missing" | "all" } — a link for every member of a
 * unit at once ("missing" = no open link and an incomplete file), so a leader
 * can paste them into the families' chat in one go.
 */
export async function POST(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session || !hasPermission(session, "canManageMembers")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const body = await request.json().catch(() => ({}));
        if (!body.unitId || !canAccessUnit(session, body.unitId)) {
            return NextResponse.json({ error: "Pick a unit you can access" }, { status: 403 });
        }

        const members = await prisma.member.findMany({
            where: { unitId: body.unitId, status: "ACTIVE" },
            select: {
                id: true, firstName: true, lastName: true, emergencyContactPhone: true, doctorPhone: true, bloodType: true, dateOfBirth: true,
                // Already out: a live link, or answers still waiting for review.
                updateRequests: {
                    where: { OR: [{ status: "SUBMITTED" }, { status: "OPEN", expiresAt: { gt: new Date() } }] },
                    select: { id: true },
                },
            },
            orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
        });
        const targets = body.only === "all"
            ? members
            : members.filter(m => m.updateRequests.length === 0
                && (!m.emergencyContactPhone || !m.doctorPhone || !m.bloodType || !m.dateOfBirth));

        const days = validityDays(body.days);
        const links = [];
        for (const m of targets) {
            const l = await createUpdateLink(m.id, { days, sentTo: "Family" }, session);
            links.push({ memberId: m.id, name: `${m.firstName} ${m.lastName}`, url: l.url, expiresAt: l.expiresAt });
        }
        return NextResponse.json({ created: links.length, skipped: members.length - targets.length, links });
    } catch (error) {
        console.error("Error creating update links:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
