'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useActiveSemester, useMyEligibleProjectTypes } from '@/lib/api/master-data';
import { useMyProfile } from '@/lib/api/me';
import { useMyGroup } from '@/lib/api/registration';
import { useTopics } from '@/lib/api/topics';
import type { SessionUser } from '@/lib/api/types';
import { NAV_BY_ROLE, type NavItem } from '@/lib/nav';
import { Brand, Logo } from '@/components/layout/brand';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar';

function NavEntry({ item, badge }: { item: NavItem; badge?: number }) {
  const pathname = usePathname();
  const isRootRole = ['/', '/admin', '/lecturer', '/student'].includes(item.href);
  const active = isRootRole
    ? pathname === item.href
    : pathname === item.href || pathname.startsWith(`${item.href}/`);

  const Icon = item.icon;
  const hasBadge = badge !== undefined && badge > 0;
  const tooltipText = hasBadge ? `${item.label} (${badge})` : item.label;

  if (!item.ready) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton
          disabled
          tooltip={`${item.label} — chưa xây dựng`}
          className="cursor-not-allowed opacity-35"
        >
          <Icon className="size-4 shrink-0" />
          <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={active}
        tooltip={tooltipText}
        className={hasBadge ? 'pr-9' : undefined}
        render={<Link href={item.href} />}
      >
        <Icon className="size-4 shrink-0" />
        <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
      </SidebarMenuButton>
      {hasBadge && (
        <SidebarMenuBadge className="top-2 right-2 h-5 min-w-5 rounded-full bg-orange-600 px-1.5 text-[11px] font-semibold text-white peer-hover/menu-button:text-white peer-data-active/menu-button:text-white">
          {badge > 99 ? '99+' : badge}
        </SidebarMenuBadge>
      )}
    </SidebarMenuItem>
  );
}

export function AppSidebar({ user }: { user: SessionUser }) {
  const isStudent = user.role === 'STUDENT';
  const isLecturer = user.role === 'LECTURER';
  const { data: myProfile } = useMyProfile({ enabled: isLecturer });
  const isHeadOfDepartment = myProfile?.lecturer?.isHeadOfDepartment ?? false;
  const lecturerMajorId = myProfile?.lecturer?.major?.id;
  const { data: pendingDepartmentTopics } = useTopics(
    {
      reviewStage: 'DEPARTMENT',
      ...(lecturerMajorId ? { majorId: lecturerMajorId } : {}),
      page: 1,
      limit: 1,
    },
    { enabled: isLecturer && isHeadOfDepartment },
  );
  const pendingDepartmentCount = isHeadOfDepartment
    ? (pendingDepartmentTopics?.total ?? 0)
    : 0;
  const { data: myGroup } = useMyGroup({ enabled: isStudent });
  const activeSemester = useActiveSemester();
  const { data: eligibleTypes } = useMyEligibleProjectTypes(
    isStudent ? activeSemester?.id : undefined,
  );

  const isKLTN = useMemo(() => {
    if (!isStudent) return false;
    if (myGroup?.topic?.projectType) {
      const pt = myGroup.topic.projectType;
      const code = pt.code?.toUpperCase() ?? '';
      const name = pt.name?.toLowerCase() ?? '';
      return (
        code === 'DATN' ||
        name.includes('khóa luận') ||
        name.includes('tốt nghiệp')
      );
    }
    if (eligibleTypes && eligibleTypes.length > 0) {
      return eligibleTypes.some((pt) => {
        const code = pt.code?.toUpperCase() ?? '';
        const name = pt.name?.toLowerCase() ?? '';
        return (
          code === 'DATN' ||
          name.includes('khóa luận') ||
          name.includes('tốt nghiệp')
        );
      });
    }
    return false;
  }, [isStudent, myGroup, eligibleTypes]);

  const navGroups = useMemo(() => {
    const rawGroups = NAV_BY_ROLE[user.role];

    if (isLecturer) {
      const filtered = rawGroups
        .map((group) => ({
          ...group,
          items: group.items.filter((item) => {
            if (item.href === '/lecturer/topic-reviews') {
              return isHeadOfDepartment;
            }
            return true;
          }),
        }))
        .filter((group) => group.items.length > 0);

      // Surface Tổ chuyên môn first for TTBM so topic approval is immediately visible.
      if (isHeadOfDepartment) {
        const deptGroup = filtered.find((g) => g.label === 'Tổ chuyên môn');
        const others = filtered.filter((g) => g.label !== 'Tổ chuyên môn');
        return deptGroup ? [deptGroup, ...others] : filtered;
      }

      return filtered;
    }

    if (!isStudent) return rawGroups;

    return rawGroups.map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (item.href === '/student/defense') {
          return isKLTN;
        }
        return true;
      }),
    }));
  }, [user.role, isLecturer, isHeadOfDepartment, isStudent, isKLTN]);

  return (
    <Sidebar variant="sidebar" collapsible="icon">
      <SidebarHeader className="h-14 flex flex-row items-center justify-start px-4 border-b border-white/8 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:justify-center">
        <Link
          href="/"
          className="flex items-center gap-2.5 rounded-lg px-3 py-1.5 focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none hover:opacity-90 transition-opacity group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-0! group-data-[collapsible=icon]:justify-center"
        >
          <div className="group-data-[collapsible=icon]:hidden flex items-center">
            <Brand invert />
          </div>
          <div className="hidden group-data-[collapsible=icon]:flex items-center justify-center size-8 rounded-lg">
            <Logo className="size-6 shrink-0" invert />
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent className="gap-4 px-1 py-2 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:py-2 group-data-[collapsible=icon]:gap-1">
        {navGroups.map((group, index) => (
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
                  <NavEntry
                    key={item.href}
                    item={item}
                    badge={
                      item.href === '/lecturer/topic-reviews'
                        ? pendingDepartmentCount
                        : undefined
                    }
                  />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  );
}
