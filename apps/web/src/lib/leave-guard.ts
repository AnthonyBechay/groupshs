/**
 * The "you have unsaved changes" state machine, free of React and the DOM so it
 * can be tested against a simulated history stack.
 *
 * ── Why a sentinel ──────────────────────────────────────────────────────────
 * A Back press cannot be cancelled. The only way to ask "discard changes?" is
 * to keep a duplicate entry for the current page on top of the history stack
 * while the form is dirty: the first Back then lands on the same page, and we
 * can ask before going back for real.
 *
 * The duplicate must be REMOVED when it is no longer needed. An earlier version
 * left it behind, so after every save Back appeared to do nothing once — and
 * once more for each further edit-and-save. The rules:
 *
 *   • saved in place (dirty → clean, still on the page)  → pop it silently
 *   • leaving on purpose after a save                    → replace it with the
 *     destination, so no stale copy of the form stays in history
 *   • leaving through a link, after confirming           → same, replaced
 */

export type LeaveGuardEnv = {
    /** Push a duplicate of the current entry (history.pushState with the same URL). */
    pushSentinel(): void;
    /** history.back() — asynchronous: a popstate follows later. */
    back(): void;
    /** Ask the user. true = discard and leave. */
    confirm(message: string): boolean;
    /** Navigate, replacing the current history entry. */
    replace(href: string): void;
    /** Navigate, adding a history entry. */
    push(href: string): void;
    /** history.go(delta) — like back(), asynchronous. */
    go(delta: number): void;
};

export class LeaveGuard {
    private dirty = false;
    /** Is our duplicate entry currently on top of the stack? */
    private sentinel = false;
    /** A back() of ours is in flight — the next popstate is not the user's. */
    private silentPop = false;
    /** Where to go, replacing the page, once that back() has landed. */
    private replaceAfterPop: string | null = null;

    constructor(
        private env: LeaveGuardEnv,
        private message = "You have unsaved changes. Leave this page and discard them?"
    ) {}

    setMessage(message: string) { this.message = message; }

    get isDirty() { return this.dirty; }
    get hasSentinel() { return this.sentinel; }

    /** Call whenever the form's dirty state changes. */
    setDirty(next: boolean) {
        if (next === this.dirty) return;
        this.dirty = next;

        if (next) {
            if (!this.sentinel) this.arm();
            return;
        }
        if (this.sentinel) {
            // Saved (or reset) in place: take our entry off the stack so Back is
            // not left with a dead copy of this page to step through.
            this.sentinel = false;
            this.silentPop = true;
            this.env.back();
        }
    }

    /** Wire to the window's `popstate` event. */
    onPopState() {
        if (this.silentPop) {
            this.silentPop = false;
            if (this.replaceAfterPop !== null) {
                // Our sentinel is gone; now replace the page itself.
                const href = this.replaceAfterPop;
                this.replaceAfterPop = null;
                this.env.replace(href);
                return;
            }
            // If the form went dirty again before our pop landed, the pop
            // consumed the NEW sentinel — put one back.
            if (this.sentinel) {
                this.sentinel = false;
                if (this.dirty) this.arm();
            }
            return;
        }
        if (!this.sentinel) return;   // not our entry: an ordinary navigation

        // The user pressed Back and consumed the sentinel.
        this.sentinel = false;
        if (!this.dirty) return;

        if (this.env.confirm(this.message)) {
            this.dirty = false;
            this.env.back();          // now actually leave
        } else {
            this.arm();               // stay, and stay guarded
        }
    }

    /**
     * The user clicked an internal link while the form may be dirty.
     *
     *   "proceed"   not dirty, or confirmed with nothing to clean up — let the
     *               click through untouched
     *   "stay"      the user cancelled — the caller must stop the click
     *   "takeover"  confirmed, and the guard has ALREADY navigated (replacing
     *               the sentinel) — the caller must stop the click
     */
    onLinkClick(href: string): "proceed" | "stay" | "takeover" {
        if (!this.dirty) return "proceed";
        if (!this.env.confirm(this.message)) return "stay";

        this.dirty = false;
        if (!this.sentinel) return "proceed";

        this.sentinel = false;
        this.env.replace(href);
        return "takeover";
    }

    /**
     * Leave on purpose — after a successful save or delete. Never prompts.
     * `replace` is for when the page being left must not be returned to at all
     * (the record was deleted).
     */
    leaveTo(href: string, options: { replace?: boolean } = {}) {
        this.dirty = false;
        if (this.sentinel && options.replace) {
            // The page must not stay in history at all. Replacing only the
            // sentinel would leave the page itself one Back press away — a
            // deleted record, or a "new" form that was just submitted. Pop the
            // sentinel first, then replace the page (in onPopState).
            this.sentinel = false;
            this.silentPop = true;
            this.replaceAfterPop = href;
            this.env.back();
            return;
        }
        if (this.sentinel || options.replace) {
            // Replacing our sentinel leaves exactly one entry for this page.
            this.sentinel = false;
            this.env.replace(href);
        } else {
            this.env.push(href);
        }
    }

    /**
     * Leave on purpose by going BACK to wherever the user came from — for a
     * form reached through a "set it there" link, where saving should return
     * to the page that sent them. Never prompts.
     *
     * Going back, rather than navigating to that page, leaves no trace: with
     * leaveTo() the history would read  origin → form → origin  and Back from
     * the origin would reopen the form just saved.
     */
    leaveBack() {
        this.dirty = false;
        if (this.sentinel) {
            // Step over our duplicate entry and the page itself in one move.
            this.sentinel = false;
            this.env.go(-2);
        } else {
            this.env.go(-1);
        }
    }

    /**
     * The form is going away while the user stays on the page — an inline form
     * closed by Cancel, or hidden after a save. Returns true when a sentinel is
     * still on the stack and the caller must pop it (history.back()).
     */
    dispose(): boolean {
        const hadSentinel = this.sentinel;
        this.sentinel = false;
        this.dirty = false;
        return hadSentinel;
    }

    /** Should the browser's native "leave site?" prompt show on tab close? */
    shouldBlockUnload() { return this.dirty; }

    private arm() {
        this.env.pushSentinel();
        this.sentinel = true;
    }
}
