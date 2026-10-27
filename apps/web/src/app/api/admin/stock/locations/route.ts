import { prisma } from "@/db";
import { getSession } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { canUseStock, isStorekeeper } from "@/lib/stock-access";

/** GET — every room with its shelves, and how many items each holds. */
export async function GET() {
    const session = await getSession();
    if (!canUseStock(session)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const rooms = await prisma.storageLocation.findMany({
        where: { parentId: null },
        include: {
            _count: { select: { items: true } },
            children: { include: { _count: { select: { items: true } } }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] },
        },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
    return NextResponse.json(rooms);
}

/** POST { name, parentId?, notes? } — a room, or a shelf inside one. */
export async function POST(request: NextRequest) {
    try {
        const session = await getSession();
        if (!isStorekeeper(session)) return NextResponse.json({ error: "Only the storekeeper can set up storage" }, { status: 403 });
        const body = await request.json().catch(() => ({}));
        const name = typeof body.name === "string" ? body.name.trim().slice(0, 120) : "";
        if (!name) return NextResponse.json({ error: "Give it a name" }, { status: 400 });
        let parentId: string | null = null;
        if (body.parentId) {
            const parent = await prisma.storageLocation.findUnique({ where: { id: body.parentId }, select: { id: true, parentId: true } });
            // Rooms and shelves only — a shelf cannot hold another shelf.
            if (!parent || parent.parentId) return NextResponse.json({ error: "A shelf goes inside a room" }, { status: 400 });
            parentId = parent.id;
        }
        const loc = await prisma.storageLocation.create({
            data: { name, parentId, notes: typeof body.notes === "string" && body.notes.trim() ? body.notes.trim().slice(0, 500) : null },
        });
        return NextResponse.json(loc);
    } catch (error) {
        console.error("Error creating location:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
