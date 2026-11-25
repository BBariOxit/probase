'use client';

import { useMemo, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Info,
  Loader2,
  Search,
  TriangleAlert,
  Undo2,
  UserRoundCheck,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api/client';
import {
  useAllocationDesk,
  useBatchPlaceStudents,
  useBatchUnplaceStudents,
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
import { AutoAllocationDialog } from '@/components/admin/auto-allocation-dialog';
import { FinalizeRoundDialog } from '@/components/admin/finalize-round-dialog';
import { UnlockRoundDialog } from '@/components/admin/unlock-round-dialog';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { EmptyState } from '@/components/shared/empty-state';
import { UserAvatar } from '@/components/shared/user-avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export default function AllocationDeskPage() {
  const { allowed } = useRequireGvcnOrAdmin('STUDENT_ALLOCATION');
  const semester = useActiveSemester();
  const { data: rounds } = useRoundsForSemester(semester?.id);
  const [picked, setPicked] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const roundId =
    picked ??
    (rounds?.find((round) => round.phase === 'RECONCILING') ?? rounds?.[0])?.id;

  const { data, isPending, error } = useAllocationDesk(roundId);

  const activeSelectedIds = useMemo(() => {
    if (!data) return [];
    const valid = new Set(data.students.map((student) => student.id));
    return [...selectedIds].filter((id) => valid.has(id));
  }, [data, selectedIds]);

  if (!allowed) return null;

  return (
    <div className="space-y-4">
      {/* Thanh chọn đợt & các nút thao tác */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Select
            value={roundId ?? null}
            onValueChange={(value) => {
              setPicked(value as number);
              setSelectedIds(new Set());
            }}
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
          <div className="flex flex-wrap items-center gap-2">
            <AutoAllocationDialog
              roundId={roundId}
              desk={data}
              selectedStudentIds={activeSelectedIds}
              onCommitted={() => setSelectedIds(new Set())}
            />
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

      {data && (
        <Desk
          roundId={roundId!}
          desk={data}
          selectedIds={selectedIds}
          onSelectedIdsChange={setSelectedIds}
        />
      )}
    </div>
  );
}

function isMajorCompatible(
  student: UnplacedStudent,
  topic: AllocationTopic,
): boolean {
  if (!student.major || !topic.major) return true;
  return student.major.id === topic.major.id;
}

function Desk({
  roundId,
  desk,
  selectedIds,
  onSelectedIdsChange,
}: {
  roundId: number;
  desk: AllocationDesk;
  selectedIds: Set<number>;
  onSelectedIdsChange: (next: Set<number>) => void;
}) {
  const batchPlace = useBatchPlaceStudents();

  const [studentQuery, setStudentQuery] = useState('');
  const [studentMajorFilter, setStudentMajorFilter] = useState<string>('ALL');
  const [topicQuery, setTopicQuery] = useState('');
  const [topicMajorFilter, setTopicMajorFilter] = useState<string>('ALL');
  const [pendingTopicId, setPendingTopicId] = useState<number | null>(null);
  const [crossMajorConfirm, setCrossMajorConfirm] = useState<{
    topic: AllocationTopic;
    mismatchedStudents: UnplacedStudent[];
  } | null>(null);

  const majorOptions = useMemo(() => {
    const map = new Map<number, { id: number; name: string; code: string }>();
    for (const student of desk.students) {
      if (student.major) map.set(student.major.id, student.major);
    }
    for (const topic of desk.topics) {
      if (topic.major) map.set(topic.major.id, topic.major);
    }
    return [...map.values()].sort((a, b) => a.code.localeCompare(b.code));
  }, [desk.students, desk.topics]);

  const selectedStudents = useMemo(
    () => desk.students.filter((student) => selectedIds.has(student.id)),
    [desk.students, selectedIds],
  );

  const filteredStudents = useMemo(() => {
    const q = studentQuery.trim().toLowerCase();
    return desk.students.filter((student) => {
      if (
        studentMajorFilter !== 'ALL' &&
        String(student.major?.id ?? '') !== studentMajorFilter
      ) {
        return false;
      }
      if (!q) return true;
      return (
        student.fullName.toLowerCase().includes(q) ||
        student.studentCode.toLowerCase().includes(q) ||
        (student.class?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [desk.students, studentQuery, studentMajorFilter]);

  const filteredTopics = useMemo(() => {
    const q = topicQuery.trim().toLowerCase();
    const list = desk.topics.filter((topic) => {
      if (
        topicMajorFilter !== 'ALL' &&
        String(topic.major?.id ?? '') !== topicMajorFilter
      ) {
        return false;
      }
      if (!q) return true;
      const lecturerName = topic.lecturer.academicTitle
        ? `${topic.lecturer.academicTitle} ${topic.lecturer.fullName}`
        : topic.lecturer.fullName;
      return (
        topic.title.toLowerCase().includes(q) ||
        lecturerName.toLowerCase().includes(q)
      );
    });

    if (selectedStudents.length === 0) return list;

    return [...list].sort((a, b) => {
      const aFitsSeats = a.freeSeats >= selectedStudents.length ? 1 : 0;
      const bFitsSeats = b.freeSeats >= selectedStudents.length ? 1 : 0;
      if (aFitsSeats !== bFitsSeats) return bFitsSeats - aFitsSeats;

      const aCompat = selectedStudents.every((student) =>
        isMajorCompatible(student, a),
      )
        ? 1
        : 0;
      const bCompat = selectedStudents.every((student) =>
        isMajorCompatible(student, b),
      )
        ? 1
        : 0;
      if (aCompat !== bCompat) return bCompat - aCompat;

      return a.title.localeCompare(b.title, 'vi');
    });
  }, [desk.topics, topicQuery, topicMajorFilter, selectedStudents]);

  const allFilteredSelected =
    filteredStudents.length > 0 &&
    filteredStudents.every((student) => selectedIds.has(student.id));

  function toggleStudent(studentId: number) {
    const next = new Set(selectedIds);
    if (next.has(studentId)) next.delete(studentId);
    else next.add(studentId);
    onSelectedIdsChange(next);
  }

  function toggleAllFiltered() {
    const next = new Set(selectedIds);
    if (allFilteredSelected) {
      for (const student of filteredStudents) next.delete(student.id);
    } else {
      for (const student of filteredStudents) next.add(student.id);
    }
    onSelectedIdsChange(next);
  }

  async function executePlace(topic: AllocationTopic) {
    if (selectedStudents.length === 0) return;
    setPendingTopicId(topic.id);
    try {
      const res = await batchPlace.mutateAsync({
        roundId,
        placements: selectedStudents.map((student) => ({
          studentId: student.id,
          topicId: topic.id,
        })),
      });
      toast.success(
        selectedStudents.length === 1
          ? `Đã xếp ${selectedStudents[0].fullName} vào đề tài "${topic.title}".`
          : res.message,
      );
      onSelectedIdsChange(new Set());
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'Không thể xếp sinh viên.',
      );
    } finally {
      setPendingTopicId(null);
    }
  }

  function assign(topic: AllocationTopic) {
    if (selectedStudents.length === 0) return;

    const mismatched = selectedStudents.filter(
      (student) => !isMajorCompatible(student, topic),
    );
    if (mismatched.length > 0) {
      setCrossMajorConfirm({ topic, mismatchedStudents: mismatched });
      return;
    }

    void executePlace(topic);
  }

  const selectedCount = selectedStudents.length;

  return (
    <div className="space-y-4">
      <Summary desk={desk} />

      {desk.blockedReason && (
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-300/60 dark:border-amber-700/60 bg-amber-50/70 dark:bg-amber-950/25 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
          <Info className="size-4 shrink-0 mt-0.5" />
          <span>{desk.blockedReason}</span>
        </div>
      )}

      {batchPlace.error && (
        <p className="rounded-xl border border-destructive/30 bg-destructive/8 px-4 py-3 text-sm text-destructive font-medium">
          {batchPlace.error.message}
        </p>
      )}

      <div className="grid items-start gap-4 grid-cols-1 lg:grid-cols-12">
        {/* Cột trái: Sinh viên chưa có đề tài (hỗ trợ tìm kiếm, lọc, chọn nhiều) */}
        <div className="lg:col-span-4">
          <Panel
            title="Chưa có đề tài"
            count={filteredStudents.length}
            totalCount={desk.students.length}
            controls={
              desk.students.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Search className="size-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <Input
                        value={studentQuery}
                        onChange={(event) => setStudentQuery(event.target.value)}
                        placeholder="Tìm tên, MSSV, lớp..."
                        className="h-8 pl-8 text-xs"
                      />
                    </div>
                    {majorOptions.length > 1 && (
                      <Select
                        value={studentMajorFilter}
                        onValueChange={(value) =>
                          setStudentMajorFilter(value ?? 'ALL')
                        }
                      >
                        <SelectTrigger className="w-28 h-8 text-xs">
                          <SelectValue>
                            {(value) =>
                              value === 'ALL'
                                ? 'Ngành'
                                : (majorOptions.find(
                                    (m) => String(m.id) === value,
                                  )?.code ?? 'Ngành')
                            }
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL">Mọi ngành</SelectItem>
                          {majorOptions.map((major) => (
                            <SelectItem key={major.id} value={String(major.id)}>
                              {major.code}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  {desk.canPlace && filteredStudents.length > 0 && (
                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-0.5">
                      <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                        <Checkbox
                          checked={allFilteredSelected}
                          onCheckedChange={toggleAllFiltered}
                        />
                        <span>Chọn tất cả ({filteredStudents.length})</span>
                      </label>
                      {selectedCount > 0 && (
                        <button
                          type="button"
                          onClick={() => onSelectedIdsChange(new Set())}
                          className="font-medium text-primary hover:underline cursor-pointer"
                        >
                          Bỏ chọn ({selectedCount})
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )
            }
            empty={
              <EmptyState
                icon={UserRoundCheck}
                title={
                  desk.students.length === 0
                    ? 'Mọi sinh viên trong đợt đều đã có đề tài.'
                    : 'Không có sinh viên khớp bộ lọc.'
                }
              />
            }
          >
            {filteredStudents.map((student) => {
              const checked = selectedIds.has(student.id);
              return (
                <li key={student.id}>
                  <button
                    type="button"
                    disabled={!desk.canPlace}
                    aria-pressed={checked}
                    onClick={() => toggleStudent(student.id)}
                    className={cn(
                      'flex w-full items-center gap-3 px-3.5 py-3 text-left transition-colors cursor-pointer',
                      desk.canPlace
                        ? 'hover:bg-slate-50/70 dark:hover:bg-neutral-800/50'
                        : 'cursor-default opacity-70',
                      checked
                        ? 'bg-primary/10 dark:bg-primary/20 ring-1.5 ring-primary ring-inset'
                        : '',
                    )}
                  >
                    {desk.canPlace && (
                      <Checkbox
                        checked={checked}
                        tabIndex={-1}
                        aria-hidden="true"
                        className="pointer-events-none shrink-0"
                      />
                    )}
                    <UserAvatar
                      name={student.fullName}
                      src={student.avatarUrl}
                      className="size-8.5 shrink-0 ring-1 ring-slate-200 dark:ring-neutral-700"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate text-sm font-semibold text-slate-900 dark:text-neutral-100">
                          {student.fullName}
                        </p>
                        {student.major && (
                          <Badge
                            variant="outline"
                            className="h-4 px-1.5 text-[10px] shrink-0"
                          >
                            {student.major.code}
                          </Badge>
                        )}
                      </div>
                      <p className="truncate text-xs text-muted-foreground mt-0.5">
                        <span className="font-mono text-primary font-semibold text-xs">
                          {student.studentCode}
                        </span>
                        {student.class && ` · ${student.class}`}
                      </p>
                    </div>
                  </button>
                </li>
              );
            })}
          </Panel>
        </div>

        {/* Cột phải: Đề tài còn chỗ */}
        <div className="lg:col-span-8">
          <TooltipProvider delay={200}>
            <Panel
              title="Đề tài còn chỗ"
              count={filteredTopics.length}
              totalCount={desk.topics.length}
              controls={
                desk.topics.length > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Search className="size-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <Input
                        value={topicQuery}
                        onChange={(event) => setTopicQuery(event.target.value)}
                        placeholder="Tìm tên đề tài, giảng viên..."
                        className="h-8 pl-8 text-xs"
                      />
                    </div>
                    {majorOptions.length > 1 && (
                      <Select
                        value={topicMajorFilter}
                        onValueChange={(value) =>
                          setTopicMajorFilter(value ?? 'ALL')
                        }
                      >
                        <SelectTrigger className="w-32 h-8 text-xs">
                          <SelectValue>
                            {(value) =>
                              value === 'ALL'
                                ? 'Mọi ngành'
                                : (majorOptions.find(
                                    (m) => String(m.id) === value,
                                  )?.code ?? 'Ngành')
                            }
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL">Mọi ngành</SelectItem>
                          {majorOptions.map((major) => (
                            <SelectItem key={major.id} value={String(major.id)}>
                              {major.code}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                )
              }
              empty={
                <EmptyState
                  icon={Users}
                  title={
                    desk.topics.length === 0
                      ? 'Không còn đề tài nào trống chỗ trong đợt này.'
                      : 'Không có đề tài khớp bộ lọc.'
                  }
                />
              }
            >
              {filteredTopics.map((topic) => {
                const enoughSeats =
                  selectedCount === 0 || topic.freeSeats >= selectedCount;
                const majorFits =
                  selectedCount === 0 ||
                  selectedStudents.every((student) =>
                    isMajorCompatible(student, topic),
                  );
                const lecturerDisplay = topic.lecturer.academicTitle
                  ? `${topic.lecturer.academicTitle} ${topic.lecturer.fullName}`
                  : topic.lecturer.fullName;

                return (
                  <li
                    key={topic.id}
                    className={cn(
                      'grid grid-cols-[1fr_160px_48px_auto] items-center gap-x-6 sm:gap-x-8 px-4 py-3 sm:px-5 text-sm hover:bg-slate-50/70 dark:hover:bg-neutral-800/40 transition-colors',
                      selectedCount > 0 && !enoughSeats && 'opacity-55',
                      selectedCount > 0 &&
                        enoughSeats &&
                        majorFits &&
                        'bg-primary/5 dark:bg-primary/10',
                    )}
                  >
                    {/* Tên đề tài + chuyên ngành + thành viên sẵn có */}
                    <div className="min-w-0 pr-2 sm:pr-4 space-y-1">
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <p className="line-clamp-2 text-sm font-semibold text-slate-900 dark:text-neutral-100 leading-snug break-words cursor-default" />
                          }
                        >
                          {topic.title}
                        </TooltipTrigger>
                        <TooltipContent
                          side="top"
                          align="start"
                          className="max-w-md p-3 text-xs leading-relaxed bg-slate-900 text-white dark:bg-neutral-800 dark:text-neutral-100 rounded-lg shadow-xl border border-slate-700 dark:border-neutral-700 z-50"
                        >
                          <p className="font-semibold text-primary mb-1">
                            Tên đề tài đầy đủ:
                          </p>
                          <p className="text-slate-200 dark:text-neutral-200 break-words [overflow-wrap:anywhere]">
                            {topic.title}
                          </p>
                          {topic.existingMembers.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-slate-700">
                              <p className="font-semibold text-slate-300 mb-1">
                                Đang có trong nhóm ({topic.existingMembers.length}):
                              </p>
                              <ul className="space-y-0.5 text-slate-200">
                                {topic.existingMembers.map((member) => (
                                  <li key={member.id}>
                                    {member.fullName} · {member.studentCode}
                                    {member.class ? ` · ${member.class}` : ''}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </TooltipContent>
                      </Tooltip>

                      <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                        {topic.major && (
                          <Badge
                            variant="outline"
                            className="h-4 px-1.5 text-[10px]"
                          >
                            {topic.major.code}
                          </Badge>
                        )}
                        {topic.existingMembers.length > 0 && (
                          <span className="truncate">
                            Đã có:{' '}
                            {topic.existingMembers
                              .map((m) => m.fullName)
                              .join(', ')}
                          </span>
                        )}
                        {selectedCount > 0 && enoughSeats && !majorFits && (
                          <span className="text-amber-600 dark:text-amber-400 font-medium">
                            · Khác chuyên ngành
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Giảng viên hướng dẫn */}
                    <div className="min-w-0 text-left">
                      <p
                        className="truncate text-sm font-semibold text-slate-800 dark:text-neutral-200"
                        title={lecturerDisplay}
                      >
                        {lecturerDisplay}
                      </p>
                    </div>

                    {/* Số chỗ */}
                    <div className="text-center">
                      <span className="font-mono font-bold text-sm text-primary">
                        {topic.occupiedSeats}/{topic.maxStudents}
                      </span>
                    </div>

                    {/* Nút Xếp vào */}
                    <Button
                      size="sm"
                      variant={
                        selectedCount > 0 && enoughSeats && !majorFits
                          ? 'outline'
                          : 'default'
                      }
                      className={cn(
                        'shrink-0 h-8 font-semibold gap-1.5 cursor-pointer shadow-2xs disabled:opacity-50',
                        selectedCount > 0 && enoughSeats && !majorFits
                          ? 'border-amber-400 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/30'
                          : 'bg-primary text-white hover:bg-primary/90',
                      )}
                      disabled={
                        !desk.canPlace ||
                        selectedCount === 0 ||
                        !enoughSeats ||
                        batchPlace.isPending
                      }
                      onClick={() => assign(topic)}
                    >
                      {batchPlace.isPending && pendingTopicId === topic.id ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <ArrowRight className="size-3.5" />
                      )}
                      <span>
                        {selectedCount > 0 && !enoughSeats
                          ? `Còn ${topic.freeSeats} chỗ`
                          : selectedCount > 1
                            ? `Xếp (${selectedCount})`
                            : 'Xếp vào'}
                      </span>
                    </Button>
                  </li>
                );
              })}
            </Panel>
          </TooltipProvider>
        </div>
      </div>

      <PlacementsMade roundId={roundId} desk={desk} />

      <ConfirmDialog
        open={crossMajorConfirm !== null}
        onOpenChange={(open) => {
          if (!open) setCrossMajorConfirm(null);
        }}
        title="Xếp sinh viên khác chuyên ngành?"
        description={
          crossMajorConfirm && (
            <div className="space-y-2">
              <p>
                Đề tài{' '}
                <span className="font-semibold">
                  &ldquo;{crossMajorConfirm.topic.title}&rdquo;
                </span>{' '}
                thuộc chuyên ngành{' '}
                <span className="font-semibold">
                  {crossMajorConfirm.topic.major?.code}
                </span>
                , nhưng có {crossMajorConfirm.mismatchedStudents.length} sinh viên
                thuộc chuyên ngành khác:
              </p>
              <ul className="list-disc pl-5 text-xs space-y-0.5">
                {crossMajorConfirm.mismatchedStudents.map((student) => (
                  <li key={student.id}>
                    {student.fullName} ({student.studentCode} ·{' '}
                    {student.major?.code})
                  </li>
                ))}
              </ul>
            </div>
          )
        }
        confirmLabel="Vẫn xếp vào"
        confirmVariant="default"
        onConfirm={async () => {
          if (crossMajorConfirm) {
            await executePlace(crossMajorConfirm.topic);
          }
        }}
      />
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
      {summary.unopenedTopics > 0 && (
        <>
          <div className="h-4 w-px bg-slate-200 dark:bg-neutral-700 hidden sm:block" />
          <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
            +{summary.unopenedTopics} đề tài đã duyệt chưa mở ({summary.unopenedSeats}{' '}
            chỗ)
          </span>
        </>
      )}
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
  totalCount,
  controls,
  empty,
  children,
}: {
  title: string;
  count: number;
  totalCount?: number;
  controls?: React.ReactNode;
  empty: React.ReactNode;
  children: React.ReactNode;
}) {
  const countLabel =
    totalCount !== undefined && totalCount !== count
      ? `${count}/${totalCount}`
      : String(count);

  return (
    <section className="overflow-hidden rounded-xl border border-slate-300 dark:border-neutral-700 bg-white dark:bg-[#1e1e1e] shadow-2xs">
      <h2 className="border-b border-slate-800 dark:border-neutral-300 bg-slate-900 text-slate-100 dark:bg-neutral-100 dark:text-neutral-900 px-4 py-3 text-sm font-bold flex items-center justify-between">
        <span>{title}</span>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-200 dark:bg-neutral-200 dark:text-neutral-800 tabular-nums">
          {countLabel}
        </span>
      </h2>
      {controls && (
        <div className="border-b border-slate-200 dark:border-neutral-700/80 px-3.5 py-2.5 bg-slate-50/50 dark:bg-neutral-900/40">
          {controls}
        </div>
      )}
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
  const batchUnplace = useBatchUnplaceStudents();
  const [checkedIds, setCheckedIds] = useState<Set<number>>(new Set());

  const validCheckedIds = useMemo(() => {
    const valid = new Set(desk.placements.map((p) => p.student.id));
    return [...checkedIds].filter((id) => valid.has(id));
  }, [desk.placements, checkedIds]);

  if (desk.placements.length === 0) return null;

  const allChecked =
    desk.placements.length > 0 &&
    validCheckedIds.length === desk.placements.length;

  function toggleOne(studentId: number) {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) next.delete(studentId);
      else next.add(studentId);
      return next;
    });
  }

  function toggleAll() {
    if (allChecked) {
      setCheckedIds(new Set());
    } else {
      setCheckedIds(new Set(desk.placements.map((p) => p.student.id)));
    }
  }

  async function handleBulkUnplace() {
    if (validCheckedIds.length === 0) return;
    try {
      const res = await batchUnplace.mutateAsync({
        roundId,
        studentIds: validCheckedIds,
      });
      toast.success(res.message);
      setCheckedIds(new Set());
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'Không thể bỏ xếp hàng loạt.',
      );
    }
  }

  const busy = unplace.isPending || batchUnplace.isPending;

  return (
    <section className="overflow-hidden rounded-xl border border-slate-300 dark:border-neutral-700 bg-white dark:bg-[#1e1e1e] shadow-2xs">
      <h2 className="border-b border-slate-800 dark:border-neutral-300 bg-slate-900 text-slate-100 dark:bg-neutral-100 dark:text-neutral-900 px-4 py-3 text-sm font-bold flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {desk.canPlace && (
            <Checkbox
              checked={allChecked}
              onCheckedChange={toggleAll}
              aria-label="Chọn tất cả sinh viên khoa đã xếp"
              className="border-slate-400 dark:border-neutral-500"
            />
          )}
          <span>Khoa đã xếp</span>
        </div>

        <div className="flex items-center gap-2">
          {desk.canPlace && validCheckedIds.length > 0 && (
            <Button
              size="sm"
              variant="destructive"
              className="h-7 px-2.5 text-xs font-semibold gap-1 cursor-pointer"
              disabled={busy}
              onClick={handleBulkUnplace}
            >
              {batchUnplace.isPending ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <Undo2 className="size-3" />
              )}
              <span>Bỏ xếp ({validCheckedIds.length})</span>
            </Button>
          )}
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-200 dark:bg-neutral-200 dark:text-neutral-800 tabular-nums">
            {desk.placements.length}
          </span>
        </div>
      </h2>

      {(unplace.error || batchUnplace.error) && (
        <p className="border-b bg-destructive/8 px-4 py-2.5 text-sm text-destructive font-medium">
          {(unplace.error ?? batchUnplace.error)?.message}
        </p>
      )}

      <ul className="max-h-80 divide-y divide-slate-100 dark:divide-neutral-700/80 overflow-y-auto">
        {desk.placements.map((placement) => {
          const checked = checkedIds.has(placement.student.id);
          return (
            <li
              key={placement.student.id}
              className={cn(
                'flex items-center gap-3.5 px-4 py-3 text-sm hover:bg-slate-50/50 dark:hover:bg-neutral-800/40 transition-colors',
                checked && 'bg-destructive/5',
              )}
            >
              {desk.canPlace ? (
                <Checkbox
                  checked={checked}
                  onCheckedChange={() => toggleOne(placement.student.id)}
                />
              ) : (
                <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate flex items-center gap-1.5">
                  <span className="font-semibold text-slate-900 dark:text-neutral-100">
                    {placement.student.fullName}
                  </span>
                  <span className="font-mono text-xs font-semibold text-primary">
                    {placement.student.studentCode}
                  </span>
                  {placement.student.major && (
                    <Badge variant="outline" className="h-4 px-1.5 text-[10px]">
                      {placement.student.major.code}
                    </Badge>
                  )}
                </p>
                <p className="truncate text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                  <span className="truncate">{placement.topicTitle}</span>
                  {placement.topicMajor && (
                    <Badge
                      variant="secondary"
                      className="h-4 px-1.5 text-[10px] shrink-0"
                    >
                      {placement.topicMajor.code}
                    </Badge>
                  )}
                </p>
              </div>

              {desk.canPlace && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="shrink-0 h-8 text-xs font-medium text-slate-500 hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                  disabled={busy}
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
          );
        })}
      </ul>
    </section>
  );
}
