import { prisma } from "@/db";
import { getSession } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
import {
    canManageCircularsOf, isUniqueViolation, loadCircularContext, nextSeq, parseDay, scoutYearOf, serializeCircular,
} from "@/lib/circular/service";
import { contentFromTemplate, isTemplateKey, recommendTemplate, TEMPLATE_BY_KEY } from "@/lib/circular/templates";

type Params = { params: Promise<{ id: string }> };

/** The activity's circulars, plus everything the picker needs to explain itself. */
export async function GET(_: NextRequest, { params }: Params) {
    try {
        const session = await getSession();
        const { id } = await params;
        const ctx = await loadCircularContext(id);
        if (!ctx) return NextResponse.json({ error: "Activity not found" }, { status: 404 });
        if (!canManageCircularsOf(session, ctx.unit.id)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const circulars = await prisma.circular.findMany({ where: { activityId: id }, orderBy: { createdAt: "desc" } });
        return NextResponse.json({
            context: ctx,
            recommended: recommendTemplate(ctx.activity),
            circulars: circulars.map(c => serializeCircular(c, ctx)),
        });
    } catch (error) {
        console.error("Error listing circulars:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

/** Create a circular from a template, taking the next reference number. */
export async function POST(request: NextRequest, { params }: Params) {
    try {
        const session = await getSession();
        const { id } = await params;
        const ctx = await loadCircularContext(id);
        if (!ctx) return NextResponse.json({ error: "Activity not found" }, { status: 404 });
        if (!canManageCircularsOf(session, ctx.unit.id)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json().catch(() => ({}));
        if (!isTemplateKey(body.template)) {
            return NextResponse.json({ error: "Unknown template" }, { status: 400 });
        }
        // The browser sends its own "today": the server runs in UTC, where it
        // is still yesterday for the first hours of a Lebanese day.
        const issueDate = parseDay(body.issueDate) ?? parseDay(new Date().toISOString())!;
        const scoutYear = scoutYearOf(issueDate, ctx.group.fiscalYearStartMonth);
        const template = TEMPLATE_BY_KEY[body.template];
        const content = contentFromTemplate(template.key, ctx) as unknown as Prisma.InputJsonValue;

        // Two leaders creating a circular at the same moment would both read
        // the same "next" number; the unique index rejects the second, and it
        // simply tries again with the number after.
        for (let attempt = 0; attempt < 5; attempt++) {
            try {
                const created = await prisma.circular.create({
                    data: {
                        activityId: id,
                        scoutYear,
                        seq: await nextSeq(scoutYear),
                        template: template.key,
                        title: `${template.name} — ${ctx.activity.title}`,
                        issueDate,
                        content,
                    },
                });
                return NextResponse.json(serializeCircular(created, ctx));
            } catch (error) {
                if (!isUniqueViolation(error)) throw error;
            }
        }
        return NextResponse.json({ error: "Could not allocate a reference number, please try again" }, { status: 409 });
    } catch (error) {
        console.error("Error creating circular:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
