import { prisma } from "@/db";
import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";
import { itemFitsUnit, formatTotals } from "@/lib/stock";
import { newOrderRef } from "@/lib/stock-service";

const clean = (v: unknown, max: number) => (typeof v === "string" ? v.trim().replace(/\s+/g, " ").slice(0, max) : "");
const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

/**
 * Public: a family orders uniform items or badges for their child.
 *
 * Nothing is bought or reserved: the order lands as REQUESTED with the unit,
 * and only that unit's maîtrise (or the group's storekeeper / conseil) sees it
 * and decides. The child's name is matched to a member of that unit when it is
 * an exact match; otherwise the typed name is kept for the leaders to read.
 */
export async function POST(request: NextRequest) {
    try {
        const rl = checkRateLimit(`order:${clientIp(request)}`, { limit: 6, windowMs: 60 * 60 * 1000, blockMs: 60 * 60 * 1000 });
        if (!rl.allowed) {
            return NextResponse.json({ error: "Too many orders from here. Please try again later or contact the leaders." }, { status: 429 });
        }
        const body = await request.json().catch(() => ({}));
        // A hidden field people never see; bots fill it in.
        if (clean(body.website, 100)) return NextResponse.json({ ok: true, orderRef: newOrderRef() });

        const unitId = clean(body.unitId, 64);
        const childName = clean(body.childName, 120);
        const contactName = clean(body.contactName, 120);
        const contactPhone = clean(body.contactPhone, 40);
        const note = clean(body.note, 500) || null;
        if (!unitId || !childName || !contactName || !contactPhone) {
            return NextResponse.json({ error: "Please fill in the unit, your child's name, your name and your phone" }, { status: 400 });
        }
        if (!/\d{6,}/.test(contactPhone.replace(/\D/g, ""))) return NextResponse.json({ error: "Please check the phone number" }, { status: 400 });

        const unit = await prisma.unit.findFirst({
            where: { id: unitId, unitType: { notIn: ["ALL", "ARCHIVE", "GROUP"] } },
            select: { id: true, unitType: true, name: true },
        });
        if (!unit) return NextResponse.json({ error: "Choose your child's unit" }, { status: 400 });

        const lines: Record<string, unknown>[] = Array.isArray(body.items) ? body.items.slice(0, 20) : [];
        if (!lines.length) return NextResponse.json({ error: "Add at least one item" }, { status: 400 });
        const items = await prisma.stockItem.findMany({
            where: { id: { in: lines.map(l => String(l.itemId)) }, requestable: true, archived: false },
            select: { id: true, name: true, variants: true, forUnitTypes: true, sellPrice: true, currency: true },
        });

        // Exact name match only: a near-miss must not attach an order to the wrong child.
        const candidates = await prisma.member.findMany({
            where: { unitId: unit.id, status: "ACTIVE" },
            select: { id: true, firstName: true, lastName: true },
        });
        const wanted = fold(childName);
        const matches = candidates.filter(m => fold(`${m.firstName} ${m.lastName}`) === wanted || fold(`${m.lastName} ${m.firstName}`) === wanted);
        const memberId = matches.length === 1 ? matches[0].id : null;

        const orderRef = newOrderRef();
        const data: Prisma.ItemRequestCreateManyInput[] = [];
        for (const l of lines) {
            const item = items.find(i => i.id === l.itemId);
            if (!item || !itemFitsUnit(item, unit.unitType)) return NextResponse.json({ error: "One of the items is not available for this unit" }, { status: 400 });
            const variant = clean(l.variant, 80) || null;
            if (item.variants.length && !(variant && item.variants.includes(variant))) {
                return NextResponse.json({ error: `Choose a size / option for "${item.name}"` }, { status: 400 });
            }
            const quantity = Number(l.quantity ?? 1);
            if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20) return NextResponse.json({ error: "Quantities go from 1 to 20" }, { status: 400 });
            data.push({
                itemId: item.id, unitId: unit.id, memberId, variant, quantity, note,
                status: "REQUESTED", source: "FAMILY", orderRef,
                requestedForName: childName, contactName, contactPhone,
                unitPrice: item.sellPrice, currency: item.currency,
                requestedByName: `${contactName} (family)`,
            });
        }
        await prisma.itemRequest.createMany({ data });
        const total = formatTotals(data.map(d => ({ amount: d.unitPrice == null ? null : Number(d.unitPrice), quantity: d.quantity ?? 1, currency: d.currency })));
        return NextResponse.json({ ok: true, orderRef, total, unitName: unit.name });
    } catch (error) {
        console.error("Error placing family order:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
