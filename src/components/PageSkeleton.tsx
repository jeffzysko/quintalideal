export function PageSkeleton() {
  return (
    <div className="min-h-screen bg-background animate-pulse">
      {/* Header skeleton */}
      <div className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur">
        <div className="flex items-center gap-3 px-4 py-4 md:px-6">
          <div className="h-9 w-9 rounded-md bg-muted" />
          <div className="h-5 w-40 rounded bg-muted" />
        </div>
      </div>

      {/* Content skeleton */}
      <div className="mx-auto max-w-6xl px-4 py-6 md:px-6">
        <div className="mb-6 h-8 w-2/3 rounded-md bg-muted md:w-1/3" />
        <div className="mb-8 h-4 w-1/2 rounded bg-muted" />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-lg border border-border bg-card p-4">
              <div className="mb-3 h-4 w-24 rounded bg-muted" />
              <div className="mb-2 h-8 w-32 rounded bg-muted" />
              <div className="h-3 w-full rounded bg-muted" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
