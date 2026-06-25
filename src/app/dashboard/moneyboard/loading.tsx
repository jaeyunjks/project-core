import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton";

export default function MoneyBoardLoading() {
  return (
    <div className="px-5 py-4 max-w-2xl mx-auto md:max-w-6xl md:px-8 md:py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-7">
        <Skeleton className="h-[38px] w-[38px] rounded-[11px]" />
        <div>
          <Skeleton className="h-6 w-36 mb-1.5" />
          <Skeleton className="h-3 w-40" />
        </div>
      </div>

      <div className="md:grid md:grid-cols-5 md:gap-6">
        {/* Left column */}
        <div className="md:col-span-3 flex flex-col pb-4 md:pb-0">
          {/* Overview card */}
          <SkeletonCard className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Skeleton className="h-3 w-28" />
              <div className="flex gap-1.5">
                <Skeleton className="h-7 w-7 rounded-full" />
                <Skeleton className="h-7 w-7 rounded-full" />
              </div>
            </div>
            <Skeleton className="h-8 md:h-9 w-44 mb-7" />
            <Skeleton className="h-3 w-24 mb-2" />
            <Skeleton className="h-10 md:h-12 w-56 mb-6" />
            <div className="grid grid-cols-2 gap-px bg-border-soft rounded-[8px] overflow-hidden">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="bg-white px-5 py-4">
                  <Skeleton className="h-2.5 w-16 mb-2" />
                  <Skeleton className="h-6 w-24" />
                </div>
              ))}
            </div>
          </SkeletonCard>

          {/* Quick add */}
          <div className="grid grid-cols-2 gap-3 mt-4">
            <Skeleton className="h-[54px] rounded-[10px]" />
            <Skeleton className="h-[54px] rounded-[10px]" />
          </div>

          {/* Entries header + list */}
          <div className="flex items-baseline justify-between mt-8 mb-3">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-3 w-16" />
          </div>
          <div className="flex flex-col gap-4">
            {Array.from({ length: 3 }).map((_, group) => (
              <div key={group}>
                <Skeleton className="h-2.5 w-20 mb-1.5 ml-1" />
                <div className="bg-white border border-border-soft rounded-[10px] divide-y divide-border-soft">
                  {Array.from({ length: group === 1 ? 2 : 1 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-3">
                      <Skeleton className="h-8 w-8 rounded-md" />
                      <div className="flex-1">
                        <Skeleton className="h-3.5 w-32 mb-1.5" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-7 w-7 rounded-full" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right column */}
        <div className="hidden md:block md:col-span-2">
          <div className="flex flex-col gap-4">
            <SkeletonCard className="p-5">
              <Skeleton className="h-3 w-24 mb-4" />
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between py-2">
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </SkeletonCard>
            <SkeletonCard className="p-5">
              <Skeleton className="h-3 w-24 mb-3" />
              <Skeleton className="h-3 w-full rounded-full mb-3" />
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-3 py-2">
                  <Skeleton className="h-2 w-2 rounded" />
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3 w-10" />
                  <Skeleton className="h-3 w-14" />
                </div>
              ))}
            </SkeletonCard>
          </div>
        </div>
      </div>
    </div>
  );
}
