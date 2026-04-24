export default function Skeleton({ className = '' }) {
  return (
    <div className={`bg-gray-200 animate-pulse rounded ${className}`} aria-hidden="true" />
  );
}

export function SkeletonRow({ cols = 5 }) {
  return (
    <tr aria-hidden="true">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="py-3 px-4">
          <div className="h-4 bg-gray-200 animate-pulse rounded" />
        </td>
      ))}
    </tr>
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-surface border border-border-muted rounded-md p-4 space-y-3" aria-hidden="true">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-200 animate-pulse rounded w-2/3" />
          <div className="h-3 bg-gray-200 animate-pulse rounded w-1/3" />
        </div>
      </div>
      <div className="h-3 bg-gray-200 animate-pulse rounded" />
      <div className="h-3 bg-gray-200 animate-pulse rounded w-4/5" />
    </div>
  );
}

export function SkeletonStatCard() {
  return (
    <div className="bg-surface border border-border-muted rounded-md p-4" aria-hidden="true">
      <div className="h-3 bg-gray-200 animate-pulse rounded w-24 mb-3" />
      <div className="h-8 bg-gray-200 animate-pulse rounded w-16" />
    </div>
  );
}
