import Link from "next/link";
import { redirect } from "next/navigation";
import {
    AlertTriangle, CalendarClock, Cake, ClipboardCheck, ClipboardList, Inbox, Link2, Plus, Star, Users,
} from "lucide-react";
import { getSession } from "@/lib/auth";
import { getMyUnit, getMyUnitOverview } from "@/lib/my-unit";
import { unitTheme } from "@/lib/unit-theme";
import { ACTIVITY_TYPE_LABELS, leadershipRolesOf } from "@/lib/scout-config";

export const dynamic = "force-dynamic";

const fmt = (d: Date, opts: Intl.DateTimeFormatOptions) => d.toLocaleDateString("en-GB", { timeZone: "UTC", ...opts });

/**
 * The unit a leader runs, on one page: who is in it, what is coming, whether
 * attendance is up to date, which files are incomplete, what families sent in.
 * Which unit is read from the member their account is linked to.
 */
export default async function MyUnitPage() {
    const session = await getSession();
    if (!session) redirect("/login");
    const mine = await getMyUnit(session);

    if (!mine) {
        return (
            <Empty
                title="No unit linked to your account"
                body={session.memberId
                    ? "Your account is linked to a member who does not lead a unit (or sits in the conseil). The dashboard covers the whole group."
                    : "Ask the super admin to link your account to your member file in Users. Your role there (CM, CT…) decides which unit appears here."}
            />
        );
    }
    if (!mine.accessible) {
        return <Empty title={mine.unit.name} body="Your account is linked to this unit, but not allowed to access it. Ask the super admin to add it to your unit access." />;
    }

    const o = await getMyUnitOverview(session, mine.unit.id);
    const theme = unitTheme(mine.unit.unitType);
    const today = new Date();
    const toTake = o.recent.filter(r => r.recorded === 0);
    const taken = o.recent.filter(r => r.recorded > 0);
    const rate = taken.length ? Math.round(100 * taken.reduce((n, r) => n + r.present, 0) / taken.reduce((n, r) => n + r.recorded, 0)) : null;
    const unitQ = `unit=${mine.unit.id}`;

    return (
        <div className="space-y-6">
            <div className={`rounded-3xl ${theme.pageAccent} text-white p-6 md:p-8`}>
                <p className="text-xs font-bold uppercase tracking-widest text-white/70 flex items-center gap-1.5"><Star className="w-3.5 h-3.5" /> My unit</p>
                <h1 className="text-3xl md:text-4xl font-black">{mine.unit.name}</h1>
                <p className="text-sm text-white/85 mt-1">{mine.member.firstName} {mine.member.lastName}{mine.role ? ` · ${mine.role}` : ""}</p>
                <div className="flex flex-wrap gap-2 mt-5">
                    {o.canMembers && <HeroLink href={`/admin/members?${unitQ}`} icon={Users}>Roster</HeroLink>}
                    {o.canActivities && <HeroLink href={`/admin/activities?${unitQ}`} icon={CalendarClock}>Activities</HeroLink>}
                    {o.canActivities && <HeroLink href={`/admin/activities?${unitQ}&new=1`} icon={Plus}>New activity</HeroLink>}
                    {o.canMembers && <HeroLink href={`/admin/members/updates?${unitQ}`} icon={Inbox}>Family updates{o.pendingUpdates ? ` (${o.pendingUpdates})` : ""}</HeroLink>}
                </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {o.canMembers && <Tile label="Members" value={String(o.youth.length)} hint={`+ ${o.maitrise.length} in the maîtrise`} />}
                {o.canActivities && <Tile label="Attendance" value={rate == null ? "—" : `${rate}%`} hint={`last ${taken.length} session${taken.length !== 1 ? "s" : ""}`} />}
                {o.canActivities && <Tile label="Attendance to take" value={String(toTake.length)} hint="past sessions, nothing recorded" warn={toTake.length > 0} />}
                {o.canMembers && <Tile label="Files to complete" value={String(o.incomplete.length)} hint="missing essential info" warn={o.incomplete.length > 0} />}
                {o.canMembers && o.pendingUpdates > 0 && <Tile label="To review" value={String(o.pendingUpdates)} hint="sent in by families" warn />}
            </div>

            <div className="grid lg:grid-cols-2 gap-5">
                {o.canActivities && (
                    <Card title="Coming up" icon={CalendarClock} href={`/admin/activities?${unitQ}`}>
                        {o.upcoming.length === 0 ? <None>Nothing scheduled.</None> : o.upcoming.map(s => (
                            <Row key={s.id} href={`/admin/activities/${s.activity.id}/sessions/${s.id}`}>
                                <span className="w-24 shrink-0 text-sm font-semibold">{fmt(s.date, { weekday: "short", day: "numeric", month: "short" })}</span>
                                <span className={`flex-1 truncate text-sm ${s.status === "CANCELLED" ? "line-through text-muted-foreground" : ""}`}>{s.activity.title}</span>
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{ACTIVITY_TYPE_LABELS[s.activity.activityType] ?? s.activity.activityType}</span>
                            </Row>
                        ))}
                    </Card>
                )}

                {o.canActivities && (
                    <Card title="Recent attendance" icon={ClipboardCheck}>
                        {o.recent.length === 0 ? <None>No past sessions yet.</None> : o.recent.map(r => (
                            <Row key={r.id} href={`/admin/activities/${r.activityId}/sessions/${r.id}?tab=attendance`}>
                                <span className="w-24 shrink-0 text-sm font-semibold">{fmt(r.date, { weekday: "short", day: "numeric", month: "short" })}</span>
                                <span className="flex-1 truncate text-sm">{r.title}</span>
                                {r.recorded ? (
                                    <span className="text-xs font-semibold">{r.present}/{r.recorded}</span>
                                ) : (
                                    <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> Take it</span>
                                )}
                            </Row>
                        ))}
                    </Card>
                )}

                {o.canMembers && (
                    <Card title="Maîtrise" icon={Star}>
                        {o.maitrise.length === 0 ? <None>No leader is linked to this unit yet.</None> : o.maitrise.map(m => (
                            <Row key={m.id} href={`/admin/members/${m.id}`}>
                                <span className="flex-1 text-sm font-medium">{m.firstName} {m.lastName}</span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${theme.leadChip}`}>{leadershipRolesOf(m, m.unit.unitType).join(" / ")}</span>
                            </Row>
                        ))}
                    </Card>
                )}

                {o.canMembers && (
                    <Card title="Files to complete" icon={ClipboardList} href={`/admin/members/updates?${unitQ}`} linkLabel="Ask families">
                        {o.incomplete.length === 0 ? <None>Every file has the essentials.</None> : o.incomplete.slice(0, 8).map(({ m, missing }) => (
                            <Row key={m.id} href={`/admin/members/${m.id}`}>
                                <span className="flex-1 text-sm font-medium truncate">{m.firstName} {m.lastName}</span>
                                <span className="text-xs text-muted-foreground truncate">No {missing.join(", ")}</span>
                            </Row>
                        ))}
                        {o.incomplete.length > 8 && <p className="px-4 py-2 text-xs text-muted-foreground">and {o.incomplete.length - 8} more</p>}
                    </Card>
                )}

                {o.canMembers && o.birthdays.length > 0 && (
                    <Card title={`Birthdays in ${fmt(today, { month: "long" })}`} icon={Cake}>
                        {o.birthdays.map(m => (
                            <Row key={m.id} href={`/admin/members/${m.id}`}>
                                <span className="w-14 shrink-0 text-sm font-semibold">{Number(m.dateOfBirth!.slice(8, 10))} {fmt(today, { month: "short" })}</span>
                                <span className="flex-1 text-sm">{m.firstName} {m.lastName}</span>
                                <span className="text-xs text-muted-foreground">{m.subgroup?.name}</span>
                            </Row>
                        ))}
                    </Card>
                )}
            </div>
        </div>
    );
}

function Empty({ title, body }: { title: string; body: string }) {
    return (
        <div className="max-w-xl mx-auto text-center py-16">
            <Link2 className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <h1 className="text-2xl font-bold">{title}</h1>
            <p className="text-sm text-muted-foreground mt-2">{body}</p>
        </div>
    );
}

function HeroLink({ href, icon: Icon, children }: { href: string; icon: typeof Users; children: React.ReactNode }) {
    return (
        <Link href={href} className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full text-sm font-semibold bg-white/10 hover:bg-white/20 border border-white/20">
            <Icon className="w-4 h-4" /> {children}
        </Link>
    );
}

function Tile({ label, value, hint, warn }: { label: string; value: string; hint: string; warn?: boolean }) {
    return (
        <div className={`rounded-2xl border p-4 ${warn ? "border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800/50" : "bg-card"}`}>
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
            <p className="text-2xl font-black mt-1">{value}</p>
            <p className="text-xs text-muted-foreground">{hint}</p>
        </div>
    );
}

function Card({ title, icon: Icon, href, linkLabel = "See all", children }: {
    title: string; icon: typeof Users; href?: string; linkLabel?: string; children: React.ReactNode;
}) {
    return (
        <section className="rounded-2xl border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
                <h2 className="text-sm font-bold flex items-center gap-2"><Icon className="w-4 h-4 text-primary" /> {title}</h2>
                {href && <Link href={href} className="text-xs font-semibold text-primary hover:underline">{linkLabel} →</Link>}
            </div>
            <div className="divide-y">{children}</div>
        </section>
    );
}

function Row({ href, children }: { href: string; children: React.ReactNode }) {
    return <Link href={href} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/40">{children}</Link>;
}

function None({ children }: { children: React.ReactNode }) {
    return <p className="px-4 py-6 text-sm text-muted-foreground text-center">{children}</p>;
}
