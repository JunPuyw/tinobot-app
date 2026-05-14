const Skeleton = ({ className }: { className?: string }) => (
  <div className={`bg-muted rounded-md animate-pulse ${className}`} />
);
export default function UsageLoading() {
    return (
        <div className="flex flex-col gap-8 animate-pulse">
            <div className="flex justify-between items-center">
                <div className="space-y-2">
                    <Skeleton className="h-9 w-56" />
                    <Skeleton className="h-4 w-40" />
                </div>
                <Skeleton className="h-10 w-64 rounded-xl" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="p-6 rounded-2xl border border-border/50 bg-card/20">
                        <Skeleton className="h-4 w-24 mb-4" />
                        <Skeleton className="h-8 w-20" />
                    </div>
                ))}
            </div>
            <div className="p-6 rounded-2xl border border-border/50 bg-card/20">
                <Skeleton className="h-6 w-48 mb-8" />
                <Skeleton className="h-[320px] w-full rounded-xl" />
            </div>
        </div>
    );
}
