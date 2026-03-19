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
    const containerRef = useRef<HTMLDivElement>(null);

    // Number of visible items depends on screen size, but we'll use CSS for responsive
    const maxOffset = Math.max(0, photos.length - 1);

    const next = useCallback(() => {
        setOffset((o) => (o >= maxOffset ? 0 : o + 1));
    }, [maxOffset]);

    const prev = useCallback(() => {
        setOffset((o) => (o <= 0 ? maxOffset : o - 1));
    }, [maxOffset]);

    // Auto-advance
    useEffect(() => {
        if (isHovered || photos.length <= 4) return;
        const timer = setInterval(next, 3000);
        return () => clearInterval(timer);
    }, [next, isHovered, photos.length]);

    if (photos.length === 0) return null;

    return (
        <div
            className="relative group"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
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

            {/* Navigation arrows */}
            {photos.length > 4 && (
                <>
                    <button
                        onClick={prev}
                        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-card border shadow-lg flex items-center justify-center text-foreground hover:bg-primary hover:text-white hover:border-primary transition-all opacity-0 group-hover:opacity-100 z-10"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                        onClick={next}
                        className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-10 h-10 rounded-full bg-card border shadow-lg flex items-center justify-center text-foreground hover:bg-primary hover:text-white hover:border-primary transition-all opacity-0 group-hover:opacity-100 z-10"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </>
            )}

            {/* Progress dots */}
            {photos.length > 4 && (
                <div className="flex justify-center gap-1.5 mt-4">
                    {photos.map((_, i) => (
                        <button
                            key={i}
                            onClick={() => setOffset(i)}
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
