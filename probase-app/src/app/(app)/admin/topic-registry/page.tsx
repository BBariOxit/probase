'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  BookMarked,
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
import { useTopicTransition, useTopics } from '@/lib/api/topics';
import { useRequireRole } from '@/lib/auth/use-require-role';
import { useDebouncedValue } from '@/lib/use-debounced-value';
import type { Semester, TopicListItem, TopicStatus } from '@/lib/api/types';
import { useSemesters } from '@/lib/api/master-data';
import { BulkOpenDialog } from '@/components/admin/bulk-open-dialog';
import { TopicDetailSheet } from '@/components/topics/topic-detail-sheet';
import { EmptyState } from '@/components/shared/empty-state';
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
function TopicActionsDropdown({
  topic,
  onViewDetail,
}: {
  topic: TopicListItem;
  onViewDetail: () => void;
}) {
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
          className="cursor-pointer gap-2"
          onClick={(e) => {
            e.stopPropagation();
            onViewDetail();
          }}
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
  const [statusFilter, setStatusFilter] = useState<TopicStatus | 'ALL'>(
    'APPROVED',
  );
  const [semesterId, setSemesterId] = useState<number | undefined>(undefined);
  const [selectedTopicId, setSelectedTopicId] = useState<number | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);

  const debouncedSearch = useDebouncedValue(search);
  const { data: semestersData } = useSemesters();
  const semesters: Semester[] = semestersData ?? [];

  const { data, isPending, error } = useTopics({
    status: statusFilter === 'ALL' ? undefined : statusFilter,
    semesterId,
    q: debouncedSearch || undefined,
    page,
    limit: PAGE_SIZE,
  });

  // Count of APPROVED topics in selected semester for the bulk-open dialog.
  const { data: approvedData } = useTopics({
    status: 'APPROVED',
    semesterId,
    limit: 1,
  });
  const approvedCount = approvedData?.total ?? 0;

  const selectedSemester = semesters.find((s) => s.id === semesterId);

  if (!allowed) return null;

  const topics = data?.items ?? [];

  return (
    <div className="w-full min-w-0 space-y-4">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-lg font-semibold">Quản lý đề tài</h1>

        <Button
          className="ml-auto gap-2"
          onClick={() => setBulkOpen(true)}
          disabled={approvedCount === 0}
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
          value={semesterId ? semesterId.toString() : 'ALL'}
          onValueChange={(v) => {
            setSemesterId(v === 'ALL' ? undefined : Number(v));
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[280px]" aria-label="Lọc theo học kỳ">
            <SelectValue>
              {(value) =>
                value === 'ALL'
                  ? 'Tất cả học kỳ'
                  : semesters.find((s) => s.id.toString() === value)?.name
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tất cả học kỳ</SelectItem>
            {semesters.map((s) => (
              <SelectItem key={s.id} value={s.id.toString()}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

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

        {data && (
          <span className="ml-auto text-sm font-medium text-slate-600 dark:text-neutral-400 select-none">
            <strong className="text-primary font-bold text-sm">
              {data.total}
            </strong>{' '}
            đề tài
          </span>
        )}
      </div>

      {error && (
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
                className="cursor-pointer transition-colors hover:bg-slate-50/70 dark:hover:bg-neutral-800/40"
                onClick={() => setSelectedTopicId(topic.id)}
              >
                <TableCell className="w-[236px] min-w-[220px] px-4 font-medium whitespace-normal">
                  <div className="w-full whitespace-normal">
                    <Link
                      href={`/admin/topics/${topic.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="line-clamp-2 font-bold text-slate-900 dark:text-neutral-100 hover:text-primary dark:hover:text-primary transition-colors leading-snug break-words [overflow-wrap:anywhere] whitespace-normal cursor-pointer"
                      title={topic.title}
                    >
                      {topic.title}
                    </Link>
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
                <TableCell
                  className="w-20 px-2 text-center whitespace-nowrap"
                  onClick={(e) => e.stopPropagation()}
                >
                  <TopicActionsDropdown
                    topic={topic}
                    onViewDetail={() => setSelectedTopicId(topic.id)}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {isPending && (
          <div className="flex justify-center py-14">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isPending && topics.length === 0 && (
          <EmptyState
            icon={BookMarked}
            title={
              debouncedSearch
                ? 'Không có đề tài nào khớp từ khoá.'
                : 'Không có đề tài nào.'
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

      {/* ── Topic detail sheet (mở bên phải) ── */}
      <TopicDetailSheet
        topicId={selectedTopicId}
        onClose={() => setSelectedTopicId(null)}
        hideRegisterButton={true}
      />

      {/* ── Bulk open dialog ── */}
      <BulkOpenDialog
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        approvedCount={approvedCount}
        semesterId={semesterId ?? 0}
        semesterName={selectedSemester?.name ?? 'Tất cả học kỳ'}
      />
    </div>
  );
}
