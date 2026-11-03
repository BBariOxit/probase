'use client';

import * as React from 'react';
import { Tabs as TabsPrimitive } from '@base-ui/react/tabs';
import { cn } from '@/lib/utils';

function Tabs({
  className,
  ...props
}: TabsPrimitive.Root.Props) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn('flex flex-col gap-4', className)}
      {...props}
    />
  );
}

function TabsList({
  className,
  ...props
}: TabsPrimitive.List.Props) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        'inline-flex h-auto items-center justify-start rounded-xl bg-slate-200/80 dark:bg-[#141414] border border-slate-300 dark:border-neutral-800 p-1.5 text-slate-600 dark:text-neutral-400 gap-1',
        className,
      )}
      {...props}
    />
  );
}

function TabsTrigger({
  className,
  ...props
}: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      className={cn(
        'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 cursor-pointer',
        'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-neutral-200',
        // Trạng thái Active: Nền màu chủ đạo primary với chữ trắng sắc nét
        'data-[active]:bg-primary data-[active]:text-primary-foreground data-[active]:font-bold data-[active]:shadow-sm',
        'aria-selected:bg-primary aria-selected:text-primary-foreground aria-selected:font-bold aria-selected:shadow-sm',
        'data-[selected]:bg-primary data-[selected]:text-primary-foreground data-[selected]:font-bold data-[selected]:shadow-sm',
        className,
      )}
      {...props}
    />
  );
}

function TabsContent({
  className,
  ...props
}: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-content"
      className={cn(
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring outline-none',
        className,
      )}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
