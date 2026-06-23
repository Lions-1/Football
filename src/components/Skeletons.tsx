/**
 * Shared loading skeletons used by route-level loading.tsx files. They render
 * instantly on navigation (while the dynamic server page streams in) so a tap
 * always produces immediate "it's loading" feedback instead of a blank wait.
 */

function Bar({ className = "" }: { className?: string }) {
  return <div className={`bg-gray-200 rounded animate-pulse ${className}`} />;
}

function CardSkeleton() {
  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      <div className="aspect-square bg-gray-200 animate-pulse" />
      <div className="p-3 space-y-2">
        <Bar className="h-2.5 w-1/3" />
        <Bar className="h-3.5 w-3/4" />
        <Bar className="h-4 w-1/2 mt-2" />
      </div>
    </div>
  );
}

/** Header + product grid — for league, team, products and search pages. */
export function CatalogSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-14 h-14 rounded-full bg-gray-200 animate-pulse shrink-0" />
        <div className="space-y-2">
          <Bar className="h-6 w-48" />
          <Bar className="h-3 w-24" />
        </div>
      </div>

      {/* Product grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

/** Grid of horizontal league tiles — for the /leagues page. */
export function LeaguesSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="space-y-3 mb-10">
        <Bar className="h-9 w-56" />
        <Bar className="h-4 w-80 max-w-full" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-2 border-gray-200 rounded-2xl p-5">
            <div className="w-16 h-16 rounded-xl bg-gray-200 animate-pulse shrink-0" />
            <div className="flex-1 space-y-2">
              <Bar className="h-4 w-2/3" />
              <Bar className="h-3 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Two-column product detail — for the /product/[slug] page. */
export function ProductDetailSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <Bar className="h-3 w-64 max-w-full mb-6" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="aspect-square rounded-xl bg-gray-200 animate-pulse" />
        <div className="space-y-4">
          <Bar className="h-3 w-40" />
          <Bar className="h-8 w-3/4" />
          <Bar className="h-7 w-28" />
          <Bar className="h-20 w-full mt-4" />
          <div className="flex gap-2 mt-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Bar key={i} className="h-10 w-14" />
            ))}
          </div>
          <Bar className="h-12 w-full mt-4" />
          <Bar className="h-12 w-full" />
        </div>
      </div>
    </div>
  );
}
