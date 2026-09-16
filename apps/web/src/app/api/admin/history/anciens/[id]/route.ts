import { prisma } from "@/db";
import { getSession, hasPermission } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

/**
 * An ancien is a Member with status "LEFT", so these operate on the member.
 *
 * Note the asymmetry with the old alumni table: DELETE here removes them from
 * the Anciens list, it does NOT delete the person. Their file, attendance and
 * move history are never destroyed from this screen.
 */

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getSession();
        if (!hasPermission(session, "canManageHistory")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const body = await request.json();
        const {
            firstName, lastName, gender, joinedYear, leftYear, progressions,
            scoutRolesHistory, professions, phone, email, photoUrl, bio,
            hiddenFromAnciens,
        } = body;

        const existing = await prisma.member.findUnique({
            where: { id },
            select: { id: true, status: true },
        });
        if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
        if (existing.status !== "LEFT") {
            return NextResponse.json(
                { error: "This member is still active. Record their departure in Transitions → Leaving first." },
                { status: 409 }
            );
        }

        if (firstName !== undefined && !firstName?.trim()) {
            return NextResponse.json({ error: "First name is required" }, { status: 400 });
        }

        const data: Record<string, unknown> = {};
        if (firstName !== undefined) data.firstName = firstName.trim();
        if (lastName !== undefined) data.lastName = (lastName || "").trim() || "-";
        if (gender !== undefined) data.gender = gender || null;
        if (joinedYear !== undefined) data.joinedAt = joinedYear ? new Date(Date.UTC(joinedYear, 8, 1)) : undefined;
        if (leftYear !== undefined) data.leftAt = leftYear ? new Date(Date.UTC(leftYear, 5, 30)) : null;
        if (progressions !== undefined) data.progressions = Array.isArray(progressions) ? progressions : [];
        if (scoutRolesHistory !== undefined) data.scoutRolesHistory = scoutRolesHistory ?? [];
        if (professions !== undefined) data.professions = professions ?? [];
        if (phone !== undefined) data.phone = phone || null;
        if (email !== undefined) data.email = email || null;
        if (photoUrl !== undefined) data.photoUrl = photoUrl || null;
        if (bio !== undefined) data.bio = bio || null;
        if (hiddenFromAnciens !== undefined) data.hiddenFromAnciens = !!hiddenFromAnciens;

        const ancien = await prisma.member.update({ where: { id }, data });

        revalidatePath("/history");

        return NextResponse.json(ancien);
    } catch (error) {
        console.error("Error updating ancien:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

/**
 * Hides a former member from the public Anciens list. Deliberately does NOT
 * delete the person — deleting a member is done from the member page, on
 * purpose, so an alumni-list tidy-up can never destroy someone's record.
 */
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getSession();
        if (!hasPermission(session, "canManageHistory")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const existing = await prisma.member.findUnique({
            where: { id },
            select: { id: true, status: true },
        });
        if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

        await prisma.member.update({
            where: { id },
            data: { hiddenFromAnciens: true },
        });

        revalidatePath("/history");

        return NextResponse.json({ ok: true, hidden: true });
    } catch (error) {
        console.error("Error hiding ancien:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
