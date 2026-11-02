import type { MoneyEntryDisplay } from "@/types";
import type { CurrencyOption } from "@/domain/moneyboard";
import { formatEntryDate, formatMoney } from "@/domain/moneyboard";
import { cn } from "@/lib/utils";
import { CategoryIcon } from "./CategoryIcon";
import { PencilIcon, RowIconButton, TrashIcon } from "./RowIcons";

interface Props {
  entry: MoneyEntryDisplay;
  currency: CurrencyOption;
  onEdit: () => void;
  onDelete: () => void;
  deleting?: boolean;
  divider?: boolean;
}

/**
 * One compact transaction row: icon · name over metadata · amount over actions.
 * Shared by the dashboard's Recent entries and Transaction history.
 */
export function TransactionRow({ entry, currency, onEdit, onDelete, deleting, divider }: Props) {
  const title = entry.note?.trim() || entry.category.label;
  const date = formatEntryDate(entry.date, currency.locale);
  const meta = `${entry.category.label} · ${entry.account?.name ?? "Unassigned legacy entry"} · ${date} · ${entry.occurrenceTimeKnown ? entry.time : "Time not recorded"}`;
  // Visible line leads with when. A legacy entry's synthetic noon is never shown;
  // "no time" trails so it doesn't push the category out of view.
  const compactMeta = `${date}${entry.occurrenceTimeKnown ? ` ${entry.time}` : ""} · ${entry.category.label} · ${entry.account?.name ?? "Unassigned"}${entry.occurrenceTimeKnown ? "" : " · no time"}`;

  return (
    <div
      className={cn(
        "grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-2.5 px-3.5 py-2 md:px-4",
        divider && "border-b border-border-soft",
      )}
    >
      <div className="row-span-2 w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "#EFE9DC" }}>
        <CategoryIcon icon={entry.category.icon} size={15} color={entry.category.color} />
      </div>
      <div className="truncate text-[14px] font-medium text-ink" title={title}>{title}</div>
      <span className={cn("whitespace-nowrap text-right text-[14px] font-mono font-semibold tabular-nums", entry.kind === "income" ? "text-sage" : "text-ink")}>
        {entry.kind === "income" ? "+" : "−"}{formatMoney(entry.amount, { currency })}
      </span>
      <div className="relative truncate text-[11.5px] font-mono text-muted" title={meta}>
        <span aria-hidden>{compactMeta}</span>
        <span className="sr-only">{meta}</span>
      </div>
      <div className="flex items-center justify-end gap-1">
        <RowIconButton label={`Edit ${title}`} hint="Edit" onClick={onEdit}>
          <PencilIcon />
        </RowIconButton>
        <RowIconButton label={`Delete ${title}`} hint="Delete" tone="danger" onClick={onDelete} busy={deleting}>
          <TrashIcon />
        </RowIconButton>
      </div>
    </div>
  );
}
