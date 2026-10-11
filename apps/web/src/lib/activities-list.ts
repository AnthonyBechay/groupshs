/**
 * The admin Activities list remembers how it was last filtered, so pages
 * reached from it (Circulars, Attendance) can link back to the same view
 * instead of a list reset to its defaults.
 *
 * sessionStorage, not the URL: the pages in between have no business carrying
 * another page's filters in their own address.
 */
const KEY = "admin:activities:list";

export function rememberActivitiesList(query: string) {
    try { sessionStorage.setItem(KEY, query); } catch { /* private mode: links fall back to the plain list */ }
}

export function activitiesListHref(): string {
    try {
        const query = sessionStorage.getItem(KEY);
        return query ? `/admin/activities?${query}` : "/admin/activities";
    } catch {
        return "/admin/activities";
    }
}
