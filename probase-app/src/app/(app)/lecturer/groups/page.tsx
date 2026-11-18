'use client';

import { useMemo, useState } from 'react';
import { Loader2, Mail, Search, Users } from 'lucide-react';
import { useSupervisedGroups } from '@/lib/api/registration';
import { useRequireRole } from '@/lib/auth/use-require-role';
import { cn, formatProjectTypeShort } from '@/lib/utils';
import { EmptyState } from '@/components/shared/empty-state';
import { GroupAnnouncementDialog } from '@/components/lecturer/groups/group-announcement-dialog';
import { SupervisedGroupCard } from '@/components/lecturer/groups/supervised-group-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function LecturerGroupsPage() {
  const allowed = useRequireRole(['LECTURER', 'GVCN']);
  const [projectTypeFilter, setProjectTypeFilter] = useState<
    number | undefined
  >(undefined);
  const [search, setSearch] = useState('');

  const [composeOpen, setComposeOpen] = useState(false);
  const [composeInitialIds, setComposeInitialIds] = useState<number[]>([]);

  const { data: groups, isPending, error } = useSupervisedGroups();

  const items = useMemo(() => groups ?? [], [groups]);

  const projectTypes = useMemo(() => {
    const map = new Map<number, { id: number; short: string; full: string }>();
    for (const g of items) {
      if (!map.has(g.topic.projectType.id)) {
        const pt = formatProjectTypeShort(g.topic.projectType);
        map.set(g.topic.projectType.id, {
          id: g.topic.projectType.id,
          short: pt.short,
          full: pt.full,
        });
      }
    }
    return [...map.values()];
  }, [items]);

  const filteredGroups = useMemo(() => {
    const q = search.toLowerCase().trim();
    return items.filter((g) => {
      if (
        projectTypeFilter !== undefined &&
        g.topic.projectType.id !== projectTypeFilter
      ) {
        return false;
      }
      if (!q) return true;
      const matchTopic =
        g.topic.title.toLowerCase().includes(q) ||
        g.topic.projectType.name.toLowerCase().includes(q);
      const matchMember = g.members.some(
        (m) =>
          m.student.fullName.toLowerCase().includes(q) ||
          m.student.studentCode.toLowerCase().includes(q) ||
          (m.student.class && m.student.class.toLowerCase().includes(q)) ||
          m.student.email.toLowerCase().includes(q),
      );
      return matchTopic || matchMember;
    });
  }, [items, projectTypeFilter, search]);

  const totalStudents = useMemo(
    () => items.reduce((acc, g) => acc + g.occupiedSeats, 0),
    [items],
  );

  function openComposer(groupIds: number[]) {
    setComposeInitialIds(groupIds);
    setComposeOpen(true);
  }

  if (!allowed) return null;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-0">
          <div className="relative min-w-56 flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm đề tài, sinh viên, MSSV, lớp..."
              className="h-9.5 pl-9 text-sm"
            />
          </div>

          {projectTypes.length > 1 && (
            <div
              className="flex items-center gap-1 rounded-lg border border-border bg-card p-1"
              role="group"
              aria-label="Lọc theo loại đồ án"
            >
              <button
                type="button"
                onClick={() => setProjectTypeFilter(undefined)}
                className={cn(
                  'rounded-md px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer',
                  projectTypeFilter === undefined
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                Tất cả
              </button>
              {projectTypes.map((pt) => (
                <button
                  key={pt.id}
                  type="button"
                  title={pt.full}
                  onClick={() => setProjectTypeFilter(pt.id)}
                  className={cn(
                    'rounded-md px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer',
                    projectTypeFilter === pt.id
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {pt.short}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {!isPending && !error && items.length > 0 && (
            <span className="hidden sm:inline text-xs font-medium text-muted-foreground tabular-nums">
              <strong className="text-foreground">{items.length}</strong> nhóm (
              {totalStudents} SV)
            </span>
          )}

          <Button
            onClick={() => openComposer(filteredGroups.map((g) => g.id))}
            disabled={isPending || totalStudents === 0}
            className="h-9.5 gap-2 text-sm cursor-pointer"
          >
            <Mail className="size-4" />
            <span>Gửi thông báo</span>
          </Button>
        </div>
      </div>

      {isPending && (
        <div className="flex justify-center py-16">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {error && (
        <p className="text-sm text-destructive">
          Không tải được danh sách nhóm hướng dẫn.
        </p>
      )}

      {!isPending && !error && items.length === 0 && (
        <div className="rounded-xl border border-border bg-card">
          <EmptyState
            icon={Users}
            title="Học kỳ này chưa có nhóm sinh viên đăng ký đề tài của bạn."
          />
        </div>
      )}

      {!isPending && !error && items.length > 0 && filteredGroups.length === 0 && (
        <div className="py-12 text-center text-sm text-muted-foreground">
          Không tìm thấy nhóm hoặc sinh viên phù hợp.
        </div>
      )}

      {!isPending && filteredGroups.length > 0 && (
        <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2">
          {filteredGroups.map((group) => (
            <SupervisedGroupCard
              key={group.id}
              group={group}
              onNotifyGroup={(groupId) => openComposer([groupId])}
            />
          ))}
        </div>
      )}

      <GroupAnnouncementDialog
        open={composeOpen}
        onOpenChange={setComposeOpen}
        groups={items}
        initialGroupIds={composeInitialIds}
      />
    </div>
  );
}
