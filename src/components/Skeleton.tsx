export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-muted ${className}`} />;
}

export function ProductCardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-2">
      <Skeleton className="aspect-square w-full" />
      <Skeleton className="mt-2 h-3 w-4/5" />
      <Skeleton className="mt-1.5 h-3 w-1/2" />
      <Skeleton className="mt-2 h-4 w-1/3" />
    </div>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {Array.from({ length: count }).map((_, i) => <ProductCardSkeleton key={i} />)}
    </div>
  );
}
