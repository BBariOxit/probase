import React from 'react';

export function LoginDivider({
  label = 'hoặc',
}: {
  label?: string;
}) {
  return (
    <div className="relative my-4 flex items-center justify-center">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-border/60" />
      </div>
      <div className="relative flex justify-center text-xs uppercase">
        <span className="bg-card px-2.5 text-[11px] font-medium tracking-wider text-muted-foreground/80">
          {label}
        </span>
      </div>
    </div>
  );
}
