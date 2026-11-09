'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  BookMarked,
  CalendarRange,
  Check,
  Eye,
  Loader2,
  Lock,
  LockOpen,
  MoreHorizontal,
  Search,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import {
  useTopicLecturers,
  useTopicTransition,
  useTopics,
} from '@/lib/api/topics';
import { useRequireRole } from '@/lib/auth/use-require-role';
import { useDebouncedValue } from '@/lib/use-debounced-value';
import type { TopicListItem, TopicStatus } from '@/lib/api/types';
import { useSemesters } from '@/lib/api/master-data';
import { BulkOpenDialog } from '@/components/admin/bulk-open-dialog';
import { TopicExportMenu } from '@/components/admin/topic-export-menu';
import { EmptyState } from '@/components/shared/empty-state';
import { LecturerCombobox } from '@/components/shared/lecturer-combobox';
import { PaginationBar } from '@/components/shared/pagination-bar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const PAGE_SIZE = 15;

const STATUS_OPTIONS: { value: TopicStatus | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'Mọi trạng thái' },
  { value: 'PENDING_DEPARTMENT', label: 'Chờ Bộ môn duyệt' },
  { value: 'APPROVED', label: 'Đã duyệt — chờ mở' },
  { value: 'OPEN', label: 'Đang mở' },
  { value: 'IN_PROGRESS', label: 'Đang thực hiện' },
  { value: 'COMPLETED', label: 'Hoàn thành' },
  { value: 'REJECTED', label: 'Bị từ chối' },
];

const STATUS_LABELS: Record<TopicStatus, { label: string; className: string }> =
  {
    DRAFT: { label: 'Bản nháp', className: 'text-muted-foreground' },
    PENDING: { label: 'Chờ duyệt', className: 'text-muted-foreground' },
    PENDING_DEPARTMENT: {
      label: 'Chờ Bộ môn',
      className: 'text-orange-600 dark:text-orange-400',
    },
    APPROVED_OPEN: {
      label: 'Đã duyệt mở',
      className: 'text-emerald-600 dark:text-emerald-400',
    },
    APPROVED: {
      label: 'Đã duyệt — chờ mở',
      className: 'text-amber-600 dark:text-amber-400',
    },
    OPEN: { label: 'Đang mở', className: 'text-green-600 dark:text-green-400' },
    ASSIGNED: { label: 'Đã giao nhóm', className: 'text-purple-600' },
    IN_PROGRESS: { label: 'Đang làm', className: 'text-blue-600' },
    COMPLETED: { label: 'Hoàn thành', className: 'text-muted-foreground' },
    REJECTED: { label: 'Bị từ chối', className: 'text-rose-600' },
  };

const dateFormat = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

/** Occupancy badge — coloured when topic is full. */
function OccupancyBadge({ topic }: { topic: TopicListItem }) {
  const full = topic.isFull;
  return (
    <span
      className={`font-mono tabular-nums font-semibold ${
        full
          ? 'text-slate-500 dark:text-neutral-400'
          : topic.occupiedSeats > 0
            ? 'text-primary'
            : 'text-emerald-600 dark:text-emerald-400'
      }`}
    >
      {topic.occupiedSeats}/{topic.maxStudents}
    </span>
  );
}

/** Badge showing whether this topic originated from a student proposal. */
function OriginBadge({ fromProposal }: { fromProposal: boolean }) {
  if (!fromProposal) {
    return <span className="text-muted-foreground">—</span>;
  }
  return (
    <span className="inline-flex items-center rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 dark:border-neutral-700 dark:bg-[#262626] dark:text-neutral-300">
      Từ đề xuất SV
    </span>
  );
}

