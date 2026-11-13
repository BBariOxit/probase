'use client';

import { useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Loader2,
  TriangleAlert,
  Undo2,
  UserRoundCheck,
  Users,
} from 'lucide-react';
import {
  useAllocationDesk,
  usePlaceStudent,
  useUnplaceStudent,
} from '@/lib/api/allocation';
import { useActiveSemester, useRoundsForSemester } from '@/lib/api/master-data';
import type {
  AllocationDesk,
  AllocationTopic,
  UnplacedStudent,
} from '@/lib/api/types';
import { useRequireRole } from '@/lib/auth/use-require-role';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/shared/empty-state';
import { FinalizeRoundDialog } from '@/components/admin/finalize-round-dialog';
import { UnlockRoundDialog } from '@/components/admin/unlock-round-dialog';
import { UserAvatar } from '@/components/shared/user-avatar';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function AllocationDeskPage() {
  const allowed = useRequireRole('ADMIN');
  const semester = useActiveSemester();
  const { data: rounds } = useRoundsForSemester(semester?.id);
  const [picked, setPicked] = useState<number | null>(null);

  const roundId =
    picked ??
    (rounds?.find((round) => round.phase === 'RECONCILING') ?? rounds?.[0])?.id;

  const { data, isPending, error } = useAllocationDesk(roundId);

  if (!allowed) return null;

  return (
    <div className="space-y-4">
      {/* Thanh chọn đợt & các nút thao tác chốt/mở đợt */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Select
            value={roundId ?? null}
            onValueChange={(value) => setPicked(value as number)}
          >
            <SelectTrigger
              className="w-64 h-9.5 rounded-lg border-[1.5px] border-slate-300 dark:border-neutral-700 bg-white dark:bg-[#1e1e1e] font-semibold text-slate-900 dark:text-neutral-100 shadow-2xs cursor-pointer"
              aria-label="Chọn đợt đăng ký"
            >
              <SelectValue>
                {(value) => {
                  const round = rounds?.find((one) => one.id === value);
                  return round ? round.projectType.name : 'Chọn đợt';
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="border-slate-200 dark:border-neutral-700 bg-white dark:bg-[#1e1e1e]">
              {rounds?.map((round) => (
                <SelectItem key={round.id} value={round.id}>
                  <span className="font-semibold">{round.projectType.name}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {data && roundId !== undefined && (
          <div className="flex items-center gap-2">
            <FinalizeRoundDialog roundId={roundId} desk={data} />
            <UnlockRoundDialog roundId={roundId} desk={data} />
          </div>
        )}
      </div>

      {error && (
        <p className="text-sm text-destructive font-medium">
          Không tải được danh sách phân bổ.
        </p>
      )}

      {isPending && roundId !== undefined && (
        <div className="flex justify-center py-16">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      )}

      {data && <Desk roundId={roundId!} desk={data} />}
    </div>
  );
}

function Desk({ roundId, desk }: { roundId: number; desk: AllocationDesk }) {
  const place = usePlaceStudent();
  const [selected, setSelected] = useState<UnplacedStudent | null>(null);

  const stillUnplaced =
    selected && desk.students.some((one) => one.id === selected.id)
      ? selected
      : null;

  function assign(topic: AllocationTopic) {
    if (!stillUnplaced) return;

    place.mutate(
      { roundId, studentId: stillUnplaced.id, topicId: topic.id },
      { onSuccess: () => setSelected(null) },
    );
  }

  return (
    <div className="space-y-4">
      <Summary desk={desk} />

      {place.error && (
        <p className="rounded-xl border border-destructive/30 bg-destructive/8 px-4 py-3 text-sm text-destructive font-medium">
          {place.error.message}
        </p>
      )}

      <div className="grid items-start gap-4 lg:grid-cols-2">
        {/* Cột trái: Sinh viên chưa có đề tài */}
        <Panel
          title="Chưa có đề tài"
          count={desk.students.length}
          empty={
            <EmptyState
              icon={UserRoundCheck}
              title="Mọi sinh viên trong đợt đều đã có đề tài."
            />
          }
        >
          {desk.students.map((student) => (
            <li key={student.id}>
              <button
                type="button"
                disabled={!desk.canPlace}
                aria-pressed={stillUnplaced?.id === student.id}
                onClick={() =>
                  setSelected((current) =>
                    current?.id === student.id ? null : student,
                  )
                }
                className={cn(
                  'flex w-full items-center gap-3.5 px-4 py-3 text-left transition-colors cursor-pointer',
                  desk.canPlace
                    ? 'hover:bg-slate-50/70 dark:hover:bg-neutral-800/50'
                    : 'cursor-default opacity-70',
                  stillUnplaced?.id === student.id
                    ? 'bg-primary/10 dark:bg-primary/20 ring-1.5 ring-primary ring-inset'
                    : '',
                )}
              >
                <UserAvatar
                  name={student.fullName}
                  src={student.avatarUrl}
                  className="size-9 ring-1 ring-slate-200 dark:ring-neutral-700"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900 dark:text-neutral-100">
                    {student.fullName}
                  </p>
                  <p className="truncate text-xs text-muted-foreground mt-0.5">
                    <span className="font-mono text-primary font-semibold text-xs">
                      {student.studentCode}
                    </span>
                    {student.class && ` · ${student.class}`}
                    {student.major && ` · ${student.major.name}`}
                  </p>
                </div>
              </button>
            </li>
          ))}
        </Panel>

        {/* Cột phải: Đề tài còn chỗ */}
        <Panel
          title="Đề tài còn chỗ"
          count={desk.topics.length}
          empty={
            <EmptyState
              icon={Users}
              title="Không còn đề tài nào trống chỗ trong đợt này."
            />
          }
        >
          {desk.topics.map((topic) => (
            <li
              key={topic.id}
              className="flex items-center gap-3.5 px-4 py-3 text-sm hover:bg-slate-50/70 dark:hover:bg-neutral-800/40 transition-colors"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-slate-900 dark:text-neutral-100 leading-snug">
                  {topic.title}
                </p>
                <p className="truncate text-xs text-muted-foreground mt-0.5">
                  <span className="font-medium text-slate-700 dark:text-neutral-300">
                    {topic.lecturer.academicTitle
                      ? `${topic.lecturer.academicTitle} ${topic.lecturer.fullName}`
                      : topic.lecturer.fullName}
                  </span>
                  {' · '}
                  <span className="font-mono text-xs font-semibold text-primary">
                    {topic.occupiedSeats}/{topic.maxStudents}
                  </span>
                  {' · '}
                  <span>{topic.group ? 'đã có nhóm' : 'chưa có nhóm'}</span>
                </p>
              </div>

              <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                còn {topic.freeSeats} chỗ
              </span>

              <Button
                size="sm"
                variant={stillUnplaced && desk.canPlace ? 'default' : 'outline'}
                className={cn(
                  'shrink-0 h-8 font-semibold gap-1.5 transition-all cursor-pointer shadow-2xs',
                  stillUnplaced && desk.canPlace
                    ? 'bg-primary text-white hover:bg-primary/90'
                    : 'border-slate-300 dark:border-neutral-700 bg-white dark:bg-[#1e1e1e] text-slate-700 dark:text-neutral-300 hover:bg-slate-50 dark:hover:bg-neutral-800',
                )}
                disabled={!desk.canPlace || !stillUnplaced || place.isPending}
                onClick={() => assign(topic)}
              >
                {place.isPending && place.variables?.topicId === topic.id ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <ArrowRight className="size-3.5" />
                )}
                <span>Xếp vào</span>
              </Button>
            </li>
          ))}
        </Panel>
      </div>

      <PlacementsMade roundId={roundId} desk={desk} />
    </div>
  );
}

function Summary({ desk }: { desk: AllocationDesk }) {
  const { summary } = desk;

  return (
    <div className="flex flex-wrap items-center gap-6 rounded-xl border border-slate-300 dark:border-neutral-700 bg-white dark:bg-[#1e1e1e] px-5 py-3.5 shadow-2xs text-sm">
      <Figure
        value={summary.unplacedCount}
        label="sinh viên chưa có đề tài"
      />
      <div className="h-4 w-px bg-slate-200 dark:bg-neutral-700 hidden sm:block" />
      <Figure value={summary.openSeats} label="chỗ trống" />
      {summary.shortfall > 0 && (
        <>
          <div className="h-4 w-px bg-slate-200 dark:bg-neutral-700 hidden sm:block" />
          <span className="inline-flex items-center gap-1.5 font-semibold text-destructive">
            <TriangleAlert className="size-4 shrink-0" />
            Thiếu {summary.shortfall} chỗ
          </span>
        </>
      )}
    </div>
  );
}

function Figure({ value, label }: { value: number; label: string }) {
  return (
    <span className="inline-flex items-baseline gap-2">
      <span className="text-xl font-bold text-slate-900 dark:text-neutral-100 tabular-nums">
        {value}
      </span>
      <span className="text-sm font-medium text-slate-600 dark:text-neutral-400">
        {label}
      </span>
    </span>
  );
}

function Panel({
  title,
  count,
  empty,
  children,
}: {
  title: string;
  count: number;
  empty: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-300 dark:border-neutral-700 bg-white dark:bg-[#1e1e1e] shadow-2xs">
      <h2 className="border-b border-slate-200 dark:border-neutral-700 bg-slate-50/80 dark:bg-[#181818] px-4 py-3 text-sm font-bold text-slate-900 dark:text-neutral-100">
        <span>{title}</span>
        <span className="font-normal text-muted-foreground ml-1.5 tabular-nums">
          {count}
        </span>
      </h2>
      {count === 0 ? (
        <div className="p-6">{empty}</div>
      ) : (
        <ul className="max-h-[30rem] divide-y divide-slate-100 dark:divide-neutral-700/80 overflow-y-auto">
          {children}
        </ul>
      )}
    </section>
  );
}

function PlacementsMade({
  roundId,
  desk,
}: {
  roundId: number;
  desk: AllocationDesk;
}) {
  const unplace = useUnplaceStudent();

  if (desk.placements.length === 0) return null;

  return (
    <section className="overflow-hidden rounded-xl border border-slate-300 dark:border-neutral-700 bg-white dark:bg-[#1e1e1e] shadow-2xs">
      <h2 className="border-b border-slate-200 dark:border-neutral-700 bg-slate-50/80 dark:bg-[#181818] px-4 py-3 text-sm font-bold text-slate-900 dark:text-neutral-100">
        <span>Khoa đã xếp</span>
        <span className="font-normal text-muted-foreground ml-1.5 tabular-nums">
          {desk.placements.length}
        </span>
      </h2>

      {unplace.error && (
        <p className="border-b bg-destructive/8 px-4 py-2.5 text-sm text-destructive font-medium">
          {unplace.error.message}
        </p>
      )}

      <ul className="max-h-80 divide-y divide-slate-100 dark:divide-neutral-700/80 overflow-y-auto">
        {desk.placements.map((placement) => (
          <li
            key={placement.student.id}
            className="flex items-center gap-3.5 px-4 py-3 text-sm hover:bg-slate-50/50 dark:hover:bg-neutral-800/40 transition-colors"
          >
            <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
            <div className="min-w-0 flex-1">
              <p className="truncate">
                <span className="font-semibold text-slate-900 dark:text-neutral-100">
                  {placement.student.fullName}
                </span>{' '}
                <span className="font-mono text-xs font-semibold text-primary ml-1">
                  {placement.student.studentCode}
                </span>
              </p>
              <p className="truncate text-xs text-muted-foreground mt-0.5">
                {placement.topicTitle}
              </p>
            </div>

            {desk.canPlace && (
              <Button
                size="sm"
                variant="ghost"
                className="shrink-0 h-8 text-xs font-medium text-slate-500 hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                disabled={unplace.isPending}
                onClick={() =>
                  unplace.mutate({
                    roundId,
                    studentId: placement.student.id,
                  })
                }
              >
                {unplace.isPending &&
                unplace.variables?.studentId === placement.student.id ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Undo2 className="size-3.5" />
                )}
                <span>Bỏ xếp</span>
              </Button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
