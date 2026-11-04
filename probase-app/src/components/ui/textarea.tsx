import * as React from 'react';

import { cn } from '@/lib/utils';

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'flex field-sizing-content min-h-16 w-full rounded-lg border-[1.5px] border-slate-400 dark:border-neutral-700 hover:border-slate-500 dark:hover:border-neutral-500 bg-slate-100 hover:bg-slate-200/50 focus:bg-white dark:bg-[#141414] dark:hover:bg-[#171717] dark:focus:bg-[#141414] px-2.5 py-2 text-base text-slate-900 dark:text-neutral-100 transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 md:text-sm shadow-xs dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40',
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
