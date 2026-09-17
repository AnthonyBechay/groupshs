import { prisma } from "@/db";
import { getSession, hasPermission } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getSession();
        if (!hasPermission(session, "canViewSubmissions")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const body = await request.json();
        const { status } = body;

        const validStatuses = ["PENDING", "CONTACTED", "WAITING_LIST", "RECRUITED", "REJECTED"];
        if (status !== undefined && !validStatuses.includes(status)) {
            return NextResponse.json({ error: "Invalid status" }, { status: 400 });
        }

        const existing = await prisma.recruitmentSubmission.findUnique({
            where: { id },
            select: { memberId: true },
        });
        if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

        // Once enrolled, the status reflects a real member in a unit and must not
        // drift. Undo the enrollment first if it needs to change.
        if (existing.memberId && status && status !== "RECRUITED") {
            return NextResponse.json(
                { error: "This applicant is already enrolled in a unit. Undo the enrollment before changing their status." },
                { status: 409 }
            );
        }

        const data: Record<string, unknown> = {};
        if (status !== undefined) data.status = status;
        // Only touch the note when the caller actually sent one. Previously a
        // plain status change cleared it, silently destroying the admin's notes.
        if ("statusNote" in body) data.statusNote = body.statusNote || null;

        if (Object.keys(data).length === 0) {
            return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
        }

        const submission = await prisma.recruitmentSubmission.update({ where: { id }, data });

        return NextResponse.json(submission);
    } catch (error) {
        console.error("Error updating submission:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getSession();
        if (!hasPermission(session, "canViewSubmissions")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;

        // Deleting an enrolled application would sever the only link between a
        // member and how they joined, leaving no trace of their application.
        const existing = await prisma.recruitmentSubmission.findUnique({
            where: { id },
            select: { memberId: true },
        });
        if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
        if (existing.memberId) {
            return NextResponse.json(
                { error: "This applicant is enrolled as a member. Undo the enrollment before deleting the application." },
                { status: 409 }
            );
        }

        await prisma.recruitmentSubmission.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting submission:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
