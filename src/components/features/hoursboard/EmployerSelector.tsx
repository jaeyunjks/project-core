"use client";

import { useRouter, usePathname } from "next/navigation";

interface Props {
  employers: { id: string; name: string }[];
  selectedId: string;
}

export function EmployerSelector({ employers, selectedId }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const id = e.target.value;
    const params = new URLSearchParams();
    params.set("employer", id);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="mb-5">
      <div className="relative">
        <select
          value={selectedId}
          onChange={handleChange}
          className="w-full h-11 rounded-[12px] border border-border-soft bg-white pl-4 pr-10 text-[14px] font-semibold text-ink appearance-none outline-none focus:border-sage focus:ring-[3px] focus:ring-sage/10 transition-all cursor-pointer"
        >
          {employers.map((emp) => (
            <option key={emp.id} value={emp.id}>
              {emp.name}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ghost">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>
      </div>
    </div>
  );
}
