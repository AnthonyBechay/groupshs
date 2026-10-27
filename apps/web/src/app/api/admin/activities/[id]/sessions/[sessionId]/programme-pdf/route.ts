import { prisma } from "@/db";
import { getSession, hasPermission } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { ACTIVITY_TYPE_LABELS } from "@/lib/scout-config";
import { dayKey, programmeDays, sanitizeProgramme } from "@/lib/activity-schedule";
import { canViewActivity, findActivityScope } from "@/lib/activity-sessions";
import { loadCircularImage } from "@/lib/circular/images";
import { renderProgrammePdf } from "@/lib/programme-pdf";

const fmt = (day: string, withYear = false) =>
    new Date(`${day}T00:00:00Z`).toLocaleDateString("en-GB", {
        timeZone: "UTC", weekday: "long", day: "numeric", month: "long", ...(withYear ? { year: "numeric" } : {}),
    });

/** GET — the saved programme of this session as a PDF (opens in the browser). */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string; sessionId: string }> }) {
    try {
        const session = await getSession();
        if (!hasPermission(session, "canManageActivities")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const { id, sessionId } = await params;
        const [activity, s, settings] = await Promise.all([
            findActivityScope(id),
            prisma.activitySession.findFirst({ where: { id: sessionId, activityId: id } }),
            prisma.siteSettings.findUnique({ where: { id: "default" } }),
        ]);
        if (!activity || !s) return NextResponse.json({ error: "Not found" }, { status: 404 });
        if (!canViewActivity(session, activity)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

        const first = dayKey(s.date);
        const items = sanitizeProgramme(s.programme, first);
        const end = !activity.recurrence && activity.endDate ? dayKey(activity.endDate) : null;
        const days = programmeDays(first, end, items);

        const pdf = renderProgrammePdf({
            groupName: settings?.circularGroupName || "Group SHS",
            logo: await loadCircularImage(settings?.logoUrl || "/logo.png"),
            title: activity.title,
            subtitle: `${activity.unit.name} · ${ACTIVITY_TYPE_LABELS[activity.activityType] ?? activity.activityType}${s.status === "CANCELLED" ? " · CANCELLED" : ""}`,
            when: days.length > 1 ? `${fmt(days[0], true)} – ${fmt(days[days.length - 1])}` : fmt(first, true),
            where: activity.location,
            hours: [activity.dropoffTime && `Drop-off ${activity.dropoffTime}`, activity.pickupTime && `Pick-up ${activity.pickupTime}`].filter(Boolean).join(" · ") || null,
            days: days.map((d, i) => ({
                label: days.length > 1 ? `Day ${i + 1} — ${fmt(d)}` : fmt(d),
                items: items.filter(it => it.day === d),
            })),
            notes: s.notes,
        });

        const name = `programme-${activity.title.replace(/[^\w-]+/g, "-").slice(0, 40)}-${first}.pdf`;
        const download = new URL(request.url).searchParams.get("download") === "1";
        return new NextResponse(Buffer.from(pdf), {
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${name}"`,
                "Cache-Control": "private, no-store",
            },
        });
    } catch (error) {
        console.error("Error rendering programme PDF:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
