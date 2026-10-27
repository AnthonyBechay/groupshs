import { prisma } from "@/db";
import { NextResponse } from "next/server";
import { VISIBLE_UNITS_WHERE } from "@/lib/scout-config";

export const dynamic = "force-dynamic";

/**
 * Public: what families can order, and for which units. Only what a parent
 * needs to choose — names, sizes, selling prices. Never stock levels, buying
 * prices, owners or anything about members.
 */
export async function GET() {
    try {
        const [units, items] = await Promise.all([
            prisma.unit.findMany({
                where: { ...VISIBLE_UNITS_WHERE, unitType: { notIn: ["ALL", "ARCHIVE", "GROUP"] } },
                select: { id: true, name: true, unitType: true },
                orderBy: { name: "asc" },
            }),
            prisma.stockItem.findMany({
                where: { requestable: true, archived: false },
                select: {
                    id: true, name: true, category: true, description: true, photoUrl: true,
                    variants: true, sellPrice: true, currency: true, forUnitTypes: true,
                },
                orderBy: [{ category: "asc" }, { name: "asc" }],
            }),
        ]);
        return NextResponse.json({ units, items }, { headers: { "Cache-Control": "no-store" } });
    } catch (error) {
        console.error("Error loading order catalog:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
