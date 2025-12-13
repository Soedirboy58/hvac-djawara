// ============================================
// Loading Component
// Skeleton loader for pages
// ============================================

export function Loading() {
  return (
    <div className="p-6 space-y-4">
      <div className="h-8 bg-gray-200 rounded animate-pulse w-1/4" />
      <div className="h-4 bg-gray-200 rounded animate-pulse w-1/3" />
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 bg-gray-200 rounded-lg animate-pulse" />
        ))}
      </div>
    </div>
  )
}
