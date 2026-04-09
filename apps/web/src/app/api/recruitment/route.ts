import { prisma } from "@/db";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        const body = await request.json();

        const { fullName, dateOfBirth, schoolLevel, memberPhone, parentWereScouts, parentScoutGroup, parentName, parentPhone, parentContactInfo, siblingsInGroup, siblingNames, otherComments } = body;

        // Support both new separate fields and legacy combined field
        if (!fullName || !dateOfBirth || !schoolLevel || parentWereScouts === undefined || siblingsInGroup === undefined) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        if (!parentName && !parentContactInfo) {
            return NextResponse.json({ error: "Parent name is required" }, { status: 400 });
        }

        await prisma.recruitmentSubmission.create({
            data: {
                fullName,
                dateOfBirth,
                schoolLevel,
                memberPhone: memberPhone || null,
                parentWereScouts,
                parentScoutGroup: parentScoutGroup || null,
                parentName: parentName || null,
                parentPhone: parentPhone || null,
                parentContactInfo: parentContactInfo || (parentName && parentPhone ? `${parentName} - ${parentPhone}` : parentName || null),
                siblingsInGroup,
                siblingNames: siblingNames || null,
                otherComments: otherComments || null,
            },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Recruitment submission error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
