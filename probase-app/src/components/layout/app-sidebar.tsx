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
      <SidebarMenuItem>
        <SidebarMenuButton
          disabled
          tooltip={`${item.label} — chưa xây dựng`}
          className="h-9 cursor-not-allowed opacity-45"
        >
          <Icon />
          <span>{item.label}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={active}
        tooltip={item.label}
        className={cn(
          'h-9',
          active && 'text-sidebar-primary [&_svg]:text-sidebar-primary',
        )}
        render={<Link href={item.href} />}
      >
        <Icon />
        <span>{item.label}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

export function AppSidebar({ user }: { user: SessionUser }) {
  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader className="px-3 py-3 group-data-[collapsible=icon]:hidden">
        <Link
          href="/"
          className="rounded-sm focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none"
        >
          <Brand />
        </Link>
      </SidebarHeader>

      <SidebarContent className="gap-4 group-data-[collapsible=icon]:pt-3">
        {NAV_BY_ROLE[user.role].map((group, index) => (
          <SidebarGroup key={group.label ?? index} className="px-3 py-0">
            {group.label && (
              <SidebarGroupLabel className="mb-1">
                {group.label}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu className="gap-1">
                {group.items.map((item) => (
                  <NavEntry key={item.href} item={item} />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="px-3 pb-3">
        <SemesterContext />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
