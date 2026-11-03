'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { SessionUser } from '@/lib/api/types';
import { NAV_BY_ROLE, type NavItem } from '@/lib/nav';
import { cn } from '@/lib/utils';
import { Brand } from '@/components/layout/brand';
import { SemesterContext } from '@/components/rounds/semester-context';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar';

function NavEntry({ item }: { item: NavItem }) {
  const pathname = usePathname();
  const active =
    item.href.split('/').length === 2
      ? pathname === item.href
      : pathname === item.href || pathname.startsWith(`${item.href}/`);

  const Icon = item.icon;

  if (!item.ready) {
    return (
      <SidebarMenuItem className="group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
        <SidebarMenuButton
          disabled
          tooltip={`${item.label} — chưa xây dựng`}
          className={cn(
            'h-9 rounded-lg font-medium cursor-not-allowed opacity-35 text-neutral-500',
            'group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-0! group-data-[collapsible=icon]:justify-center',
          )}
        >
          <Icon className="size-4 shrink-0 text-neutral-500" />
          <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  return (
    <SidebarMenuItem className="group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
      <SidebarMenuButton
        isActive={active}
        tooltip={item.label}
        className={cn(
          'h-9 rounded-lg font-medium transition-all duration-150',
          'group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-0! group-data-[collapsible=icon]:justify-center',
          active
            ? 'bg-white/10 font-medium text-white shadow-xs [&_svg]:text-white hover:bg-white/12 hover:text-white'
            : 'text-neutral-400 hover:bg-white/6 hover:text-white [&_svg]:text-neutral-400 hover:[&_svg]:text-white',
        )}
        render={<Link href={item.href} />}
      >
        <Icon className="size-4 shrink-0" />
        <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

export function AppSidebar({ user }: { user: SessionUser }) {
  return (
    <Sidebar variant="sidebar" collapsible="icon">
      <SidebarHeader className="h-14 flex items-center justify-between px-4 border-b border-white/8 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:justify-center">
        <Link
          href="/"
          className="flex items-center justify-center rounded-md focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none"
        >
          <div className="group-data-[collapsible=icon]:hidden">
            <Brand invert />
          </div>
          <div className="hidden group-data-[collapsible=icon]:flex items-center justify-center size-8 rounded-lg bg-blue-600/20 text-blue-400 font-bold text-sm border border-blue-500/30">
            PB
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent className="gap-4 px-1 py-2 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:py-2 group-data-[collapsible=icon]:gap-1">
        {NAV_BY_ROLE[user.role].map((group, index) => (
          <SidebarGroup
            key={group.label ?? index}
            className="px-3 py-0 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:py-0"
          >
            {group.label && (
              <SidebarGroupLabel className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-neutral-500 group-data-[collapsible=icon]:hidden">
                {group.label}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent className="group-data-[collapsible=icon]:w-full">
              <SidebarMenu className="gap-1 group-data-[collapsible=icon]:gap-1 group-data-[collapsible=icon]:items-center">
                {group.items.map((item) => (
                  <NavEntry key={item.href} item={item} />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="px-3 py-3 border-t border-white/8 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:py-2 flex items-center justify-center">
        <SemesterContext />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
