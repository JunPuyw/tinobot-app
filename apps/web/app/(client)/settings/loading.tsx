const Skeleton = ({ className }: { className?: string }) => (
  <div className={`bg-muted rounded-md animate-pulse ${className}`} />
);
export default function SettingsLoading() {
    return (
        <div className="w-full max-w-5xl mx-auto flex flex-col gap-8 animate-pulse">
            <div className="flex justify-between items-center">
                <div className="space-y-2">
                    <Skeleton className="h-9 w-56" />
                    <Skeleton className="h-4 w-72" />
                </div>
                <Skeleton className="h-7 w-28 rounded-full" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="p-6 rounded-2xl border border-border/50 bg-card/20 space-y-4">
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-10 w-full rounded-xl" />
                    <Skeleton className="h-10 w-full rounded-xl" />
                    <Skeleton className="h-10 w-full rounded-xl mt-4" />
                </div>
                <div className="lg:col-span-2 p-6 rounded-2xl border border-border/50 bg-card/20 space-y-4">
                    <Skeleton className="h-5 w-40" />
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="flex items-center justify-between p-4 border border-border/30 rounded-xl">
                            <div className="flex items-center gap-3">
                                <Skeleton className="size-9 rounded-xl" />
                                <div className="space-y-1.5">
                                    <Skeleton className="h-4 w-32" />
                                    <Skeleton className="h-3 w-24" />
                                </div>
                            </div>
                            <Skeleton className="h-8 w-20 rounded-lg" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
