"use client";

import { useRouter } from "next/navigation";
import { useEffect, useCallback, useState } from "react";
import { LeaveGuard } from "@/lib/leave-guard";

type Router = ReturnType<typeof useRouter>;

/**
 * Wire a {@link LeaveGuard} to the real window and router. Also records the
 * URL a sentinel was pushed for, which the hook needs when it unmounts.
 */
function createGuard(router: Router, message: string) {
    const sentinel = { url: null as string | null };
    const guard = new LeaveGuard({
        pushSentinel: () => {
            sentinel.url = window.location.href;
            window.history.pushState(null, "", window.location.href);
        },
        back: () => window.history.back(),
        confirm: (text) => window.confirm(text),
        replace: (href) => router.replace(href),
        push: (href) => router.push(href),
        go: (delta) => window.history.go(delta),
    }, message);
    return { guard, sentinel };
}

/**
 * Warns before losing unsaved form edits.
 *
 * Covers the three ways a user can leave a page in the App Router:
 *   1. Closing / reloading the tab        → native `beforeunload` prompt
 *   2. Clicking an internal link          → intercepted, routed through `confirm`
 *   3. Browser Back / Forward             → intercepted via a history sentinel
 *
 * The decisions live in {@link LeaveGuard} (pure, tested against a simulated
 * history stack); this hook only connects it to the window and the router.
 *
 * @param isDirty  whether there are unsaved edits right now
 * @param message  text shown in the in-app confirm (the native tab-close prompt
 *                 always uses the browser's own wording)
 * @returns `leaveTo(href)` — navigate away deliberately (after a save, a delete)
 *          without tripping the guard and without leaving stale history behind;
 *          `leaveBack()` — the same, but back to the page the user came from
 */
export function useUnsavedChanges(
    isDirty: boolean,
    message = "You have unsaved changes. Leave this page and discard them?"
) {
    // `useRouter()` returns a stable instance in the App Router, so the guard
    // can hold it directly. Built once, in a lazy initializer.
    const router = useRouter();
    const [{ guard, sentinel }] = useState(() => createGuard(router, message));

    useEffect(() => { guard.setMessage(message); }, [guard, message]);
    useEffect(() => { guard.setDirty(isDirty); }, [guard, isDirty]);

    useEffect(() => {
        // ── 1. Tab close / reload ────────────────────────────────────────────
        function onBeforeUnload(e: BeforeUnloadEvent) {
            if (!guard.shouldBlockUnload()) return;
            e.preventDefault();
            // Legacy browsers need returnValue set to show the prompt.
            e.returnValue = "";
            return "";
        }

        // ── 2. Internal link clicks ──────────────────────────────────────────
        function onClick(e: MouseEvent) {
            if (!guard.isDirty) return;
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

            const outcome = guard.onLinkClick(dest.pathname + dest.search + dest.hash);
            if (outcome !== "proceed") {
                // "stay": cancelled. "takeover": the guard navigated itself.
                e.preventDefault();
                e.stopPropagation();
            }
        }

        // ── 3. Browser back / forward ────────────────────────────────────────
        const onPopState = () => guard.onPopState();

        window.addEventListener("beforeunload", onBeforeUnload);
        // Capture phase so we run before Next's Link handler.
        document.addEventListener("click", onClick, true);
        window.addEventListener("popstate", onPopState);
        return () => {
            window.removeEventListener("beforeunload", onBeforeUnload);
            document.removeEventListener("click", onClick, true);
            window.removeEventListener("popstate", onPopState);
        };
    }, [guard]);

    // Unmounting with the sentinel still on the stack means the form went away
    // while the user stayed put (an inline form was cancelled or closed after a
    // save) — every deliberate way of LEAVING the page clears it first. Pop it,
    // or Back would have a dead copy of this page to step through.
    //
    // Only when the URL is still the one the sentinel was pushed for: if some
    // other code navigated without telling the guard, popping here would yank
    // the user back off the page they just went to, which is far worse than
    // one spare Back press.
    useEffect(() => () => {
        const stillHere = window.location.href === sentinel.url;
        if (guard.dispose() && stillHere) window.history.back();
    }, [guard, sentinel]);

    const leaveTo = useCallback(
        (href: string, options: { replace?: boolean } = {}) => guard.leaveTo(href, options),
        [guard]
    );

    const leaveBack = useCallback(() => guard.leaveBack(), [guard]);

    return { leaveTo, leaveBack };
}

/**
 * Tracks whether a form's current values differ from the values it loaded with.
 *
 * Returns a `dirty` flag to feed {@link useUnsavedChanges}, plus helpers to
 * re-baseline after a successful save and to switch the guard off entirely.
 *
 * ```tsx
 * const form = useDirtyTracker({ name, email });
 * const { leaveTo } = useUnsavedChanges(form.dirty);
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
