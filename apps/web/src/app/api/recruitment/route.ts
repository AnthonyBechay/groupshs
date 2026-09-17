import { prisma } from "@/db";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";
import { NextResponse } from "next/server";

/**
 * Field length caps. This endpoint is public and unauthenticated, so without
 * them a single request could store megabytes of text per submission.
 */
const MAX_LENGTHS: Record<string, number> = {
    fullName: 120, gender: 10, dateOfBirth: 40, schoolLevel: 120,
    memberPhone: 40, parentScoutGroup: 160, parentName: 120, parentPhone: 40,
    parentContactInfo: 200, siblingNames: 500, otherComments: 2000,
};

/** Trim to the cap; never reject an application over a stray long field. */
function clamp(value: unknown, field: string): string | null {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    return trimmed.slice(0, MAX_LENGTHS[field] ?? 200);
}

export async function POST(request: Request) {
    try {
        // Public and unauthenticated: cap how fast one host can file
        // applications. Generous enough for a family submitting for several
        // children in one sitting.
        const rl = checkRateLimit(`recruitment:${clientIp(request)}`, {
            limit: 10, windowMs: 60 * 60 * 1000, blockMs: 60 * 60 * 1000,
        });
        if (!rl.allowed) {
            return NextResponse.json(
                { error: "Too many applications from this connection. Please try again later, or call us." },
                { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
            );
        }

        const body = await request.json();

        const { fullName, gender, dateOfBirth, schoolLevel, memberPhone, parentWereScouts, parentScoutGroup, parentName, parentPhone, parentContactInfo, siblingsInGroup, siblingNames, otherComments } = body;

        // Support both new separate fields and legacy combined field
        if (!fullName || !dateOfBirth || !schoolLevel || parentWereScouts === undefined || siblingsInGroup === undefined) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        if (gender && !["MALE", "FEMALE"].includes(gender)) {
            return NextResponse.json({ error: "Invalid gender" }, { status: 400 });
        }

        if (!parentName && !parentContactInfo) {
            return NextResponse.json({ error: "Parent name is required" }, { status: 400 });
        }

        const cleanName = clamp(fullName, "fullName");
        if (!cleanName) {
            return NextResponse.json({ error: "Full name is required" }, { status: 400 });
        }

        // Guard against a double-submit (an impatient click, or a retry after a
        // request that actually succeeded) creating duplicate applications.
        const recentDuplicate = await prisma.recruitmentSubmission.findFirst({
            where: {
                fullName: cleanName,
                dateOfBirth: clamp(dateOfBirth, "dateOfBirth") ?? undefined,
                createdAt: { gt: new Date(Date.now() - 5 * 60 * 1000) },
            },
            select: { id: true },
        });
        if (recentDuplicate) {
            // Report success: the application IS on file, which is what the
            // applicant needs to know. Re-submitting must never look like a failure.
            return NextResponse.json({ success: true, duplicate: true });
        }

        const cleanParentName = clamp(parentName, "parentName");
        const cleanParentPhone = clamp(parentPhone, "parentPhone");

        await prisma.recruitmentSubmission.create({
            data: {
                fullName: cleanName,
                gender: gender || null,
                dateOfBirth: clamp(dateOfBirth, "dateOfBirth") ?? "",
                schoolLevel: clamp(schoolLevel, "schoolLevel") ?? "",
                memberPhone: clamp(memberPhone, "memberPhone"),
                parentWereScouts: !!parentWereScouts,
                parentScoutGroup: clamp(parentScoutGroup, "parentScoutGroup"),
                parentName: cleanParentName,
                parentPhone: cleanParentPhone,
                parentContactInfo: clamp(parentContactInfo, "parentContactInfo")
                    ?? (cleanParentName && cleanParentPhone ? `${cleanParentName} - ${cleanParentPhone}` : cleanParentName),
                siblingsInGroup: !!siblingsInGroup,
                siblingNames: clamp(siblingNames, "siblingNames"),
                otherComments: clamp(otherComments, "otherComments"),
            },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Recruitment submission error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
