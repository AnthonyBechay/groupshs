import { prisma } from "@/db";
import { getSession, hasPermission, canAccessUnit } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma/client";

const STRING_FIELDS = [
    "placeOfBirth", "email", "bloodType",
    "city", "street", "building", "floor", "homePhone",
    "doctorName", "doctorPhone", "doctorClinicAddress",
    "emergencyContactName", "emergencyContactRelation", "emergencyContactPhone",
    "fatherName", "fatherPhone", "fatherProfession", "fatherEmail", "fatherOldScout",
    "motherName", "motherPhone", "motherProfession", "motherEmail", "motherOldScout",
    "allergySeasonal", "allergyMedication", "allergyFood", "allergyAnimals",
    "chronicIllnesses", "sportsToAvoid", "previousSurgeries", "antiTetanusDate",
    "legalGuardianName", "photoUrl",
] as const;

export async function GET(request: NextRequest) {
    try {
        const session = await getSession();
        if (!hasPermission(session, "canManageMembers")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const unitId = searchParams.get("unitId");
        const includeSheet = searchParams.get("includeSheet") === "true";

        const where: Record<string, unknown> = {};
        if (unitId) where.unitId = unitId;
        if (session && !session.isSuperAdmin && session.allowedUnitIds.length > 0) {
            where.unitId = { in: session.allowedUnitIds };
        }

        const members = await prisma.member.findMany({
            where,
            include: {
                unit: { select: { name: true, unitType: true } },
                subgroup: { select: { id: true, name: true } },
                ...(includeSheet ? {
                    groupSiblings: true,
                    medications: true,
                    moves: { orderBy: { moveDate: "desc" } },
                } : {}),
            },
            orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
        });

        return NextResponse.json(members);
    } catch (error) {
        console.error("Error fetching members:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await getSession();
        if (!hasPermission(session, "canManageMembers")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { firstName, lastName, dateOfBirth, phone, role, progressions, unitId, subgroupId, joinedAt } = body;

        if (!firstName || !lastName || !unitId) {
            return NextResponse.json({ error: "First name, last name, and unit are required" }, { status: 400 });
        }

        if (!canAccessUnit(session, unitId)) {
            return NextResponse.json({ error: "Forbidden: cannot manage this unit" }, { status: 403 });
        }

        const data: Prisma.MemberUncheckedCreateInput = {
            firstName,
            lastName,
            dateOfBirth: dateOfBirth || null,
            phone: phone || null,
            role: role || null,
            progressions: Array.isArray(progressions) ? progressions : [],
            unitId,
            subgroupId: subgroupId || null,
            joinedAt: joinedAt ? new Date(joinedAt) : new Date(),
            numberOfBrothers: typeof body.numberOfBrothers === "number" ? body.numberOfBrothers : null,
            numberOfSisters: typeof body.numberOfSisters === "number" ? body.numberOfSisters : null,
            consentSignedAt: body.consentSignedAt ? new Date(body.consentSignedAt) : null,
        };
        for (const f of STRING_FIELDS) {
            if (f in body) (data as Record<string, unknown>)[f] = body[f] || null;
        }

        const member = await prisma.member.create({ data });

        return NextResponse.json(member);
    } catch (error) {
        console.error("Error creating member:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
