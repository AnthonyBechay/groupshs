export default function AdminLoading() {
    return (
        <div className="space-y-6 animate-pulse">
            <div className="flex justify-between items-center">
                <div className="space-y-2">
                    <div className="h-8 w-48 bg-muted rounded" />
                    <div className="h-3 w-64 bg-muted/60 rounded" />
                </div>
                <div className="h-9 w-32 bg-muted rounded-md" />
            </div>
            <div className="grid md:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-32 bg-muted/40 rounded-xl border" />
                ))}
            </div>
        </div>
    );
}
