import { cn } from '@/lib/utils';

export function Brand({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'font-heading text-xl font-semibold tracking-tight',
        className,
      )}
    >
      Pro<span className="text-muted-foreground">Base</span>
    </span>
  );
}
