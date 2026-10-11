"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useCallback } from "react";

type Changes = Record<string, string | null | undefined>;

/**
 * Query-string state for the current page.
 *
 * Tabs, filters and open dialogs that live only in React state are lost on
 * refresh and invisible to the Back button: Back leaves the page instead of
 * closing the dialog, and a reload snaps back to the first tab. Keeping that
 * state in the URL fixes both, and makes the view shareable.
 *
 * Writes go through the native History API, which Next's router observes — so
 * `useSearchParams()` updates immediately WITHOUT a server round-trip.
 * `router.push/replace` would re-request the route on every tab click.
 *
 *   mode "replace" (default)  for tabs and filters: Back should not replay
 *                             every tab the user clicked through
 *   mode "push"               for something the user "enters" (a dialog, a
 *                             detail panel): Back should close it
 */
export function useUrlState() {
    const params = useSearchParams();
    const pathname = usePathname();

    const setParams = useCallback((changes: Changes, mode: "replace" | "push" = "replace") => {
        // Read the live URL, not the hook's snapshot, so two updates in the
        // same tick compose instead of the second overwriting the first.
        const next = new URLSearchParams(window.location.search);
        for (const [key, value] of Object.entries(changes)) {
            if (value === null || value === "") next.delete(key);
            else if (value !== undefined) next.set(key, value);
        }
        const qs = next.toString();
        const url = qs ? `${pathname}?${qs}` : pathname;
        if (url === window.location.pathname + window.location.search) return;

        if (mode === "push") window.history.pushState(null, "", url);
        else window.history.replaceState(null, "", url);
    }, [pathname]);

    return { params, setParams };
}
