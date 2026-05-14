const Skeleton = ({ className }: { className?: string }) => (
  <div className={`bg-muted rounded-md animate-pulse ${className}`} />
);
export default function BillingLoading() {
    return (
        <div className="w-full max-w-4xl mx-auto flex flex-col gap-8 animate-pulse">
            <div className="space-y-2">
                <Skeleton className="h-9 w-36" />
                <Skeleton className="h-4 w-64" />
            </div>
            <div className="p-5 rounded-2xl border border-border/50 bg-card/20 flex items-center gap-4">
                <Skeleton className="size-10 rounded-xl shrink-0" />
                <div className="space-y-2">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-7 w-32" />
                </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-3">
                    <Skeleton className="h-5 w-32" />
                    {Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} className="h-16 w-full rounded-xl" />
                    ))}
                    <Skeleton className="h-12 w-full rounded-xl mt-2" />
                </div>
                <div className="space-y-3">
                    <Skeleton className="h-5 w-40" />
                    {Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton key={i} className="h-16 w-full rounded-xl" />
                    ))}
                </div>
            </div>
        </div>
    );
}
