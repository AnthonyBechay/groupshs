"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Photo = {
    id: string;
    imageUrl: string;
    caption: string | null;
};

export function GalleryCarousel({ photos }: { photos: Photo[] }) {
    const [current, setCurrent] = useState(0);
    const [isHovered, setIsHovered] = useState(false);

    const next = useCallback(() => {
        setCurrent((c) => (c + 1) % photos.length);
    }, [photos.length]);

    const prev = useCallback(() => {
        setCurrent((c) => (c - 1 + photos.length) % photos.length);
    }, [photos.length]);

    // Auto-advance every 4 seconds
    useEffect(() => {
        if (isHovered || photos.length <= 1) return;
        const timer = setInterval(next, 4000);
        return () => clearInterval(timer);
    }, [next, isHovered, photos.length]);

    if (photos.length === 0) return null;

    return (
        <div
            className="relative w-full overflow-hidden rounded-2xl"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Main image */}
            <div className="relative aspect-[21/9] md:aspect-[21/8] bg-muted">
                {photos.map((photo, i) => (
                    <div
                        key={photo.id}
                        className="absolute inset-0 transition-all duration-700 ease-in-out"
                        style={{
                            opacity: i === current ? 1 : 0,
                            transform: i === current ? "scale(1)" : "scale(1.05)",
                        }}
                    >
                        <Image
                            src={photo.imageUrl}
                            alt={photo.caption || "Scout life"}
                            fill
                            className="object-cover"
                            priority={i === 0}
                        />
                    </div>
                ))}

                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/10" />

                {/* Caption */}
                {photos[current]?.caption && (
                    <div className="absolute bottom-6 left-6 right-6">
                        <p className="text-white text-lg md:text-xl font-semibold drop-shadow-lg">
                            {photos[current].caption}
                        </p>
                    </div>
                )}

                {/* Navigation arrows */}
                {photos.length > 1 && (
                    <>
                        <button
                            onClick={prev}
                            className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-white/30 transition-all opacity-0 group-hover:opacity-100 hover:opacity-100 focus:opacity-100"
                            style={{ opacity: isHovered ? 1 : 0 }}
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button
                            onClick={next}
                            className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-white/30 transition-all"
                            style={{ opacity: isHovered ? 1 : 0 }}
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </>
                )}
            </div>

            {/* Dots */}
            {photos.length > 1 && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {photos.map((_, i) => (
                        <button
                            key={i}
                            onClick={() => setCurrent(i)}
                            className={`h-1.5 rounded-full transition-all duration-300 ${
                                i === current
                                    ? "w-6 bg-white"
                                    : "w-1.5 bg-white/40 hover:bg-white/60"
                            }`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
