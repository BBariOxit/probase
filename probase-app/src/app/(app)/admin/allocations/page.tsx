'use client';

import { useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Info,
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
import { InfoTooltip } from '@/components/shared/info-tooltip';
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

  /*
    The round that actually needs working, rather than the first one listed:
    this screen is opened because a gate has shut, and that is the round it shut
    on. Derived rather than pushed into state by an effect — the rounds arrive
    after the first render, and an effect that set the choice would render the
    page once with nothing selected and again a tick later.
  */
  const roundId =
    picked ??
    (rounds?.find((round) => round.phase === 'RECONCILING') ?? rounds?.[0])?.id;

  const { data, isPending, error } = useAllocationDesk(roundId);

  if (!allowed) return null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={roundId ?? null}
          onValueChange={(value) => setPicked(value as number)}
        >
          <SelectTrigger className="w-64" aria-label="Chọn đợt đăng ký">
            <SelectValue>
              {(value) => {
                const round = rounds?.find((one) => one.id === value);
                return round ? round.projectType.name : 'Chọn đợt';
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {rounds?.map((round) => (
              <SelectItem key={round.id} value={round.id}>
                <span className="flex flex-col items-start">
                  <span>{round.projectType.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {PHASE_LABEL[round.phase]} · khóa {round.cohorts.join(', ')}
                  </span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/*
          Never both: one is offered while the round is being worked, the other
          only once it has been settled.
        */}
        {data && roundId !== undefined && (
          <>
            <FinalizeRoundDialog roundId={roundId} desk={data} />
            <UnlockRoundDialog roundId={roundId} desk={data} />
          </>
        )}
      </div>

      {error && (
        <p className="text-sm text-destructive">
          Không tải được danh sách phân bổ.
        </p>
      )}

      {isPending && roundId !== undefined && (
        <div className="flex justify-center py-16">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {data && <Desk roundId={roundId!} desk={data} />}
    </div>
  );
}

const PHASE_LABEL: Record<string, string> = {
  PREP: 'Chưa mở',
  OPEN: 'Đang mở',
  RECONCILING: 'Đang phân bổ',
  EXTENDED: 'Đang gia hạn',
  FINALIZED: 'Đã chốt',
};

function Desk({ roundId, desk }: { roundId: number; desk: AllocationDesk }) {
  const place = usePlaceStudent();
  const [selected, setSelected] = useState<UnplacedStudent | null>(null);

  // The selected student may have just been placed — by this desk or by
  // somebody working the other round out of the same pool of students.
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
        <p className="rounded-xl border border-destructive/30 bg-destructive/8 px-4 py-3 text-sm text-destructive">
          {place.error.message}
        </p>
      )}

      <div className="grid items-start gap-4 lg:grid-cols-2">
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
                  'flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors',
                  desk.canPlace
                    ? 'hover:bg-muted/50'
                    : 'cursor-default opacity-70',
                  stillUnplaced?.id === student.id &&
                    'bg-primary/8 ring-1 ring-primary/30 ring-inset',
                )}
              >
                <UserAvatar
                  name={student.fullName}
                  src={student.avatarUrl}
                  className="size-8"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {student.fullName}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {student.studentCode}
                    {student.class && ` · ${student.class}`}
                    {student.major && ` · ${student.major.name}`}
                  </p>
                </div>
              </button>
            </li>
          ))}
        </Panel>

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
              className="flex items-center gap-3 px-4 py-2.5 text-sm"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{topic.title}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {topic.lecturer.academicTitle
                    ? `${topic.lecturer.academicTitle} ${topic.lecturer.fullName}`
                    : topic.lecturer.fullName}{' '}
                  · {topic.occupiedSeats}/{topic.maxStudents} ·{' '}
                  {topic.group ? 'đã có nhóm' : 'chưa có nhóm'}
                </p>
              </div>

              <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                còn {topic.freeSeats}
              </span>

              {/*
                Only on the topics, not on the students. One of the two lists has
                to be the one you press, and it is this one: the sentence being
                built is "xếp em này vào đề tài kia", so the verb belongs at the
                end of it.
              */}
              <Button
                size="sm"
                variant="outline"
                className="shrink-0"
                disabled={!desk.canPlace || !stillUnplaced || place.isPending}
                onClick={() => assign(topic)}
              >
                {place.isPending && place.variables?.topicId === topic.id ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <ArrowRight />
                )}
                Xếp vào
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
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border px-4 py-3 text-sm">
        <Figure
          value={summary.unplacedCount}
          label="sinh viên chưa có đề tài"
        />
        <Figure value={summary.openSeats} label="chỗ trống" />
        {summary.shortfall > 0 && (
          <span className="inline-flex items-center gap-1.5 font-medium text-status-danger">
            <TriangleAlert className="size-4 shrink-0" />
            Thiếu {summary.shortfall} chỗ
            {summary.unopenedTopics > 0 && (
              <InfoTooltip
                text={`Còn ${summary.unopenedTopics} đề tài đã duyệt chưa mở (${summary.unopenedSeats} chỗ). Bạn có thể mở đồng loạt ở mục Quản lý đề tài.`}
              />
            )}
            {summary.unopenedTopics === 0 && (
              <InfoTooltip
                text={`Không còn đề tài nào để mở thêm. ${summary.shortfall} sinh viên sẽ không có chỗ, hãy yêu cầu giảng viên ra thêm đề tài.`}
              />
            )}
          </span>
        )}
        {!desk.canPlace && desk.blockedReason && (
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            <Info className="size-4 shrink-0" />
            {desk.blockedReason}
          </span>
        )}
      </div>
    </div>
  );
}

