import { prisma } from "@/db";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const partners = await prisma.partner.findMany({
            orderBy: { sortOrder: "asc" },
        });
        return NextResponse.json(partners);
    } catch (error) {
        console.error("Error fetching partners:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
