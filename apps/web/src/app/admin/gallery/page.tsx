"use client";

import { Button } from "@/components/ui/button";
import { useState, useEffect, useRef } from "react";
import { Trash2, Upload, ImagePlus } from "lucide-react";
import Image from "next/image";

type GalleryPhoto = {
    id: string;
    imageUrl: string;
    caption: string | null;
    sortOrder: number;
};

export default function AdminGalleryPage() {
    const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    async function fetchPhotos() {
        const res = await fetch("/api/admin/gallery");
        setPhotos(await res.json());
        setLoading(false);
    }

    useEffect(() => { fetchPhotos(); }, []);

    async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setUploading(true);

        for (const file of Array.from(files)) {
            const formData = new FormData();
            formData.append("file", file);

            try {
                const res = await fetch("/api/admin/gallery", { method: "POST", body: formData });
                if (!res.ok) {
                    const data = await res.json();
                    alert(data.error || "Upload failed");
                }
            } catch {
                alert("Upload failed");
            }
        }

        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
        fetchPhotos();
    }

    async function handleDelete(id: string) {
        if (!confirm("Delete this photo?")) return;
        await fetch(`/api/admin/gallery/${id}`, { method: "DELETE" });
        fetchPhotos();
    }

    if (loading) return <p className="text-muted-foreground">Loading...</p>;

    return (
        <div>
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold">Gallery</h1>
                    <p className="text-sm text-muted-foreground mt-1">Photos displayed in the carousel on the homepage</p>
                </div>
                <div>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        multiple
                        onChange={handleUpload}
                        className="hidden"
                    />
                    <Button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="gap-2">
                        <ImagePlus className="w-4 h-4" />
                        {uploading ? "Uploading..." : "Upload Photos"}
                    </Button>
                </div>
            </div>

            {photos.length === 0 ? (
                <div className="text-center py-20 border border-dashed rounded-2xl bg-muted/30">
                    <Upload className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                    <p className="text-muted-foreground mb-4">No photos yet. Upload some to show on the homepage carousel.</p>
                    <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="gap-2">
                        <ImagePlus className="w-4 h-4" /> Upload Photos
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {photos.map((photo) => (
                        <div key={photo.id} className="group relative aspect-[4/3] rounded-xl overflow-hidden border bg-muted">
                            <Image src={photo.imageUrl} alt={photo.caption || "Gallery photo"} fill className="object-cover" />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => handleDelete(photo.id)}
                                    className="gap-1"
                                >
                                    <Trash2 className="w-4 h-4" /> Delete
                                </Button>
                            </div>
                            {photo.caption && (
                                <div className="absolute bottom-0 left-0 right-0 bg-black/50 backdrop-blur-sm px-3 py-2">
                                    <p className="text-white text-xs truncate">{photo.caption}</p>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