/** Quick actions dropdown for a single topic row. */
function TopicActionsDropdown({ topic }: { topic: TopicListItem }) {
  const transition = useTopicTransition();
  const mine = transition.variables?.id === topic.id && transition.isPending;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-xs"
            disabled={mine}
            className="size-8 text-slate-500 hover:text-slate-900 dark:text-neutral-400 dark:hover:text-neutral-100 hover:bg-slate-100 dark:hover:bg-neutral-800 cursor-pointer"
            aria-label="Thao tác với đề tài"
          >
            {mine ? (
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            ) : (
              <MoreHorizontal className="size-4" />
            )}
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem
          render={<Link href={`/admin/topics/${topic.id}`} />}
          className="cursor-pointer gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          <Eye className="size-4 text-slate-500 dark:text-neutral-400" />
          <span>Xem chi tiết</span>
        </DropdownMenuItem>

        {topic.status === 'APPROVED' && (
          <DropdownMenuItem
            className="cursor-pointer gap-2 text-emerald-600 dark:text-emerald-400 focus:text-emerald-700 dark:focus:text-emerald-300"
            disabled={transition.isPending}
            onClick={(e) => {
              e.stopPropagation();
              transition
                .mutateAsync({ id: topic.id, to: 'open' })
                .then(() => toast.success('Đã mở đăng ký đề tài.'))
                .catch(() => toast.error('Không thực hiện được.'));
            }}
          >
            <LockOpen className="size-4" />
            <span>Mở đăng ký</span>
          </DropdownMenuItem>
        )}

        {topic.status === 'OPEN' && (
          <DropdownMenuItem
            className="cursor-pointer gap-2 text-rose-600 dark:text-rose-400 focus:text-rose-700 dark:focus:text-rose-300"
            disabled={transition.isPending}
            onClick={(e) => {
              e.stopPropagation();
              transition
                .mutateAsync({ id: topic.id, to: 'close' })
                .then(() => toast.success('Đã đóng đăng ký đề tài.'))
                .catch(() => toast.error('Không thực hiện được.'));
            }}
          >
            <Lock className="size-4" />
            <span>Đóng đăng ký</span>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function AdminTopicRegistryPage() {
  const allowed = useRequireRole('ADMIN');

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<TopicStatus | 'ALL'>('ALL');
  const [lecturerId, setLecturerId] = useState(0);
  const [bulkOpen, setBulkOpen] = useState(false);

  const debouncedSearch = useDebouncedValue(search);
  const {
    data: semestersData,
    isPending: isSemestersPending,
    error: semestersError,
  } = useSemesters();
  const activeSemester = semestersData?.find((s) => s.isActive);
  const activeSemesterId = activeSemester?.id;
  const hasActiveSemester = activeSemesterId !== undefined;

  const { data: lecturers } = useTopicLecturers(activeSemesterId, {
    enabled: allowed && hasActiveSemester,
  });

  const { data, isPending, error } = useTopics(
    {
      status: statusFilter === 'ALL' ? undefined : statusFilter,
      semesterId: activeSemesterId,
      lecturerId: lecturerId || undefined,
      q: debouncedSearch || undefined,
      page,
      limit: PAGE_SIZE,
    },
    { enabled: allowed && hasActiveSemester },
  );

  // Count of APPROVED topics in active semester for the bulk-open dialog.
  const { data: approvedData } = useTopics(
    {
      status: 'APPROVED',
      semesterId: activeSemesterId,
      limit: 1,
    },
    { enabled: allowed && hasActiveSemester },
  );
  const approvedCount = hasActiveSemester ? (approvedData?.total ?? 0) : 0;

  const hasFilters = Boolean(
    debouncedSearch || statusFilter !== 'ALL' || lecturerId !== 0,
  );

  if (!allowed) return null;

  if (!isSemestersPending && !semestersError && !activeSemester) {
    return (
      <div className="w-full min-w-0 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-lg font-semibold">Quản lý đề tài</h1>
        </div>
        <div className="isolate overflow-hidden rounded-xl border border-slate-300 dark:border-neutral-700 bg-white dark:bg-[#1e1e1e] shadow-2xs">
          <EmptyState
            icon={CalendarRange}
            title="Chưa có học kỳ nào đang mở. Vui lòng kích hoạt một học kỳ để quản lý đề tài."
            action={
              <Button render={<Link href="/admin/semesters" />} size="sm">
                Đi tới quản lý học kỳ
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  const topics = data?.items ?? [];

  return (
    <TooltipProvider delay={200}>
      <div className="w-full min-w-0 space-y-4">
        {/* ── Header ── */}
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-lg font-semibold">Quản lý đề tài</h1>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <TopicExportMenu
              semesterId={activeSemesterId}
              semesterCode={activeSemester?.code}
              approvedCount={approvedCount}
              filteredCount={data?.total ?? 0}
              filters={{
                status: statusFilter === 'ALL' ? undefined : statusFilter,
                lecturerId: lecturerId || undefined,
                q: debouncedSearch || undefined,
              }}
              disabled={!hasActiveSemester}
            />

            <Button
              className="gap-2 cursor-pointer"
              onClick={() => setBulkOpen(true)}
              disabled={!hasActiveSemester || approvedCount === 0}
            >
              <Check className="size-4" />
              Mở đăng ký đồng loạt
              {approvedCount > 0 && (
                <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-xs font-semibold">
                  {approvedCount}
                </span>
              )}
            </Button>
          </div>
        </div>

        {/* ── Filters ── */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-52 flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Tìm theo tên đề tài…"
              className="pl-8"
              aria-label="Tìm đề tài"
            />
          </div>

          <Select
            value={statusFilter}
            onValueChange={(v) => {
              setStatusFilter(v as TopicStatus | 'ALL');
              setPage(1);
            }}
          >
            <SelectTrigger className="w-48" aria-label="Lọc theo trạng thái">
              <SelectValue>
                {(value) =>
                  STATUS_OPTIONS.find((opt) => opt.value === value)?.label
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <LecturerCombobox
            lecturers={lecturers ?? []}
            value={lecturerId}
            onChange={(val) => {
              setLecturerId(val);
              setPage(1);
            }}
            size="default"
            className="w-48 sm:w-52 shrink-0"
            triggerClassName="dark:bg-[#141416] dark:hover:bg-[#1a1a1d] dark:focus:bg-[#0f0f11]"
            aria-label="Lọc theo giảng viên"
          />

          {data && (
            <span className="ml-auto text-sm font-medium text-slate-600 dark:text-neutral-400 select-none">
              <strong className="text-primary font-bold text-sm">
                {data.total}
              </strong>{' '}
              đề tài
            </span>
          )}
        </div>

        {(semestersError || error) && (
          <p className="text-sm text-destructive">Không tải được danh sách.</p>
        )}

        {/* ── Table ── */}
        <div className="isolate w-full min-w-0 overflow-hidden rounded-xl border border-slate-300 dark:border-neutral-700 bg-white dark:bg-[#1e1e1e] shadow-2xs">
          <Table
            containerClassName="w-full overflow-x-auto"
            className="w-full min-w-[1040px] table-fixed text-left text-sm"
          >
            <TableHeader>
              <TableRow>
                <TableHead className="w-[236px] min-w-[220px] px-4">
                  Tiêu đề
                </TableHead>
                <TableHead className="w-[124px] px-2.5 whitespace-nowrap">
                  Giảng viên
                </TableHead>
                <TableHead className="w-[170px] px-2.5 whitespace-nowrap">
                  Loại đồ án
                </TableHead>
                <TableHead className="w-14 px-2 text-center whitespace-nowrap">
                  Chỗ
                </TableHead>
                <TableHead className="w-[122px] px-2.5 whitespace-nowrap">
                  Nguồn gốc
                </TableHead>
                <TableHead className="w-[152px] px-3 whitespace-nowrap">
                  Trạng thái
                </TableHead>
                <TableHead className="w-[100px] px-2.5 whitespace-nowrap">
                  Tạo lúc
                </TableHead>
                <TableHead className="w-20 px-2 text-center whitespace-nowrap">
                  Thao tác
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topics.map((topic) => (
                <TableRow
                  key={topic.id}
                  className="transition-colors hover:bg-slate-50/70 dark:hover:bg-neutral-800/40"
                >
                  <TableCell className="w-[236px] min-w-[220px] px-4 font-medium whitespace-normal">
                    <div className="w-full whitespace-normal">
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <Link
                              href={`/admin/topics/${topic.id}`}
                              className="line-clamp-2 font-bold text-slate-900 dark:text-neutral-100 hover:text-primary dark:hover:text-primary transition-colors leading-snug break-words [overflow-wrap:anywhere] whitespace-normal cursor-pointer"
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
                          <p className="font-semibold text-primary mb-1">
                            Tên đề tài đầy đủ:
                          </p>
                          <p className="text-slate-200 dark:text-neutral-200 break-words [overflow-wrap:anywhere]">
                            {topic.title}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </TableCell>
                  <TableCell className="w-[124px] px-2.5 truncate whitespace-nowrap text-slate-800 dark:text-neutral-200 font-medium">
                    {topic.lecturer.academicTitle
                      ? `${topic.lecturer.academicTitle} ${topic.lecturer.fullName}`
                      : topic.lecturer.fullName}
                  </TableCell>
                  <TableCell className="w-[170px] px-2.5 truncate whitespace-nowrap text-slate-700 dark:text-neutral-300 font-medium">
                    {topic.projectType.name}
                  </TableCell>
                  <TableCell className="w-14 px-2 text-center whitespace-nowrap">
                    <OccupancyBadge topic={topic} />
                  </TableCell>
                  <TableCell className="w-[122px] px-2.5 whitespace-nowrap">
                    <OriginBadge fromProposal={topic.fromProposal} />
                  </TableCell>
                  <TableCell className="w-[152px] px-3 whitespace-nowrap">
                    <span
                      className={`text-sm font-medium ${STATUS_LABELS[topic.status]?.className ?? ''}`}
                    >
                      {STATUS_LABELS[topic.status]?.label ?? topic.status}
                    </span>
                  </TableCell>
                  <TableCell className="w-[100px] px-2.5 whitespace-nowrap tabular-nums text-muted-foreground">
                    {dateFormat.format(new Date(topic.createdAt))}
                  </TableCell>
                  <TableCell className="w-20 px-2 text-center whitespace-nowrap">
                    <TopicActionsDropdown topic={topic} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {(isSemestersPending || (hasActiveSemester && isPending)) && (
            <div className="flex justify-center py-14">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {!isSemestersPending &&
            !(hasActiveSemester && isPending) &&
            !semestersError &&
            topics.length === 0 && (
              <EmptyState
                icon={BookMarked}
                title={
                  debouncedSearch
                    ? 'Không có đề tài nào khớp từ khoá.'
                    : hasFilters
                      ? 'Không có đề tài nào khớp bộ lọc.'
                      : 'Chưa có đề tài nào trong học kỳ hiện tại.'
                }
              />
            )}
        </div>

        {data && (
          <PaginationBar
            page={data.page}
            totalPages={data.totalPages}
            onPageChange={setPage}
          />
        )}

        {/* ── Bulk open dialog ── */}
        <BulkOpenDialog
          open={bulkOpen}
          onOpenChange={setBulkOpen}
          approvedCount={approvedCount}
          semesterId={activeSemesterId}
          semesterName={activeSemester?.name ?? 'Học kỳ hiện tại'}
        />
      </div>
    </TooltipProvider>
  );
}
