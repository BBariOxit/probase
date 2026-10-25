import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getRecentCohorts(
  count = 5,
): { label: string; value: string }[] {
  const currentYear = new Date().getFullYear();
  return Array.from({ length: count }, (_, i) => {
    const year = currentYear - i;
    return {
      label: year.toString().slice(-2),
      value: year.toString(),
    };
  });
}
