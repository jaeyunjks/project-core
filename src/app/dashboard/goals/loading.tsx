import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="px-5 py-4 max-w-2xl mx-auto md:max-w-6xl md:px-8 md:py-8">
      <Skeleton className="h-8 w-48 mb-7" />
      <div className="flex flex-col gap-3">
        <Skeleton className="h-11 w-full rounded-[12px]" />
        <Skeleton className="h-[54px] w-full rounded-[10px]" />
        <Skeleton className="h-[160px] w-full rounded-[14px]" />
        <Skeleton className="h-[160px] w-full rounded-[14px]" />
      </div>
    </div>
  );
}