function Figure({ value, label }: { value: number; label: string }) {
  return (
    <span className="inline-flex items-baseline gap-1.5">
      <span className="text-lg font-semibold tabular-nums">{value}</span>
      <span className="text-muted-foreground">{label}</span>
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
    <section className="overflow-hidden rounded-xl border">
      <h2 className="flex items-baseline gap-2 border-b px-4 py-2.5 text-sm font-medium">
        {title}
        <span className="text-xs font-normal text-muted-foreground tabular-nums">
          {count}
        </span>
      </h2>
      {count === 0 ? (
        empty
      ) : (
        <ul className="max-h-[28rem] divide-y overflow-y-auto">{children}</ul>
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
    <section className="overflow-hidden rounded-xl border">
      <h2 className="flex items-baseline gap-2 border-b px-4 py-2.5 text-sm font-medium">
        Khoa đã xếp
        <span className="text-xs font-normal text-muted-foreground tabular-nums">
          {desk.placements.length}
        </span>
      </h2>

      {unplace.error && (
        <p className="border-b bg-destructive/8 px-4 py-2.5 text-sm text-destructive">
          {unplace.error.message}
        </p>
      )}

      <ul className="max-h-80 divide-y overflow-y-auto">
        {desk.placements.map((placement) => (
          <li
            key={placement.student.id}
            className="flex items-center gap-3 px-4 py-2.5 text-sm"
          >
            <CheckCircle2 className="size-4 shrink-0 text-status-success" />
            <div className="min-w-0 flex-1">
              <p className="truncate">
                <span className="font-medium">
                  {placement.student.fullName}
                </span>{' '}
                <span className="text-muted-foreground">
                  {placement.student.studentCode}
                </span>
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {placement.topicTitle}
              </p>
            </div>

            {/* Only while the round can still be worked: after it is settled
                these rows are the record, not a queue. */}
            {desk.canPlace && (
              <Button
                size="sm"
                variant="ghost"
                className="shrink-0"
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
                  <Loader2 className="animate-spin" />
                ) : (
                  <Undo2 />
                )}
                Bỏ xếp
              </Button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
