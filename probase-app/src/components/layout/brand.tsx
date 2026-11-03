import { cn } from '@/lib/utils';

export function Brand({
  className,
  invert,
}: {
  className?: string;
  invert?: boolean;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center font-heading select-none text-xl font-bold tracking-tight',
        invert ? 'text-white' : 'text-foreground',
        className,
      )}
    >
      Pro<span className="text-blue-500">Base</span>
    </span>
  );
}
