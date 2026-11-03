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
        'inline-flex h-auto items-center justify-start rounded-xl bg-slate-200/80 dark:bg-slate-900/90 border border-slate-300 dark:border-slate-800 p-1.5 text-slate-600 dark:text-slate-400 gap-1',
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
        'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200',
        // Trạng thái Active với chữ màu xanh chủ đạo #3b82f6
        'data-[active]:bg-white data-[active]:text-primary data-[active]:font-bold data-[active]:shadow-sm data-[active]:border data-[active]:border-slate-200/80',
        'dark:data-[active]:bg-slate-800 dark:data-[active]:text-primary dark:data-[active]:font-bold dark:data-[active]:shadow-md dark:data-[active]:border dark:data-[active]:border-primary/40',
        'aria-selected:bg-white aria-selected:text-primary aria-selected:font-bold aria-selected:shadow-sm aria-selected:border aria-selected:border-slate-200/80',
        'dark:aria-selected:bg-slate-800 dark:aria-selected:text-primary dark:aria-selected:font-bold dark:aria-selected:shadow-md dark:aria-selected:border dark:aria-selected:border-primary/40',
        'data-[selected]:bg-white data-[selected]:text-primary data-[selected]:font-bold data-[selected]:shadow-sm data-[selected]:border data-[selected]:border-slate-200/80',
        'dark:data-[selected]:bg-slate-800 dark:data-[selected]:text-primary dark:data-[selected]:font-bold dark:data-[selected]:shadow-md dark:data-[selected]:border dark:data-[selected]:border-primary/40',
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
