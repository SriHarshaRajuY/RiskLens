export function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

export function toDateOnlyString(date: Date): string {
  return startOfUtcDay(date).toISOString().slice(0, 10);
}

export function daysBetween(start: Date, end: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.max(Math.ceil((startOfUtcDay(end).getTime() - startOfUtcDay(start).getTime()) / msPerDay), 0);
}
