import { prisma } from "@/db";
import { getSession, hasPermission, canAccessUnit } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { historyFieldLabel } from "@/lib/member-history";

/** GET — every recorded change to this member's file, newest first. */
export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getSession();
        if (!hasPermission(session, "canManageMembers")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const { id } = await params;
        const member = await prisma.member.findUnique({ where: { id }, select: { unitId: true } });
        if (!member) return NextResponse.json({ error: "Not found" }, { status: 404 });
        if (!canAccessUnit(session, member.unitId)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

        const rows = await prisma.memberChange.findMany({ where: { memberId: id }, orderBy: { createdAt: "desc" }, take: 300 });

        // "Unit led" is stored as an id; show the unit's name.
        const unitIds = [...new Set(rows.filter(r => r.field === "servesUnitId").flatMap(r => [r.oldValue, r.newValue]).filter((v): v is string => !!v))];
        const units = unitIds.length ? await prisma.unit.findMany({ where: { id: { in: unitIds } }, select: { id: true, name: true } }) : [];
        const unitName = (v: string | null) => (v ? units.find(u => u.id === v)?.name ?? v : v);

        return NextResponse.json(rows.map(r => ({
            ...r,
            label: historyFieldLabel(r.field),
            oldValue: r.field === "servesUnitId" ? unitName(r.oldValue) : r.oldValue,
            newValue: r.field === "servesUnitId" ? unitName(r.newValue) : r.newValue,
        })));
    } catch (error) {
        console.error("Error loading member history:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
