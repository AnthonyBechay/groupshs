import { prisma } from "@/db";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        const body = await request.json();

        const { fullName, dateOfBirth, schoolLevel, memberPhone, parentWereScouts, parentScoutGroup, parentContactInfo, siblingsInGroup, siblingNames, otherComments } = body;

        if (!fullName || !dateOfBirth || !schoolLevel || !parentContactInfo || parentWereScouts === undefined || siblingsInGroup === undefined) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        await prisma.recruitmentSubmission.create({
            data: {
                fullName,
                dateOfBirth,
                schoolLevel,
                memberPhone: memberPhone || null,
                parentWereScouts,
                parentScoutGroup: parentScoutGroup || null,
                parentContactInfo,
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
