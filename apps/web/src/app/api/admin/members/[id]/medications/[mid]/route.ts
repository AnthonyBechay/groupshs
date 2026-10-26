import { prisma } from "@/db";
import { getSession, hasPermission, canAccessUnit } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { recordListChange } from "@/lib/member-history";
import { describeMedication } from "@/lib/member-update";

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

        // Scoped to this member: the id in the URL is what the access check
        // looked at, so it must also be the record's owner.
        const med = await prisma.memberMedication.findFirst({ where: { id: mid, memberId: id } });
        if (!med) return NextResponse.json({ error: "Not found" }, { status: 404 });
        await prisma.$transaction(async (tx) => {
            await tx.memberMedication.delete({ where: { id: med.id } });
            await recordListChange(tx, id, "medications", { removed: describeMedication(med) },
                { source: "ADMIN", id: session?.userId, name: session?.name });
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting medication:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
