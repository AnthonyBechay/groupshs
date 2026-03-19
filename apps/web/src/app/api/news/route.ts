import { prisma } from "@/db";
import { getSession } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
    const articles = await prisma.newsArticle.findMany({
        orderBy: { date: "desc" },
    });
    return NextResponse.json(articles);
}

export async function POST(request: Request) {
    const session = await getSession();
    if (!session || session.role !== "admin") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const article = await prisma.newsArticle.create({
        data: {
            title: body.title,
            summary: body.summary,
            content: body.content || null,
            imageUrl: body.imageUrl || null,
            published: body.published ?? true,
            date: body.date ? new Date(body.date) : new Date(),
        },
    });

    return NextResponse.json(article, { status: 201 });
}
