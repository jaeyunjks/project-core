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
          {/* Period + currency pills */}
          <div className="flex items-center gap-2 mb-4">
            <Skeleton className="h-11 flex-1 rounded-[12px]" />
            <Skeleton className="h-11 w-24 rounded-full" />
          </div>

          {/* Hero card */}
          <SkeletonCard className="p-6">
            <div className="flex items-start justify-between mb-2">
              <Skeleton className="h-3 w-32" />
              <div className="flex gap-1.5">
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-8 w-8 rounded-full" />
              </div>
            </div>
            <Skeleton className="h-6 w-40 mb-6" />
            <Skeleton className="h-3 w-24 mb-2" />
            <Skeleton className="h-12 md:h-14 w-64 mb-4" />
            <Skeleton className="h-1.5 w-full rounded-full mb-3" />
            <Skeleton className="h-3 w-56 mb-6" />
            <Skeleton className="h-1.5 w-full rounded-full mb-8" />
            <div className="grid grid-cols-2 gap-4">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i}>
                  <Skeleton className="h-2.5 w-20 mb-2" />
                  <Skeleton className="h-5 w-24" />
                </div>
              ))}
            </div>
          </SkeletonCard>

          {/* Plan CTA */}
          <Skeleton className="h-[52px] rounded-[14px] mt-5" />

          {/* Action row */}
          <div className="flex items-end justify-between mt-6 px-1">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <Skeleton className={i === 2 ? "h-16 w-16 rounded-full" : "h-14 w-14 rounded-full"} />
                <Skeleton className="h-3 w-14" />
              </div>
            ))}
          </div>

          {/* Recent entries */}
          <div className="mt-8">
            <Skeleton className="h-3 w-28 mb-3" />
            <div className="bg-white border border-border-soft rounded-[16px]">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3.5 border-b last:border-b-0 border-border-soft">
                  <Skeleton className="h-9 w-9 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-3.5 w-32 mb-1.5" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="hidden md:block md:col-span-2">
          <div className="flex flex-col gap-4">
            <SkeletonCard className="p-5">
              <Skeleton className="h-3 w-28 mb-4" />
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between py-2">
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </SkeletonCard>
          </div>
        </div>
      </div>
    </div>
  );
}
