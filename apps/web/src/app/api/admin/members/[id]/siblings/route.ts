import { prisma } from "@/db";
import { getSession, hasPermission, canAccessUnit } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getSession();
        if (!hasPermission(session, "canManageMembers")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const member = await prisma.member.findUnique({ where: { id } });
        if (!member) return NextResponse.json({ error: "Not found" }, { status: 404 });
        if (!canAccessUnit(session, member.unitId)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const body = await request.json();
        const { name, schoolClass, unitName } = body;

        if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

        const sibling = await prisma.groupSibling.create({
            data: { memberId: id, name, schoolClass: schoolClass || null, unitName: unitName || null },
        });
        return NextResponse.json(sibling);
    } catch (error) {
        console.error("Error creating sibling:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
