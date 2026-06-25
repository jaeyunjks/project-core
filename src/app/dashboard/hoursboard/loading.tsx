import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton";

export default function HoursBoardLoading() {
  return (
    <div className="px-5 py-4 max-w-2xl mx-auto md:max-w-6xl md:px-8 md:py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-7">
        <div className="flex items-center gap-3">
          <Skeleton className="h-[38px] w-[38px] rounded-[11px]" />
          <div>
            <Skeleton className="h-6 w-32 mb-1.5" />
            <Skeleton className="h-3 w-44" />
          </div>
        </div>
        <Skeleton className="h-[38px] w-[38px] rounded-[11px]" />
      </div>

      <div className="md:grid md:grid-cols-5 md:gap-6">
        {/* Left column — current period + list */}
        <div className="md:col-span-3 flex flex-col pb-4 md:pb-0">
          {/* Current period card */}
          <SkeletonCard className="p-5 mb-4">
            <div className="flex items-start justify-between mb-4">
              <div>
                <Skeleton className="h-3 w-32 mb-2" />
                <Skeleton className="h-5 w-44 mb-1" />
                <Skeleton className="h-3 w-28" />
              </div>
              <Skeleton className="h-4 w-4 rounded" />
            </div>
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-2.5 w-20" />
              </div>
              <Skeleton className="h-1 w-full rounded-full" />
            </div>
            <div className="grid grid-cols-3 gap-px bg-border-soft rounded-[12px] overflow-hidden">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-white px-3 py-3">
                  <Skeleton className="h-2.5 w-12 mb-1.5" />
                  <Skeleton className="h-5 w-16" />
                </div>
              ))}
            </div>
          </SkeletonCard>

          {/* Action row */}
          <div className="flex justify-end gap-2 mb-3">
            <Skeleton className="h-9 w-28 rounded-[11px]" />
            <Skeleton className="h-9 w-32 rounded-[11px]" />
          </div>

          {/* Period list */}
          <Skeleton className="h-3 w-24 mb-3" />
          <div className="flex flex-col gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonCard key={i} className="py-3 px-4 rounded-[14px]">
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <Skeleton className="h-4 w-36 mb-1.5" />
                    <Skeleton className="h-3 w-24 mb-2" />
                    <Skeleton className="h-1 w-40 rounded-full" />
                  </div>
                  <div className="text-right shrink-0">
                    <Skeleton className="h-4 w-12 mb-1.5 ml-auto" />
                    <Skeleton className="h-3 w-16 ml-auto" />
                  </div>
                  <Skeleton className="h-[38px] w-[38px] rounded-[11px]" />
                </div>
              </SkeletonCard>
            ))}
          </div>
        </div>

        {/* Right column — summary panel */}
        <div className="hidden md:block md:col-span-2">
          <div className="flex flex-col gap-4">
            <SkeletonCard className="p-5">
              <Skeleton className="h-3 w-24 mb-4" />
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between py-2">
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </SkeletonCard>
            <SkeletonCard className="p-5">
              <Skeleton className="h-3 w-28 mb-3" />
              <Skeleton className="h-44 w-full rounded-[8px]" />
            </SkeletonCard>
          </div>
        </div>
      </div>
    </div>
  );
}
