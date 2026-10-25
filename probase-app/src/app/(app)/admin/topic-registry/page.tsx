'use client';

import { useState } from 'react';
import {
  BookMarked,
  Check,
  ChevronDown,
  Loader2,
  LockOpen,
  Search,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  useBulkOpenTopics,
  useTopicTransition,
  useTopics,
} from '@/lib/api/topics';
import { useRequireRole } from '@/lib/auth/use-require-role';
import { useDebouncedValue } from '@/lib/use-debounced-value';
import type { Semester, TopicListItem, TopicStatus } from '@/lib/api/types';
import { useSemesters } from '@/lib/api/master-data';
import { BulkOpenDialog } from '@/components/admin/bulk-open-dialog';
import { TopicReviewSheet } from '@/components/admin/topic-review-sheet';
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
  { value: 'APPROVED', label: 'Đã duyệt — chờ mở' },
  { value: 'OPEN', label: 'Đang mở' },
  { value: 'IN_PROGRESS', label: 'Đang thực hiện' },
  { value: 'COMPLETED', label: 'Hoàn thành' },
];

const STATUS_LABELS: Record<TopicStatus, { label: string; className: string }> =
  {
    PENDING: { label: 'Chờ duyệt', className: 'text-muted-foreground' },
    APPROVED: {
      label: 'Đã duyệt',
      className: 'text-amber-600 dark:text-amber-400',
    },
    OPEN: { label: 'Đang mở', className: 'text-green-600 dark:text-green-400' },
    IN_PROGRESS: { label: 'Đang làm', className: 'text-blue-600' },
    COMPLETED: { label: 'Hoàn thành', className: 'text-muted-foreground' },
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
      className={`font-mono tabular-nums ${full ? 'font-semibold text-destructive' : 'text-muted-foreground'}`}
    >
      {topic.occupiedSeats}/{topic.maxStudents}
    </span>
  );
}

/** Badge showing whether this topic originated from a student proposal. */
function OriginBadge({ fromProposal }: { fromProposal: boolean }) {
  if (!fromProposal) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-purple-300 bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700 dark:border-purple-800 dark:bg-purple-950 dark:text-purple-300">
      <BookMarked className="size-3" />
      Từ đề xuất SV
    </span>
  );
}

/** Quick open/close toggle button for a single topic row. */
function TopicActionButton({ topic }: { topic: TopicListItem }) {
  const transition = useTopicTransition();
  const mine = transition.variables?.id === topic.id && transition.isPending;

  if (topic.status === 'APPROVED') {
    return (
      <Button
        size="sm"
        variant="outline"
        className="gap-1.5"
        disabled={transition.isPending}
        onClick={(e) => {
          e.stopPropagation();
          transition
            .mutateAsync({ id: topic.id, to: 'open' })
            .then(() => toast.success('Đã mở đăng ký đề tài.'))
            .catch(() => toast.error('Không thực hiện được.'));
        }}
      >
        {mine ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <LockOpen className="size-3.5" />
        )}
        Mở
      </Button>
    );
  }

  if (topic.status === 'OPEN') {
    return (
      <Button
        size="sm"
        variant="ghost"
        className="gap-1.5 text-muted-foreground"
        disabled={transition.isPending}
        onClick={(e) => {
          e.stopPropagation();
          transition
            .mutateAsync({ id: topic.id, to: 'close' })
            .then(() => toast.success('Đã đóng đăng ký đề tài.'))
            .catch(() => toast.error('Không thực hiện được.'));
        }}
      >
        {mine ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <X className="size-3.5" />
        )}
        Đóng
      </Button>
    );
  }

  return null;
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
    <div className="space-y-4">
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
          <span className="ml-auto text-sm text-muted-foreground">
            {data.total} đề tài
          </span>
        )}
      </div>

      {error && (
        <p className="text-sm text-destructive">Không tải được danh sách.</p>
      )}

      {/* ── Table ── */}
      <div className="overflow-hidden rounded-xl border">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-64">Tiêu đề</TableHead>
                <TableHead className="w-44">Giảng viên</TableHead>
                <TableHead className="w-32">Loại đồ án</TableHead>
                <TableHead className="w-20 text-center">Chỗ</TableHead>
                <TableHead className="w-36">Nguồn gốc</TableHead>
                <TableHead className="w-32">Trạng thái</TableHead>
                <TableHead className="w-28 text-right">Tạo lúc</TableHead>
                <TableHead className="w-24 text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topics.map((topic) => (
                <TableRow
                  key={topic.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setSelectedTopicId(topic.id)}
                >
                  <TableCell className="font-medium">
                    {topic.title}
                    <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                      {topic.semester.name}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {topic.lecturer.academicTitle
                      ? `${topic.lecturer.academicTitle} ${topic.lecturer.fullName}`
                      : topic.lecturer.fullName}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {topic.projectType.name}
                  </TableCell>
                  <TableCell className="text-center">
                    <OccupancyBadge topic={topic} />
                  </TableCell>
                  <TableCell>
                    <OriginBadge fromProposal={topic.fromProposal} />
                  </TableCell>
                  <TableCell>
                    <span
                      className={`text-sm font-medium ${STATUS_LABELS[topic.status]?.className ?? ''}`}
                    >
                      {STATUS_LABELS[topic.status]?.label ?? topic.status}
                    </span>
                  </TableCell>
                  <TableCell className="tabular-nums text-right text-muted-foreground">
                    {dateFormat.format(new Date(topic.createdAt))}
                  </TableCell>
                  <TableCell
                    className="text-right"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <TopicActionButton topic={topic} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

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

      {/* ── Detail sheet ── */}
      <TopicReviewSheet
        topicId={selectedTopicId}
        onClose={() => setSelectedTopicId(null)}
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
