"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Photo = {
    id: string;
    imageUrl: string;
    caption: string | null;
};

export function GalleryCarousel({ photos }: { photos: Photo[] }) {
    const [offset, setOffset] = useState(0);
    const [isHovered, setIsHovered] = useState(false);
    const touchStartX = useRef<number | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const maxOffset = Math.max(0, photos.length - 1);

    const next = useCallback(() => {
        setOffset((o) => (o >= maxOffset ? 0 : o + 1));
    }, [maxOffset]);

    const prev = useCallback(() => {
        setOffset((o) => (o <= 0 ? maxOffset : o - 1));
    }, [maxOffset]);

    // Auto-advance (pause on hover or touch)
    useEffect(() => {
        if (isHovered || photos.length <= 4) return;
        const timer = setInterval(next, 3000);
        return () => clearInterval(timer);
    }, [next, isHovered, photos.length]);

    // Touch swipe handlers
    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        touchStartX.current = e.changedTouches[0].clientX;
        setIsHovered(true); // pause auto-advance while touching
    }, []);

    const handleTouchEnd = useCallback((e: React.TouchEvent) => {
        if (touchStartX.current === null) return;
        const diff = touchStartX.current - e.changedTouches[0].clientX;
        if (Math.abs(diff) > 40) {
            if (diff > 0) next();
            else prev();
        }
        touchStartX.current = null;
        setIsHovered(false);
    }, [next, prev]);

    if (photos.length === 0) return null;

    return (
        <div
            className="relative group"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
        >
            {/* Overflow container */}
            <div className="overflow-hidden rounded-2xl" ref={containerRef}>
                <div
                    className="flex transition-transform duration-500 ease-in-out"
                    style={{
                        transform: `translateX(-${offset * (100 / 4)}%)`,
                    }}
                >
                    {/* Duplicate photos for seamless looping */}
                    {[...photos, ...photos.slice(0, 4)].map((photo, i) => (
                        <div
                            key={`${photo.id}-${i}`}
                            className="shrink-0 w-1/2 md:w-1/3 lg:w-1/4 px-1.5"
                        >
                            <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-muted group/item">
                                <Image
                                    src={photo.imageUrl}
                                    alt={photo.caption || "Scout life"}
                                    fill
                                    sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                                    priority={i < 4}
                                    className="object-cover transition-transform duration-500 group-hover/item:scale-105"
                                />
                                {photo.caption && (
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover/item:opacity-100 transition-opacity duration-300 flex items-end">
                                        <p className="text-white text-sm font-medium p-3 leading-snug">{photo.caption}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Navigation arrows — always visible on mobile, hover-only on desktop */}
            {photos.length > 1 && (
                <>
                    <button
                        onClick={prev}
                        aria-label="Previous"
                        className="absolute left-2 md:left-0 top-1/2 -translate-y-1/2 md:-translate-x-1/2 w-10 h-10 rounded-full bg-card border shadow-lg flex items-center justify-center text-foreground hover:bg-primary hover:text-white hover:border-primary transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100 z-10"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                        onClick={next}
                        aria-label="Next"
                        className="absolute right-2 md:right-0 top-1/2 -translate-y-1/2 md:translate-x-1/2 w-10 h-10 rounded-full bg-card border shadow-lg flex items-center justify-center text-foreground hover:bg-primary hover:text-white hover:border-primary transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100 z-10"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </>
            )}

            {/* Progress dots */}
            {photos.length > 1 && (
                <div className="flex justify-center gap-1.5 mt-4">
                    {photos.map((_, i) => (
                        <button
                            key={i}
                            onClick={() => setOffset(i)}
                            aria-label={`Go to slide ${i + 1}`}
                            className={`h-1.5 rounded-full transition-all duration-300 ${
                                i === offset
                                    ? "w-6 bg-primary"
                                    : "w-1.5 bg-primary/20 hover:bg-primary/40"
                            }`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
