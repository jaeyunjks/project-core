import { cn } from "@/lib/utils";

/** Generic skeleton block — shimmer applied via .pc-skel in globals.css */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("pc-skel", className)} aria-hidden="true" />;
}

/** Card-shaped skeleton wrapper — matches the rest of the design language */
export function SkeletonCard({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "bg-white border border-border-soft rounded-[14px] p-5 shadow-card",
        className
      )}
    >
      {children}
    </div>
  );
}
