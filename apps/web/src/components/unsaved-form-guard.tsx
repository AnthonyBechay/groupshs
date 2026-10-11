"use client";

import { useEffect, useRef, useState } from "react";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";

/**
 * Drop inside any `<form>` to warn before its edits are lost.
 *
 * ```tsx
 * {showForm && (
 *     <form onSubmit={save}>
 *         <UnsavedFormGuard />
 *         …fields…
 *     </form>
 * )}
 * ```
 *
 * It watches its own form for input, so it works with uncontrolled fields and
 * needs no wiring. Because it lives inside the form, its "dirty" state resets
 * by itself each time the form is opened — a page-level flag would have to be
 * reset by hand at every place the form closes, and one missed reset makes an
 * untouched form prompt on exit.
 *
 * Limit: it only sees native input/change events. Edits made purely through
 * buttons (reordering, removing an uploaded image) do not count as changes.
 */
export function UnsavedFormGuard({ message }: { message?: string }) {
    const marker = useRef<HTMLSpanElement>(null);
    const [dirty, setDirty] = useState(false);

    useUnsavedChanges(dirty, message);

    useEffect(() => {
        const form = marker.current?.closest("form");
        if (!form) return;
        const markDirty = () => setDirty(true);
        form.addEventListener("input", markDirty);
        form.addEventListener("change", markDirty);
        return () => {
            form.removeEventListener("input", markDirty);
            form.removeEventListener("change", markDirty);
        };
    }, []);

    return <span ref={marker} hidden />;
}
