'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Role } from '@/lib/api/types';
import { useBreadcrumbContext } from '@/lib/breadcrumb-context';
import { breadcrumbsFor } from '@/lib/nav';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

export function AppBreadcrumb({ role }: { role: Role }) {
  const pathname = usePathname();
  const ctx = useBreadcrumbContext();

  const crumbs = breadcrumbsFor(role, pathname, ctx ? ctx.getLabel : null);

  // Single-segment path — just show it as a plain h1, not a breadcrumb list.
  if (crumbs.length <= 1) {
    return (
      <h1 className="font-heading text-sm font-medium truncate">
        {crumbs[0]?.label ?? 'ProBase'}
      </h1>
    );
  }

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {crumbs.map((crumb, index) => (
          <span key={crumb.href} className="flex items-center gap-1.5">
            {index > 0 && <BreadcrumbSeparator />}
            <BreadcrumbItem>
              {crumb.isCurrent ? (
                <BreadcrumbPage className="max-w-[200px] truncate text-sm font-medium">
                  {crumb.label}
                </BreadcrumbPage>
              ) : (
                <BreadcrumbLink
                  render={<Link href={crumb.href} />}
                  className="max-w-[160px] truncate text-sm"
                >
                  {crumb.label}
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </span>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
