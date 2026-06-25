import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton";

export default function DashboardLoading() {
  return (
    <div className="px-5 py-5 md:px-10 md:py-8 max-w-[1280px] mx-auto">
      {/* TopBar */}
      <div className="flex items-center gap-3 mb-7 md:mb-8">
        <Skeleton className="flex-1 h-11 rounded-[12px]" />
        <Skeleton className="hidden lg:block h-11 w-44 rounded-[12px]" />
        <Skeleton className="h-11 w-11 rounded-[12px]" />
        <Skeleton className="h-11 w-20 rounded-[12px]" />
      </div>

      {/* Hero */}
      <div className="relative overflow-hidden rounded-[18px] border border-border-soft bg-white shadow-card mb-7 md:mb-8 p-8 md:p-10">
        <Skeleton className="h-3 w-24 mb-4" />
        <Skeleton className="h-8 md:h-10 w-2/3 max-w-[360px] mb-3" />
        <Skeleton className="h-3.5 w-1/2 max-w-[280px] mb-1.5" />
        <Skeleton className="h-3.5 w-1/3 max-w-[180px]" />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4 mb-7 md:mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} className="p-4 md:p-5">
            <div className="flex items-start justify-between mb-3.5">
              <Skeleton className="h-2.5 w-20" />
              <Skeleton className="h-8 w-8 rounded-[9px]" />
            </div>
            <Skeleton className="h-6 w-24 mb-2" />
            <Skeleton className="h-3 w-16" />
          </SkeletonCard>
        ))}
      </div>

      {/* App cards */}
      <Skeleton className="h-3 w-20 mb-3.5" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 md:gap-4 mb-8">
        {Array.from({ length: 2 }).map((_, i) => (
          <SkeletonCard key={i} className="rounded-[18px] p-5 md:p-6">
            <div className="flex items-start justify-between mb-5">
              <Skeleton className="h-12 w-12 rounded-[13px]" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="h-5 w-36 mb-2" />
            <Skeleton className="h-3 w-3/4 mb-5" />
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div>
                <Skeleton className="h-2.5 w-20 mb-1.5" />
                <Skeleton className="h-4 w-16" />
              </div>
              <div>
                <Skeleton className="h-2.5 w-20 mb-1.5" />
                <Skeleton className="h-4 w-16" />
              </div>
            </div>
            <Skeleton className="h-10 w-40 rounded-[11px]" />
          </SkeletonCard>
        ))}
      </div>

      {/* Coming soon */}
      <Skeleton className="h-3 w-24 mb-3" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-[#FAF7F0] border border-border-soft rounded-[14px] p-4">
            <div className="flex items-start justify-between mb-3">
              <Skeleton className="h-9 w-9 rounded-[10px]" />
              <Skeleton className="h-4 w-10 rounded" />
            </div>
            <Skeleton className="h-4 w-20 mb-1.5" />
            <Skeleton className="h-3 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
