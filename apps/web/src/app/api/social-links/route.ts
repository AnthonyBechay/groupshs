import { prisma } from "@/db";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const links = await prisma.socialLink.findMany({
            orderBy: { sortOrder: "asc" },
        });
        return NextResponse.json(links);
    } catch (error) {
        console.error("Error fetching social links:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
