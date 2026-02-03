'use client';

interface ProductSkeletonProps {
  count?: number;
}

function SingleProductSkeleton() {
  return (
    <div className="flex items-center gap-4 p-4 border-b border-zinc-100">
      <div className="w-16 h-16 rounded-md bg-zinc-100 animate-pulse flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-3/4 bg-zinc-100 rounded animate-pulse" />
        <div className="h-4 w-20 bg-zinc-100 rounded animate-pulse" />
      </div>
      <div className="w-9 h-9 rounded-full bg-zinc-100 animate-pulse flex-shrink-0" />
    </div>
  );
}

export function ProductSkeleton({ count = 6 }: ProductSkeletonProps) {
  return (
    <div className="bg-white">
      {Array.from({ length: count }).map((_, index) => (
        <SingleProductSkeleton key={index} />
      ))}
    </div>
  );
}
