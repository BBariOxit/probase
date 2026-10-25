'use client';

import Link from 'next/link';
import {
  BookOpen,
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  Users,
} from 'lucide-react';
import { useSupervisedGroups } from '@/lib/api/registration';
import { useActiveSemester, useSemesters } from '@/lib/api/master-data';
import type { RegistrationGroup } from '@/lib/api/types';
import { useRequireRole } from '@/lib/auth/use-require-role';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/shared/empty-state';
import { UserAvatar } from '@/components/shared/user-avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useState } from 'react';

const GROUP_STATUS_LABEL: Record<string, { label: string; class: string }> = {
  FORMING: { label: 'Đang lập', class: 'text-amber-600 dark:text-amber-400' },
  SUBMITTED: {
    label: 'Đã nộp',
    class: 'text-blue-600 dark:text-blue-400',
  },
  APPROVED: {
    label: 'Được duyệt',
    class: 'text-emerald-600 dark:text-emerald-400',
  },
  REJECTED: {
    label: 'Đã giải tán',
    class: 'text-muted-foreground',
  },
};

function GroupCard({ group }: { group: RegistrationGroup }) {
  const status = GROUP_STATUS_LABEL[group.status] ?? {
    label: group.status,
    class: 'text-muted-foreground',
  };

  const total = group.requirements.length;

  // First three members for the avatar stack; others are summarised as "+N".
  const preview = group.members.slice(0, 3);
  const overflow = group.members.length - preview.length;

  return (
    <Link
      href={`/lecturer/groups/${group.id}`}
      className="group block rounded-xl border bg-card p-4 transition-all hover:border-border/80 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {/* Topic & project type */}
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{group.topic.title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {group.topic.projectType.name}
          </p>
        </div>
        <span className={cn('shrink-0 text-xs font-medium', status.class)}>
          {status.label}
        </span>
      </div>

      {/* Member avatar stack */}
      <div className="flex items-center gap-3">
        <div className="flex -space-x-2">
          {preview.map((member) => (
            <UserAvatar
              key={member.id}
              name={member.student.fullName}
              src={member.student.avatarUrl}
              className="size-7 ring-2 ring-card"
            />
          ))}
          {overflow > 0 && (
            <div className="flex size-7 items-center justify-center rounded-full bg-muted ring-2 ring-card">
              <span className="text-[10px] font-semibold text-muted-foreground">
                +{overflow}
              </span>
            </div>
          )}
        </div>

        <span className="text-xs text-muted-foreground">
          {group.occupiedSeats}/{group.topic.maxStudents} sinh viên
        </span>

        {/* Submission requirement count — detail is on the next page */}
        {total > 0 && (
          <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
            <FileText className="size-3.5 shrink-0" />
            {total} mục nộp bài
          </span>
        )}
      </div>
    </Link>
  );
}

export default function LecturerGroupsPage() {
  const allowed = useRequireRole('LECTURER');
  const activeSemester = useActiveSemester();
  const { data: semesters } = useSemesters();

  const [semesterId, setSemesterId] = useState<number | undefined>(undefined);

  // Once the active semester is known, default to it — but only once, so
  // the user switching to a different semester is not overridden on re-render.
  const effectiveSemesterId = semesterId ?? activeSemester?.id;

  const {
    data: groups,
    isPending,
    error,
  } = useSupervisedGroups(effectiveSemesterId);

  if (!allowed) return null;

  const items = groups ?? [];
  const hasGroups = items.length > 0;

  return (
    <div className="space-y-4">
      {/* Semester picker */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="size-4" />
          {!isPending && (
            <span>
              {hasGroups ? `${items.length} nhóm` : 'Không có nhóm nào'}
            </span>
          )}
        </div>

        {semesters && semesters.length > 1 && (
          <Select
            value={String(effectiveSemesterId ?? '')}
            onValueChange={(val) => setSemesterId(Number(val))}
          >
            <SelectTrigger className="w-48" aria-label="Chọn học kỳ">
              <SelectValue>
                {(val) =>
                  semesters.find((s) => String(s.id) === val)?.name ??
                  'Chọn học kỳ'
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {semesters.map((s) => (
                <SelectItem key={s.id} value={String(s.id)}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Loading */}
      {isPending && (
        <div className="flex justify-center py-16">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="text-sm text-destructive">
          Không tải được danh sách nhóm.
        </p>
      )}

      {/* Empty */}
      {!isPending && !error && !hasGroups && (
        <div className="rounded-xl border">
          <EmptyState
            icon={Users}
            title={
              activeSemester
                ? `Học kỳ ${activeSemester.name} chưa có sinh viên đăng ký đề tài của bạn.`
                : 'Chưa có học kỳ nào đang hoạt động.'
            }
          />
        </div>
      )}

      {/* Group cards */}
      {!isPending && hasGroups && (
        <>
          {/* Summary pills */}
          <div className="flex flex-wrap gap-3">
            <SummaryPill icon={Users} label="Tổng nhóm" value={items.length} />
            <SummaryPill
              icon={CheckCircle2}
              label="Đã đủ thành viên"
              value={items.filter((g) => g.isFull).length}
              colorClass="text-emerald-600 dark:text-emerald-400"
            />
            <SummaryPill
              icon={Clock}
              label="Còn chỗ trống"
              value={items.filter((g) => !g.isFull).length}
              colorClass="text-amber-600 dark:text-amber-400"
            />
            <SummaryPill
              icon={BookOpen}
              label="Đề tài có nhóm"
              value={new Set(items.map((g) => g.topicId)).size}
            />
          </div>

          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((group) => (
              <li key={group.id}>
                <GroupCard group={group} />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function SummaryPill({
  icon: Icon,
  label,
  value,
  colorClass,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  colorClass?: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2">
      <Icon
        className={cn('size-4 shrink-0 text-muted-foreground', colorClass)}
      />
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={cn('text-sm font-semibold tabular-nums', colorClass)}>
        {value}
      </span>
    </div>
  );
}
