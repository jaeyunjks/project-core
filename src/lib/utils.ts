export function formatCurrency(amount: number, symbol = "£"): string {
  return `${symbol}${amount.toFixed(2)}`;
}

export function formatHours(hours: number): string {
  return `${hours % 1 === 0 ? hours.toFixed(0) : hours.toFixed(1)} h`;
}

export function formatBreak(minutes: number): string {
  if (minutes === 0) return "No break";
  return `${minutes}m break`;
}

export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(" ");
}
