const Skeleton = ({ className }: { className?: string }) => (
  <div className={`bg-muted rounded-md animate-pulse ${className}`} />
);
export default function ProvidersLoading() {
    return (
        <div className="flex flex-col gap-6 animate-pulse">
            <div className="flex justify-between items-center">
                <Skeleton className="h-9 w-48" />
                <Skeleton className="h-9 w-32 rounded-xl" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 9 }).map((_, i) => (
                    <div key={i} className="p-5 rounded-2xl border border-border/50 bg-card/20 flex items-center gap-4">
                        <Skeleton className="size-12 rounded-xl shrink-0" />
                        <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-3 w-1/2" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
