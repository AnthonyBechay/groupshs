import { prisma } from "@/db";
import { getSession, hasPermission, canAccessUnit } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string; mid: string }> }) {
    try {
        const session = await getSession();
        if (!hasPermission(session, "canManageMembers")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id, mid } = await params;
        const member = await prisma.member.findUnique({ where: { id } });
        if (!member) return NextResponse.json({ error: "Not found" }, { status: 404 });
        if (!canAccessUnit(session, member.unitId)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        await prisma.memberMedication.delete({ where: { id: mid } });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting medication:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
