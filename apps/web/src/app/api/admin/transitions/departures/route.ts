import { prisma } from "@/db";
import { getSession, hasPermission, canAccessUnit } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

/**
 * Leaving the group → becoming an Ancien.
 *
 * Open to ANY member regardless of branch or role: an Eclaireur who stops
 * scouting, a CT stepping down, a Routier finishing their Départ. The member
 * row is never deleted — it is marked LEFT (so the medical file, attendance and
 * move history survive) and mirrored into an `ancien` record for the Anciens
 * page. The whole thing is reversible.
 *
 * GET  → active members who could leave
 * POST → perform the departure(s)
 */

type ScoutRoleEntry = { role: string; startYear: string; endYear: string };

/**
 * Reconstruct the chronological list of roles a member held, from their move
 * history plus the role they hold right now.
 */
function buildScoutRoleHistory(
    joinedAt: Date,
    currentRole: string | null,
    moves: { moveDate: Date; fromRole: string | null; toRole: string | null }[],
    leftYear: number
): ScoutRoleEntry[] {
    const entries: ScoutRoleEntry[] = [];
    let periodStart = new Date(joinedAt).getUTCFullYear();

    for (const mv of moves) {
        if (!mv.fromRole || mv.fromRole === mv.toRole) continue;
        const year = new Date(mv.moveDate).getUTCFullYear();
        entries.push({
            role: mv.fromRole,
            startYear: String(periodStart),
            endYear: String(year),
        });
        periodStart = year;
    }

    if (currentRole) {
        entries.push({
            role: currentRole,
            startYear: String(periodStart),
            endYear: String(leftYear),
        });
    }

    // Collapse consecutive duplicates of the same role into one span.
    return entries.reduce<ScoutRoleEntry[]>((acc, e) => {
        const prev = acc[acc.length - 1];
        if (prev && prev.role === e.role) prev.endYear = e.endYear;
        else acc.push(e);
        return acc;
    }, []);
}

export async function GET() {
    try {
        const session = await getSession();
        if (!hasPermission(session, "canManageMembers")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const members = await prisma.member.findMany({
            where: { status: "ACTIVE" },
            select: {
                id: true, firstName: true, lastName: true, role: true, photoUrl: true,
                dateOfBirth: true, joinedAt: true, progressions: true,
                unit: { select: { id: true, name: true, unitType: true } },
            },
            orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
        });

        return NextResponse.json(members);
    } catch (error) {
        console.error("Error loading departure candidates:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await getSession();
        if (!hasPermission(session, "canManageMembers")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        // Writing to the Anciens list is a history operation.
        if (!hasPermission(session, "canManageHistory")) {
            return NextResponse.json(
                { error: "You also need permission to manage History to create Anciens" },
                { status: 403 }
            );
        }

        const body = await request.json();
        const {
            memberIds, leftYear, note, createAncien = true,
        } = body as { memberIds?: string[]; leftYear?: number; note?: string; createAncien?: boolean };

        if (!Array.isArray(memberIds) || memberIds.length === 0) {
            return NextResponse.json({ error: "No members selected" }, { status: 400 });
        }

        const members = await prisma.member.findMany({
            where: { id: { in: memberIds }, status: "ACTIVE" },
            select: {
                id: true, firstName: true, lastName: true, role: true, photoUrl: true,
                phone: true, email: true, joinedAt: true, progressions: true, unitId: true,
                moves: {
                    select: { moveDate: true, fromRole: true, toRole: true },
                    orderBy: { moveDate: "asc" },
                },
            },
        });

        if (members.length !== memberIds.length) {
            return NextResponse.json(
                { error: "One or more members are already inactive — refresh and try again" },
                { status: 409 }
            );
        }
        for (const m of members) {
            if (!canAccessUnit(session, m.unitId)) {
                return NextResponse.json({ error: "Forbidden: one of these members is outside your units" }, { status: 403 });
            }
        }

        const now = new Date();
        const year = typeof leftYear === "number" ? leftYear : now.getUTCFullYear();

        const created = await prisma.$transaction(async (tx) => {
            const out: { memberId: string; ancienId: string | null; name: string }[] = [];

            // Append new Anciens after the existing ones.
            let sortOrder = createAncien
                ? ((await tx.ancien.findFirst({ orderBy: { sortOrder: "desc" }, select: { sortOrder: true } }))?.sortOrder ?? -1) + 1
                : 0;

            for (const m of members) {
                let ancienId: string | null = null;

                if (createAncien) {
                    const ancien = await tx.ancien.create({
                        data: {
                            name: `${m.firstName} ${m.lastName}`.trim(),
                            joinedYear: new Date(m.joinedAt).getUTCFullYear(),
                            leftYear: year,
                            progression: m.progressions ?? [],
                            scoutRoles: buildScoutRoleHistory(m.joinedAt, m.role, m.moves, year),
                            professions: [],
                            phone: m.phone,
                            email: m.email,
                            photoUrl: m.photoUrl,
                            bio: null,
                            sortOrder: sortOrder++,
                            sourceMemberId: m.id,
                        },
                        select: { id: true },
                    });
                    ancienId = ancien.id;
                }

                await tx.member.update({
                    where: { id: m.id },
                    data: {
                        status: "LEFT",
                        leftAt: now,
                        leftNote: note || null,
                        ancienId,
                    },
                });

                out.push({ memberId: m.id, ancienId, name: `${m.firstName} ${m.lastName}` });
            }

            return out;
        });

        revalidatePath("/history");
        revalidatePath("/units/[id]", "page");

        return NextResponse.json({ departed: created.length, members: created });
    } catch (error) {
        console.error("Error processing departures:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

/**
 * DELETE /api/admin/transitions/departures?memberId=...  — undo a departure.
 * Reactivates the member and removes the Ancien record that was generated.
 */
export async function DELETE(request: NextRequest) {
    try {
        const session = await getSession();
        if (!hasPermission(session, "canManageMembers")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const memberId = new URL(request.url).searchParams.get("memberId");
        if (!memberId) return NextResponse.json({ error: "memberId is required" }, { status: 400 });

        const member = await prisma.member.findUnique({
            where: { id: memberId },
            select: { id: true, status: true, ancienId: true, unitId: true },
        });
        if (!member) return NextResponse.json({ error: "Member not found" }, { status: 404 });
        if (member.status !== "LEFT") {
            return NextResponse.json({ error: "This member has not left the group" }, { status: 409 });
        }
        if (!canAccessUnit(session, member.unitId)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        await prisma.$transaction(async (tx) => {
            await tx.member.update({
                where: { id: memberId },
                data: { status: "ACTIVE", leftAt: null, leftNote: null, ancienId: null },
            });
            // Only remove the Ancien this flow generated — never a hand-written one.
            await tx.ancien.deleteMany({ where: { sourceMemberId: memberId } });
        });

        revalidatePath("/history");

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error("Error undoing departure:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
