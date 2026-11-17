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
import { useRequireGvcnOrAdmin } from '@/lib/auth/use-require-role';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/shared/empty-state';
import { FinalizeRoundDialog } from '@/components/admin/finalize-round-dialog';
import { UnlockRoundDialog } from '@/components/admin/unlock-round-dialog';
import { UserAvatar } from '@/components/shared/user-avatar';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function AllocationDeskPage() {
  const { allowed, isLoading } = useRequireGvcnOrAdmin('STUDENT_ALLOCATION');
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

      <div className="grid items-start gap-4 grid-cols-1 lg:grid-cols-12">
        {/* Cột trái: Sinh viên chưa có đề tài (gọn lại) */}
        <div className="lg:col-span-4">
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
                    'flex w-full items-center gap-3 px-3.5 py-3 text-left transition-colors cursor-pointer',
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
                    className="size-8.5 shrink-0 ring-1 ring-slate-200 dark:ring-neutral-700"
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
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </Panel>
        </div>

        {/* Cột phải: Đề tài còn chỗ (dài hơn, tên 2 dòng, cột GVHD riêng, 0/2, nút primary) */}
        <div className="lg:col-span-8">
          <TooltipProvider delay={200}>
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
                  className="grid grid-cols-[1fr_160px_48px_auto] items-center gap-x-6 sm:gap-x-8 px-4 py-3 sm:px-5 text-sm hover:bg-slate-50/70 dark:hover:bg-neutral-800/40 transition-colors"
                >
                  {/* Tên đề tài: Cho phép hiển thị 2 dòng + Tooltip hiển thị đầy đủ khi hover */}
                  <div className="min-w-0 pr-2 sm:pr-4">
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <p
                            className="line-clamp-2 text-sm font-semibold text-slate-900 dark:text-neutral-100 leading-snug break-words cursor-default"
                          />
                        }
                      >
                        {topic.title}
                      </TooltipTrigger>
                      <TooltipContent
                        side="top"
                        align="start"
                        className="max-w-md p-3 text-xs leading-relaxed bg-slate-900 text-white dark:bg-neutral-800 dark:text-neutral-100 rounded-lg shadow-xl border border-slate-700 dark:border-neutral-700 z-50"
                      >
                        <p className="font-semibold text-primary mb-1">Tên đề tài đầy đủ:</p>
                        <p className="text-slate-200 dark:text-neutral-200 break-words [overflow-wrap:anywhere]">
                          {topic.title}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </div>

                  {/* Cột Giảng viên hướng dẫn riêng biệt: Chữ to rõ ràng, giữ khoảng cách thoáng đãng với tên đề tài */}
                  <div className="min-w-0 text-left">
                    <p
                      className="truncate text-sm font-semibold text-slate-800 dark:text-neutral-200"
                      title={
                        topic.lecturer.academicTitle
                          ? `${topic.lecturer.academicTitle} ${topic.lecturer.fullName}`
                          : topic.lecturer.fullName
                      }
                    >
                      {topic.lecturer.academicTitle
                        ? `${topic.lecturer.academicTitle} ${topic.lecturer.fullName}`
                        : topic.lecturer.fullName}
                    </p>
                  </div>

                  {/* Số chỗ: 0/2 gọn gàng, căn giữa cột */}
                  <div className="text-center">
                    <span className="font-mono font-bold text-sm text-primary">
                      {topic.occupiedSeats}/{topic.maxStudents}
                    </span>
                  </div>

                  {/* Nút Xếp vào: Luôn là Primary */}
                  <Button
                    size="sm"
                    variant="default"
                    className="shrink-0 h-8 font-semibold gap-1.5 cursor-pointer shadow-2xs bg-primary text-white hover:bg-primary/90 disabled:opacity-50"
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
        </TooltipProvider>
      </div>
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
      <h2 className="border-b border-slate-800 dark:border-neutral-300 bg-slate-900 text-slate-100 dark:bg-neutral-100 dark:text-neutral-900 px-4 py-3 text-sm font-bold flex items-center justify-between">
        <span>{title}</span>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-200 dark:bg-neutral-200 dark:text-neutral-800 tabular-nums">
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
      <h2 className="border-b border-slate-800 dark:border-neutral-300 bg-slate-900 text-slate-100 dark:bg-neutral-100 dark:text-neutral-900 px-4 py-3 text-sm font-bold flex items-center justify-between">
        <span>Khoa đã xếp</span>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-200 dark:bg-neutral-200 dark:text-neutral-800 tabular-nums">
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
