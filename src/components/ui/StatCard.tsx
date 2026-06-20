import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string;
  valueClassName?: string;
  className?: string;
}

export function StatCard({
  label,
  value,
  valueClassName,
  className,
}: StatCardProps) {
  return (
    <div className={cn("bg-[#faf7f1] p-3 px-3.5", className)}>
      <div className="text-[10px] font-semibold font-mono uppercase tracking-[0.08em] text-ghost mb-1">
        {label}
      </div>
      <div
        className={cn(
          "text-[19px] font-semibold font-mono text-ink",
          valueClassName
        )}
      >
        {value}
      </div>
    </div>
  );
}
