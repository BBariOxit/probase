import { cn } from '@/lib/utils';

export function PageWithRail({
  rail,
  className,
  children,
}: {
  rail?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'mx-auto grid max-w-6xl items-start gap-4',
        rail && 'lg:grid-cols-[minmax(0,1fr)_20rem]',
        className,
      )}
    >
      {rail && <div className="space-y-4 lg:order-2">{rail}</div>}
      <div className="space-y-4 lg:order-1">{children}</div>
    </div>
  );
}
