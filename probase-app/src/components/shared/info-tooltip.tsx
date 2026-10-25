import { Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import React from 'react';

export function InfoTooltip({
  text,
  side = 'right',
  className,
}: {
  text: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  className?: string;
}) {
  return (
    <TooltipProvider delay={100}>
      <Tooltip>
        <TooltipTrigger
          type="button"
          className={`cursor-help text-muted-foreground hover:text-foreground ${className || ''}`}
        >
          <Info className="h-4 w-4" />
          <span className="sr-only">Thông tin thêm</span>
        </TooltipTrigger>
        <TooltipContent side={side} className="max-w-[280px]">
          {text}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
