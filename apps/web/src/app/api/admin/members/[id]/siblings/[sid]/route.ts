import { prisma } from "@/db";
import { getSession, hasPermission, canAccessUnit } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { recordListChange } from "@/lib/member-history";
import { describeSibling } from "@/lib/member-update";

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string; sid: string }> }) {
    try {
        const session = await getSession();
        if (!hasPermission(session, "canManageMembers")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id, sid } = await params;
        const member = await prisma.member.findUnique({ where: { id } });
        if (!member) return NextResponse.json({ error: "Not found" }, { status: 404 });
        if (!canAccessUnit(session, member.unitId)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Scoped to this member, whose unit the access check just looked at.
        const sibling = await prisma.groupSibling.findFirst({ where: { id: sid, memberId: id } });
        if (!sibling) return NextResponse.json({ error: "Not found" }, { status: 404 });
        await prisma.$transaction(async (tx) => {
            await tx.groupSibling.delete({ where: { id: sibling.id } });
            await recordListChange(tx, id, "siblings", { removed: describeSibling(sibling) },
                { source: "ADMIN", id: session?.userId, name: session?.name });
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting sibling:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
