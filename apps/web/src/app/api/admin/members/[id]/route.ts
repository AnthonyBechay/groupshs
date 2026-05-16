import { prisma } from "@/db";
import { getSession, hasPermission, canAccessUnit } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

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

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getSession();
        if (!hasPermission(session, "canManageMembers")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const member = await prisma.member.findUnique({
            where: { id },
            include: {
                unit: { select: { id: true, name: true, unitType: true } },
                subgroup: { select: { id: true, name: true } },
                groupSiblings: { orderBy: { createdAt: "asc" } },
                medications: { orderBy: { createdAt: "asc" } },
                moves: {
                    orderBy: { moveDate: "desc" },
                },
            },
        });
        if (!member) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }
        if (!canAccessUnit(session, member.unitId)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        return NextResponse.json(member);
    } catch (error) {
        console.error("Error fetching member:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getSession();
        if (!hasPermission(session, "canManageMembers")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const body = await request.json();

        const existing = await prisma.member.findUnique({ where: { id } });
        if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
        if (!canAccessUnit(session, existing.unitId)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const sameArr = (a: string[], b: string[]) => a.length === b.length && a.every((v, i) => v === b[i]);

        // Detect move-worthy changes (unit, subgroup, role, progression)
        const moveData: Record<string, unknown> = {};
        const moves: string[] = [];
        if ("unitId" in body && body.unitId && body.unitId !== existing.unitId) {
            if (!canAccessUnit(session, body.unitId)) {
                return NextResponse.json({ error: "Forbidden: target unit not allowed" }, { status: 403 });
            }
            moveData.fromUnitId = existing.unitId;
            moveData.toUnitId = body.unitId;
            moves.push("unit");
        }
        if ("subgroupId" in body && (body.subgroupId || null) !== (existing.subgroupId || null)) {
            moveData.fromSubgroupId = existing.subgroupId;
            moveData.toSubgroupId = body.subgroupId || null;
            moves.push("subgroup");
        }
        if ("role" in body && (body.role || null) !== (existing.role || null)) {
            moveData.fromRole = existing.role;
            moveData.toRole = body.role || null;
            moves.push("role");
        }
        if ("progressions" in body) {
            const next: string[] = Array.isArray(body.progressions) ? body.progressions : [];
            if (!sameArr(existing.progressions || [], next)) {
                moveData.fromProgression = existing.progressions || [];
                moveData.toProgression = next;
                moves.push("progression");
            }
        }

        const data: Record<string, unknown> = {};
        if ("firstName" in body) data.firstName = body.firstName;
        if ("lastName" in body) data.lastName = body.lastName;
        if ("dateOfBirth" in body) data.dateOfBirth = body.dateOfBirth || null;
        if ("phone" in body) data.phone = body.phone || null;
        if ("role" in body) data.role = body.role || null;
        if ("progressions" in body) data.progressions = Array.isArray(body.progressions) ? body.progressions : [];
        if ("unitId" in body && body.unitId) data.unitId = body.unitId;
        if ("subgroupId" in body) data.subgroupId = body.subgroupId || null;
        if ("joinedAt" in body && body.joinedAt) data.joinedAt = new Date(body.joinedAt);
        if ("numberOfBrothers" in body) data.numberOfBrothers = typeof body.numberOfBrothers === "number" ? body.numberOfBrothers : null;
        if ("numberOfSisters" in body) data.numberOfSisters = typeof body.numberOfSisters === "number" ? body.numberOfSisters : null;
        if ("consentSignedAt" in body) data.consentSignedAt = body.consentSignedAt ? new Date(body.consentSignedAt) : null;
        for (const f of STRING_FIELDS) {
            if (f in body) data[f] = body[f] || null;
        }

        const updated = await prisma.$transaction(async (tx) => {
            const m = await tx.member.update({ where: { id }, data });
            if (moves.length > 0) {
                await tx.memberMove.create({
                    data: {
                        memberId: id,
                        ...moveData,
                        moveDate: body.moveDate ? new Date(body.moveDate) : new Date(),
                        notes: body.moveNotes || null,
                    },
                });
            }
            return m;
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error("Error updating member:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getSession();
        if (!hasPermission(session, "canManageMembers")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const existing = await prisma.member.findUnique({ where: { id } });
        if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
        if (!canAccessUnit(session, existing.unitId)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        await prisma.member.delete({ where: { id } });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting member:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
