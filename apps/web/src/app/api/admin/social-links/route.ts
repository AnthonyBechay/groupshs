import { prisma } from "@/db";
import { getSession } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
    try {
        const session = await getSession();
        if (!session || session.role !== "admin" && session.role !== "super_admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const links = await prisma.socialLink.findMany({ orderBy: { sortOrder: "asc" } });
        return NextResponse.json(links);
    } catch (error) {
        console.error("Error fetching social links:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session || session.role !== "admin" && session.role !== "super_admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { platform, url } = body;

        if (!platform || !url) {
            return NextResponse.json({ error: "Platform and URL are required" }, { status: 400 });
        }

        const last = await prisma.socialLink.findFirst({ orderBy: { sortOrder: "desc" } });
        const sortOrder = (last?.sortOrder ?? -1) + 1;

        const link = await prisma.socialLink.create({
            data: { platform, url, sortOrder },
        });

        return NextResponse.json(link);
    } catch (error) {
        console.error("Error creating social link:", error);
        return NextResponse.json({ error: "Failed to create social link" }, { status: 500 });
    }
}
