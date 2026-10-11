import { prisma } from "@/db";
import { getSession, hasPermission } from "@/lib/auth";
import { ARCHIVE_UNIT_TYPE } from "@/lib/scout-config";
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

/**
 * Anciens are former members — Members with status "LEFT". There is no separate
 * alumni table any more, so these endpoints read and write the member record.
 *
 * The usual way someone becomes an ancien is Transitions → Leaving. POST here
 * covers the other case: a historical ancien who was never in the system.
 */


export async function GET() {
    try {
        const session = await getSession();
        if (!hasPermission(session, "canManageHistory")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const anciens = await prisma.member.findMany({
            where: { status: "LEFT" },
            select: {
                id: true, firstName: true, lastName: true, gender: true,
                joinedAt: true, leftAt: true, leftNote: true,
                progressions: true, scoutRolesHistory: true, professions: true,
                phone: true, email: true, photoUrl: true, bio: true,
                ancienSortOrder: true, hiddenFromAnciens: true,
                unit: { select: { id: true, name: true, unitType: true } },
            },
            orderBy: [{ ancienSortOrder: "asc" }, { lastName: "asc" }, { firstName: "asc" }],
        });

        return NextResponse.json(anciens);
    } catch (error) {
        console.error("Error fetching anciens:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

/** Find (or create) the unit used for anciens whose original unit is unknown. */
async function holdingUnitId(): Promise<string> {
    // Identified by type, so it can never be confused with a real unit that
    // happens to share a name, and never duplicated by a rename.
    const existing = await prisma.unit.findFirst({
        where: { unitType: ARCHIVE_UNIT_TYPE },
        orderBy: { createdAt: "asc" },
        select: { id: true },
    });
    if (existing) return existing.id;

    const created = await prisma.unit.create({
        data: {
            name: "Anciens",
            unitType: ARCHIVE_UNIT_TYPE,
            description:
                "System unit: holds former members whose original unit was not recorded. " +
                "Hidden from every list.",
        },
        select: { id: true },
    });
    return created.id;
}

export async function POST(request: NextRequest) {
    try {
        const session = await getSession();
        if (!hasPermission(session, "canManageHistory")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const {
            firstName, lastName, gender, joinedYear, leftYear, progressions,
            scoutRolesHistory, professions, phone, email, photoUrl, bio, unitId,
        } = body;

        if (!firstName?.trim()) {
            return NextResponse.json({ error: "First name is required" }, { status: 400 });
        }

        // Their former unit if known, otherwise the holding unit.
        const targetUnitId = unitId || await holdingUnitId();

        const last = await prisma.member.findFirst({
            where: { status: "LEFT" },
            orderBy: { ancienSortOrder: "desc" },
            select: { ancienSortOrder: true },
        });

        const ancien = await prisma.member.create({
            data: {
                firstName: firstName.trim(),
                lastName: (lastName || "").trim() || "-",
                gender: gender || null,
                unitId: targetUnitId,
                status: "LEFT",
                // Only the year is known; 1 September matches the scouting year.
                joinedAt: joinedYear ? new Date(Date.UTC(joinedYear, 8, 1)) : new Date(),
                leftAt: leftYear ? new Date(Date.UTC(leftYear, 5, 30)) : new Date(),
                progressions: Array.isArray(progressions) ? progressions : [],
                scoutRolesHistory: scoutRolesHistory ?? [],
                professions: professions ?? [],
                phone: phone || null,
                email: email || null,
                photoUrl: photoUrl || null,
                bio: bio || null,
                ancienSortOrder: (last?.ancienSortOrder ?? -1) + 1,
            },
        });

        revalidatePath("/history");

        return NextResponse.json(ancien);
    } catch (error) {
        console.error("Error creating ancien:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
