import { prisma } from "@/db";
import { getSession } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getSession();
    if (!session || session.role !== "admin") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const article = await prisma.newsArticle.update({
        where: { id },
        data: {
            title: body.title,
            summary: body.summary,
            content: body.content || null,
            imageUrl: body.imageUrl || null,
            published: body.published ?? true,
            date: body.date ? new Date(body.date) : undefined,
        },
    });

    return NextResponse.json(article);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getSession();
    if (!session || session.role !== "admin") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await prisma.newsArticle.delete({ where: { id } });
    return NextResponse.json({ ok: true });
}
