import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

export function UserAvatar({
  name,
  email,
  src,
  className,
}: {
  name?: string | null;
  email?: string | null;
  src?: string | null;
  className?: string;
}) {
  const label = name ?? email ?? '';

  return (
    <Avatar className={cn('size-8', className)}>
      {src && <AvatarImage src={src} alt={label} />}
      <AvatarFallback className="bg-muted text-xs font-semibold text-muted-foreground">
        {initial(label)}
      </AvatarFallback>
    </Avatar>
  );
}

function initial(label: string): string {
  const parts = label.trim().split(/\s+/);
  const word = parts.at(-1) ?? label;

  return (word.charAt(0) || '?').toUpperCase();
}
