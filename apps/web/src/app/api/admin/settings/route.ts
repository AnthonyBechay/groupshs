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
        await getOrCreateSettings();

        const data: Record<string, unknown> = {};
        if (typeof body.groupFoundedYear === "number") data.groupFoundedYear = body.groupFoundedYear;
        if (body.manualUnitCount === null || typeof body.manualUnitCount === "number") data.manualUnitCount = body.manualUnitCount;
        if (body.manualMemberCount === null || typeof body.manualMemberCount === "number") data.manualMemberCount = body.manualMemberCount;
        if ("logoUrl" in body) data.logoUrl = body.logoUrl || null;
        if ("footerDescription" in body) data.footerDescription = body.footerDescription || null;
        if ("footerAddress" in body) data.footerAddress = body.footerAddress || null;
        if ("footerPhone" in body) data.footerPhone = body.footerPhone || null;
        if ("footerEmail" in body) data.footerEmail = body.footerEmail || null;
        if ("aboutTitle" in body) data.aboutTitle = body.aboutTitle || null;
        if ("aboutSubtitle" in body) data.aboutSubtitle = body.aboutSubtitle || null;
        if ("aboutIntro" in body) data.aboutIntro = body.aboutIntro || null;
        if ("aboutMission" in body) data.aboutMission = body.aboutMission || null;

        const updated = await prisma.siteSettings.update({
            where: { id: "default" },
            data,
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error("Error updating settings:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
