/**
 * Shared unstable_cache wrappers for public-facing DB queries.
 *
 * Why: public pages use `force-dynamic` (no build-time pre-render) so they
 * aren't blocked when the DB is unreachable during `docker build`.
 * These wrappers cache the results in Next.js's Data Cache across requests,
 * giving ISR-like performance without static generation.
 *
 * `revalidatePath("/some-page")` from an admin mutation route busts both the
 * Route Cache and these Data Cache entries for that path automatically.
 */

import { prisma } from "@/db";
import { unstable_cache } from "next/cache";

// ─── Structural / rarely-changing data ───────────────────────────────────────

export const getCachedSettings = unstable_cache(
    () => prisma.siteSettings.findUnique({ where: { id: "default" } }),
    ["settings"],
    { revalidate: 3600 }
);

export const getCachedSocialLinks = unstable_cache(
    () => prisma.socialLink.findMany({ orderBy: { sortOrder: "asc" } }),
    ["social-links"],
    { revalidate: 3600 }
);

export const getCachedGallery = unstable_cache(
    () => prisma.galleryPhoto.findMany({
        orderBy: { sortOrder: "asc" },
        select: { id: true, imageUrl: true, caption: true },
    }),
    ["gallery"],
    { revalidate: 600 }
);

export const getCachedPartners = unstable_cache(
    () => prisma.partner.findMany({ orderBy: { sortOrder: "asc" } }),
    ["partners"],
    { revalidate: 3600 }
);

// ─── Content that changes occasionally ────────────────────────────────────────

export const getCachedNewsArticles = unstable_cache(
    () => prisma.newsArticle.findMany({
        where: { published: true },
        orderBy: { date: "desc" },
    }),
    ["news-articles"],
    { revalidate: 300 }
);

/** All units + their public activities + leader contacts (for Activities page). */
export const getCachedUnitsWithActivities = unstable_cache(
    () => prisma.unit.findMany({
        include: {
            activities: { where: { hidden: false } },
            contacts: {
                include: {
                    member: {
                        select: { firstName: true, lastName: true, phone: true, role: true, photoUrl: true },
                    },
                },
                orderBy: { sortOrder: "asc" },
            },
        },
        orderBy: { name: "asc" },
    }),
    ["units-with-activities"],
    { revalidate: 600 }
);

/** All public activities with their unit name (for Activities page tabs + home page). */
export const getCachedAllActivities = unstable_cache(
    () => prisma.activity.findMany({
        where: { hidden: false },
        include: { unit: { select: { name: true, id: true } } },
        orderBy: { startDate: "desc" },
    }),
    ["all-activities"],
    { revalidate: 300 }
);

/** Single unit detail page (parameterized by ID). */
export const getCachedUnit = unstable_cache(
    (id: string) => prisma.unit.findUnique({
        where: { id },
        include: {
            activities: {
                where: { hidden: false },
                orderBy: { startDate: "desc" },
            },
            contacts: {
                include: {
                    member: {
                        select: { firstName: true, lastName: true, phone: true, role: true, photoUrl: true },
                    },
                },
                orderBy: { sortOrder: "asc" },
            },
        },
    }),
    ["unit"],
    { revalidate: 600 }
);
