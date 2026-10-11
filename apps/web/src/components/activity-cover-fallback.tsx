/**
 * What an activity card shows when the activity has no picture of its own:
 * the unit's picture if there is one, otherwise the group logo, on a soft
 * background — rather than an empty grey box.
 *
 * Fills its (relative, sized) parent. A plain <img>, not next/image: the logo
 * may be an SVG or sit on any host, and it is tiny.
 */
export function ActivityCoverFallback({ logoUrl }: { logoUrl?: string | null }) {
    return (
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/5 to-amber-200/30 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                src={logoUrl || "/logo.png"}
                alt=""
                loading="lazy"
                className="max-h-[62%] max-w-[55%] object-contain drop-shadow-md transition-transform duration-700 group-hover:scale-105"
            />
        </div>
    );
}
