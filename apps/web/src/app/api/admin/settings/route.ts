import { prisma } from "@/db";
import { getSession, hasPermission } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

async function getOrCreateSettings() {
    let settings = await prisma.siteSettings.findUnique({ where: { id: "default" } });
    if (!settings) {
        settings = await prisma.siteSettings.create({
            data: { id: "default", groupFoundedYear: 2014 },
        });
    }
    return settings;
}

export async function GET() {
    try {
        const session = await getSession();
        if (!hasPermission(session, "canManageSettings")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const settings = await getOrCreateSettings();
        return NextResponse.json(settings);
    } catch (error) {
        console.error("Error fetching settings:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
    try {
        const session = await getSession();
        if (!hasPermission(session, "canManageSettings")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { groupFoundedYear, manualUnitCount, manualMemberCount, logoUrl } = body;

        await getOrCreateSettings();

        const updated = await prisma.siteSettings.update({
            where: { id: "default" },
            data: {
                groupFoundedYear: typeof groupFoundedYear === "number" ? groupFoundedYear : undefined,
                manualUnitCount: manualUnitCount === null || typeof manualUnitCount === "number" ? manualUnitCount : undefined,
                manualMemberCount: manualMemberCount === null || typeof manualMemberCount === "number" ? manualMemberCount : undefined,
                logoUrl: "logoUrl" in body ? (logoUrl || null) : undefined,
            },
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error("Error updating settings:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
