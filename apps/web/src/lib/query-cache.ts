/**
 * Shared read queries for the public site.
 *
 * These deliberately do NOT cache. They used to be wrapped in `unstable_cache`,
 * but nothing invalidated those entries, so every admin edit — a stats
 * override, a new gallery photo, a partner — stayed invisible for 10 to 60
 * minutes. The site's traffic is low enough that a fresh database read per
 * request costs nothing, and correctness is worth far more than the saving.
 *
 * Pages still export `dynamic = "force-dynamic"`: the database is unreachable
 * during `docker build`, so they must not be pre-rendered at build time.
 *
 * The `getCached*` names are kept only so existing call sites did not have to
 * change. If caching is ever reintroduced, it needs tags AND an invalidation
 * call in every admin mutation that affects the data — not just a timer.
 */

import { prisma } from "@/db";

// ─── Site-wide ────────────────────────────────────────────────────────────────

export function getCachedSettings() {
    return prisma.siteSettings.findUnique({ where: { id: "default" } });
}

export function getCachedSocialLinks() {
    return prisma.socialLink.findMany({ orderBy: { sortOrder: "asc" } });
}

export function getCachedGallery() {
    return prisma.galleryPhoto.findMany({
        orderBy: { sortOrder: "asc" },
        select: { id: true, imageUrl: true, caption: true },
    });
}

export function getCachedPartners() {
    return prisma.partner.findMany({ orderBy: { sortOrder: "asc" } });
}

// ─── Content ─────────────────────────────────────────────────────────────────

export function getCachedNewsArticles() {
    return prisma.newsArticle.findMany({
        where: { published: true },
        orderBy: { date: "desc" },
    });
}

/** All units + their public activities + leader contacts (for Activities page). */
export function getCachedUnitsWithActivities() {
    return prisma.unit.findMany({
        include: {
            activities: { where: { hidden: false } },
            contacts: {
                // Never advertise a leader who has left the group.
                where: { member: { status: "ACTIVE" } },
                include: {
                    member: {
                        select: { firstName: true, lastName: true, phone: true, role: true, photoUrl: true },
                    },
                },
                orderBy: { sortOrder: "asc" },
            },
        },
        orderBy: { name: "asc" },
    });
}

/** All public activities with their unit name (for Activities page tabs + home page). */
export function getCachedAllActivities() {
    return prisma.activity.findMany({
        where: { hidden: false },
        include: { unit: { select: { name: true, id: true } } },
        orderBy: { startDate: "desc" },
    });
}

/** Single unit detail page. */
export function getCachedUnit(id: string) {
    return prisma.unit.findUnique({
        where: { id },
        include: {
            activities: {
                where: { hidden: false },
                orderBy: { startDate: "desc" },
            },
            contacts: {
                // Never advertise a leader who has left the group.
                where: { member: { status: "ACTIVE" } },
                include: {
                    member: {
                        select: { firstName: true, lastName: true, phone: true, role: true, photoUrl: true },
                    },
                },
                orderBy: { sortOrder: "asc" },
            },
        },
    });
}

// ─── History ─────────────────────────────────────────────────────────────────

export function getCachedMilestones() {
    return prisma.historyMilestone
        .findMany({ orderBy: [{ sortOrder: "asc" }, { date: "asc" }] })
        .catch(() => []);
}

/**
 * Anciens ARE former members — members whose status is LEFT. There is no
 * separate alumni table: one person, one record.
 */
export function getCachedAnciens() {
    return prisma.member
        .findMany({
            where: { status: "LEFT", hiddenFromAnciens: false },
            select: {
                id: true, firstName: true, lastName: true,
                joinedAt: true, leftAt: true,
                progressions: true, scoutRolesHistory: true, professions: true,
                phone: true, email: true, photoUrl: true, bio: true,
                ancienSortOrder: true,
            },
            orderBy: [{ ancienSortOrder: "asc" }, { lastName: "asc" }, { firstName: "asc" }],
        })
        .catch(() => []);
}
