import { prisma } from "@/db";
import { redirect, notFound } from "next/navigation";
import { toDay } from "@/lib/activity-schedule";

export const dynamic = "force-dynamic";

/**
 * Old address of the attendance sheet, from before activities had sessions.
 * Attendance now lives on a session: send the visitor to the next one, or the
 * latest if the activity is over.
 */
export default async function LegacyAttendancePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const today = toDay(new Date());
    const target =
        await prisma.activitySession.findFirst({ where: { activityId: id, date: { gte: today } }, orderBy: { date: "asc" }, select: { id: true } })
        ?? await prisma.activitySession.findFirst({ where: { activityId: id }, orderBy: { date: "desc" }, select: { id: true } });
    if (!target) notFound();
    redirect(`/admin/activities/${id}/sessions/${target.id}?tab=attendance`);
}
