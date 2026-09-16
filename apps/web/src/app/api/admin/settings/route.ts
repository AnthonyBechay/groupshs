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

        // ─── Age-based transition rules (validated + clamped) ────────────────
        if (typeof body.fiscalYearStartMonth === "number") {
            const m = Math.round(body.fiscalYearStartMonth);
            if (m < 1 || m > 12) {
                return NextResponse.json({ error: "Fiscal year start month must be between 1 and 12" }, { status: 400 });
            }
            data.fiscalYearStartMonth = m;
        }
        const AGE_KEYS = [
            "ageLouveteauxToEclaireurs", "ageEclaireursToRoutiers",
            "ageLouvettesToEclaireuses", "ageEclaireusesToPionnieres",
        ] as const;

        for (const key of AGE_KEYS) {
            if (typeof body[key] === "number") {
                const age = Math.round(body[key]);
                if (age < 5 || age > 30) {
                    return NextResponse.json({ error: "Transition ages must be between 5 and 30" }, { status: 400 });
                }
                data[key] = age;
            }
        }

        // Keep each track's ladder coherent: the senior threshold must be above
        // the junior one, or members would be due in two branches at once.
        if (AGE_KEYS.some(k => k in data)) {
            const current = await prisma.siteSettings.findUnique({
                where: { id: "default" },
                select: Object.fromEntries(AGE_KEYS.map(k => [k, true])) as Record<(typeof AGE_KEYS)[number], true>,
            });
            const val = (k: (typeof AGE_KEYS)[number], fallback: number) =>
                (data[k] as number | undefined) ?? current?.[k] ?? fallback;

            const tracks: [string, number, number][] = [
                ["boys", val("ageLouveteauxToEclaireurs", 12), val("ageEclaireursToRoutiers", 17)],
                ["girls", val("ageLouvettesToEclaireuses", 12), val("ageEclaireusesToPionnieres", 17)],
            ];
            for (const [label, junior, senior] of tracks) {
                if (senior <= junior) {
                    return NextResponse.json(
                        { error: `The ${label} senior move-up age (${senior}) must be greater than the junior one (${junior})` },
                        { status: 400 }
                    );
                }
            }
        }

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
