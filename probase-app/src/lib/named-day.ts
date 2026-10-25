const OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

function vietnamDay(ms: number): number {
  return Math.floor((ms + OFFSET_MS) / DAY_MS);
}

export function daysUntilDay(iso: string): number {
  return vietnamDay(new Date(iso).getTime()) - vietnamDay(Date.now());
}
