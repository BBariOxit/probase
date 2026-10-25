import { cn } from '@/lib/utils';

interface TextSectionProps {
  title: React.ReactNode;
  body: string | null | undefined;
  titleAs?: 'h2' | 'h3' | 'h4' | 'div';
  titleClassName?: string;
  bodyClassName?: string;
  className?: string;
}

/**
 * A reusable component for displaying a block of text (like a description or outcome)
 * with proper whitespace and word-break handling.
 */
export function TextSection({
  title,
  body,
  titleAs: TitleAs = 'h3',
  titleClassName,
  bodyClassName,
  className,
}: TextSectionProps) {
  if (!body) return null;

  return (
    <section className={cn('space-y-1.5', className)}>
      <TitleAs className={cn('text-sm font-medium', titleClassName)}>
        {title}
      </TitleAs>
      <p
        className={cn(
          'text-sm whitespace-pre-line break-words text-muted-foreground',
          bodyClassName,
        )}
      >
        {body}
      </p>
    </section>
  );
}
