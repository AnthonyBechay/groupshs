"use client";

import { useEffect, useRef, useCallback, useState } from "react";

/**
 * Warns before losing unsaved form edits.
 *
 * Covers the three ways a user can leave a page in the App Router:
 *   1. Closing / reloading the tab        → native `beforeunload` prompt
 *   2. Clicking an internal link          → intercepted, routed through `confirm`
 *   3. Browser Back / Forward             → intercepted via a history guard
 *
 * The App Router has no `routeChangeStart` event, so 2 and 3 are handled with a
 * capture-phase click listener and a pushState sentinel respectively.
 *
 * @param isDirty  whether there are unsaved edits right now
 * @param message  text shown in the in-app confirm (the native tab-close prompt
 *                 always uses the browser's own wording)
 */
export function useUnsavedChanges(
    isDirty: boolean,
    message = "You have unsaved changes. Leave this page and discard them?"
) {
    // Keep the latest value in a ref so the listeners never go stale.
    const dirtyRef = useRef(isDirty);
    useEffect(() => { dirtyRef.current = isDirty; }, [isDirty]);

    const messageRef = useRef(message);
    useEffect(() => { messageRef.current = message; }, [message]);

    // ── 1. Tab close / reload ────────────────────────────────────────────────
    useEffect(() => {
        function onBeforeUnload(e: BeforeUnloadEvent) {
            if (!dirtyRef.current) return;
            e.preventDefault();
            // Legacy browsers need returnValue set to show the prompt.
            e.returnValue = "";
            return "";
        }
        window.addEventListener("beforeunload", onBeforeUnload);
        return () => window.removeEventListener("beforeunload", onBeforeUnload);
    }, []);

    // ── 2. Internal link clicks ──────────────────────────────────────────────
    useEffect(() => {
        function onClick(e: MouseEvent) {
            if (!dirtyRef.current) return;
            // Let modified clicks (new tab/window) through untouched.
            if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

            const anchor = (e.target as HTMLElement | null)?.closest?.("a");
            if (!anchor) return;

            const href = anchor.getAttribute("href");
            if (!href || href.startsWith("#")) return;
            if (anchor.target && anchor.target !== "_self") return;
            if (anchor.hasAttribute("download")) return;
            // Opt-out hook for links that should never be guarded.
            if (anchor.dataset.skipUnsavedGuard === "true") return;

            // Only guard same-origin navigations away from the current path.
            let dest: URL;
            try { dest = new URL(href, window.location.href); } catch { return; }
            if (dest.origin !== window.location.origin) return;
            if (dest.pathname === window.location.pathname && dest.search === window.location.search) return;

            if (!window.confirm(messageRef.current)) {
                e.preventDefault();
                e.stopPropagation();
            } else {
                // Allowing the navigation: drop the guard so the native
                // beforeunload prompt doesn't fire a second time.
                dirtyRef.current = false;
            }
        }
        // Capture phase so we run before Next's Link handler.
        document.addEventListener("click", onClick, true);
        return () => document.removeEventListener("click", onClick, true);
    }, []);

    // ── 3. Browser back / forward ────────────────────────────────────────────
    useEffect(() => {
        if (!isDirty) return;

        // Push a sentinel entry so the first Back press lands here instead of
        // actually leaving; we then ask, and either stay or go back for real.
        window.history.pushState(null, "", window.location.href);

        function onPopState() {
            if (!dirtyRef.current) return;
            if (window.confirm(messageRef.current)) {
                dirtyRef.current = false;
                window.history.back();
            } else {
                // Re-arm the sentinel so the next Back press prompts again.
                window.history.pushState(null, "", window.location.href);
            }
        }

        window.addEventListener("popstate", onPopState);
        return () => window.removeEventListener("popstate", onPopState);
    }, [isDirty]);
}

/**
 * Tracks whether a form's current values differ from the values it loaded with.
 *
 * Returns a `dirty` flag wired into {@link useUnsavedChanges}, plus helpers to
 * re-baseline after a successful save and to clear the guard entirely.
 *
 * ```tsx
 * const form = useDirtyTracker({ name, email });
 * form.guard();                 // arm the navigation warnings
 * await save(); form.markClean({ name, email });
 * ```
 */
export function useDirtyTracker<T extends Record<string, unknown>>(current: T) {
    const [baseline, setBaseline] = useState<string>(() => stableStringify(current));
    const [forcedClean, setForcedClean] = useState(false);

    const currentSnapshot = stableStringify(current);
    const dirty = !forcedClean && currentSnapshot !== baseline;

    const markClean = useCallback((next?: T) => {
        setBaseline(stableStringify(next ?? current));
        setForcedClean(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentSnapshot]);

    const disableGuard = useCallback(() => setForcedClean(true), []);

    return { dirty, markClean, disableGuard };
}

/** JSON.stringify with sorted keys, so key order never causes a false "dirty". */
function stableStringify(value: unknown): string {
    return JSON.stringify(value, (_k, v) => {
        if (v && typeof v === "object" && !Array.isArray(v)) {
            return Object.keys(v as Record<string, unknown>)
                .sort()
                .reduce<Record<string, unknown>>((acc, k) => {
                    acc[k] = (v as Record<string, unknown>)[k];
                    return acc;
                }, {});
        }
        return v;
    });
}
