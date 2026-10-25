import type { LucideIcon } from 'lucide-react';

export function EmptyState({
  icon: Icon,
  title,
  action,
}: {
  icon: LucideIcon;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 px-6 py-20 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-muted/40 ring-1 ring-border/50">
        <Icon className="size-6 text-muted-foreground/80" />
      </div>
      <p className="text-[15px] font-medium text-muted-foreground">{title}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
