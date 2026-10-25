import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import { Loader2 } from 'lucide-react';
import React from 'react';

interface DetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  badge?: React.ReactNode;
  meta?: React.ReactNode;
  loading?: boolean;
  children: React.ReactNode;
  footer?: React.ReactNode;
  descriptionAria?: string;
}

/**
 * A shared layout for displaying entity details in a side sheet.
 * Standardizes the header (title, badge, metadata), scrollable body, and footer areas.
 */
export function DetailSheet({
  open,
  onOpenChange,
  title,
  badge,
  meta,
  loading,
  children,
  footer,
  descriptionAria = 'Xem chi tiết',
}: DetailSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col p-0 sm:max-w-md">
        {loading ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="size-6 animate-spin text-muted-foreground/50" />
          </div>
        ) : (
          <>
            <SheetHeader className="border-b px-4 py-4 sm:px-5">
              <div className="flex flex-wrap items-start gap-x-3 gap-y-1.5 pr-8">
                <SheetTitle className="font-heading text-base leading-snug">
                  {title}
                </SheetTitle>
                {badge && <div className="mt-0.5">{badge}</div>}
              </div>
              <SheetDescription className="sr-only">
                {descriptionAria}
              </SheetDescription>
              {meta && (
                <div className="flex flex-wrap gap-x-4 gap-y-1.5 pt-1 text-sm text-muted-foreground">
                  {meta}
                </div>
              )}
            </SheetHeader>

            <div className="flex-1 space-y-6 overflow-y-auto px-4 py-5 sm:px-5">
              {children}
            </div>

            {footer && (
              <SheetFooter className="flex flex-row justify-end gap-2 border-t px-4 py-4 sm:px-5">
                {footer}
              </SheetFooter>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
