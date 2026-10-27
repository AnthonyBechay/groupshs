import { prisma } from "@/db";
import { getSession } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { isStorekeeper } from "@/lib/stock-access";

type Params = { params: Promise<{ id: string }> };

/** PATCH { name?, notes? } — rename a room or shelf. */
export async function PATCH(request: NextRequest, { params }: Params) {
    const session = await getSession();
    if (!isStorekeeper(session)) return NextResponse.json({ error: "Only the storekeeper can set up storage" }, { status: 403 });
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const data: Record<string, unknown> = {};
    if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim().slice(0, 120);
    if ("notes" in body) data.notes = typeof body.notes === "string" && body.notes.trim() ? body.notes.trim().slice(0, 500) : null;
    const loc = await prisma.storageLocation.update({ where: { id }, data }).catch(() => null);
    return loc ? NextResponse.json(loc) : NextResponse.json({ error: "Not found" }, { status: 404 });
}

/**
 * DELETE — remove a room (with its shelves) or a shelf. The items stay; they
 * just no longer have a place, and show as "not placed".
 */
export async function DELETE(_: NextRequest, { params }: Params) {
    const session = await getSession();
    if (!isStorekeeper(session)) return NextResponse.json({ error: "Only the storekeeper can set up storage" }, { status: 403 });
    const { id } = await params;
    const ok = await prisma.storageLocation.delete({ where: { id } }).then(() => true).catch(() => false);
    return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Not found" }, { status: 404 });
}
