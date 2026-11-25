'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Check,
  ClipboardCheck,
  Eye,
  Loader2,
  RotateCcw,
  Search,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useMyProfile } from '@/lib/api/me';
import { useMyPermissions } from '@/lib/api/permissions';
import {
  useBulkDepartmentReviewTopics,
  useTopics,
} from '@/lib/api/topics';
import { useSemesters } from '@/lib/api/master-data';
import { useRequireRole } from '@/lib/auth/use-require-role';
import {
  BulkActionBar,
  BulkIconAction,
} from '@/components/shared/bulk-action-bar';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { EmptyState } from '@/components/shared/empty-state';
import { PaginationBar } from '@/components/shared/pagination-bar';
import { TopicReviewSheet } from '@/components/topics/topic-review-sheet';
import { TopicStatusBadge } from '@/components/topics/topic-status-badge';
import { RoundLecturerProgressTab } from '@/components/admin/round-lecturer-progress-tab';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { TOPIC_PAGE_SIZE } from '@/constants/pagination.constant';
import { useDebounce, useTableSelection } from '@/hooks';

const dateFormat = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

export default function LecturerTopicReviewsPage() {
  const allowed = useRequireRole(['LECTURER', 'GVCN']);
  const { data: profile, isPending: isProfilePending } = useMyProfile({
    enabled: allowed,
  });
  const { data: myPermissions, isPending: isPermsPending } = useMyPermissions();

  const lecturer = profile?.lecturer;
  const isHeadOfDepartment = lecturer?.isHeadOfDepartment ?? false;
  const canReviewDept =
    isHeadOfDepartment ||
    (myPermissions?.includes('TOPIC_REVIEW_DEPT') ?? false);

  const [activeTab, setActiveTab] = useState<'reviews' | 'progress'>('reviews');
  const [filterStatus, setFilterStatus] = useState<
    'PENDING_DEPARTMENT' | 'APPROVED' | 'ALL'
  >('PENDING_DEPARTMENT');
  const [filterLecturerId, setFilterLecturerId] = useState<number | null>(null);
  const [filterLecturerName, setFilterLecturerName] = useState<string | null>(
    null,
  );
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedTopicId, setSelectedTopicId] = useState<number | null>(null);
  const [bulkApproveOpen, setBulkApproveOpen] = useState(false);
  const [bulkReviseOpen, setBulkReviseOpen] = useState(false);
  const [bulkFeedback, setBulkFeedback] = useState('');
  const debouncedSearch = useDebounce(search);

  const { data: semesters } = useSemesters();
  const activeSemester = semesters?.find((s) => s.isActive);
  const activeSemesterId = activeSemester?.id ?? semesters?.[0]?.id;

  const { data, isPending, error } = useTopics(
    {
      reviewStage: filterStatus === 'ALL' ? 'ALL' : 'DEPARTMENT',
      ...(lecturer?.major?.id ? { majorId: lecturer.major.id } : {}),
      ...(filterStatus === 'APPROVED' ? { status: 'APPROVED' } : {}),
      ...(filterLecturerId ? { lecturerId: filterLecturerId } : {}),
      page,
      limit: TOPIC_PAGE_SIZE,
      q: debouncedSearch || undefined,
    },
    {
      enabled:
        allowed && !isProfilePending && !isPermsPending && canReviewDept,
    },
  );

  const topics = useMemo(() => data?.items ?? [], [data?.items]);
  const {
    selectedItems,
    selectedCount,
    allOnPageSelected,
    isSelected,
    toggleRow,
    toggleAllOnPage,
    clearSelection,
    removeSelectedIds,
  } = useTableSelection(topics);

  const bulkReview = useBulkDepartmentReviewTopics();

  const selectedPendingIds = useMemo(
    () =>
      selectedItems
        .filter(
          (t) => t.status === 'PENDING_DEPARTMENT' || t.status === 'PENDING',
        )
        .map((t) => t.id),
    [selectedItems],
  );

  const selectedRevisableIds = useMemo(
    () =>
      selectedItems
        .filter(
          (t) =>
            t.status === 'PENDING_DEPARTMENT' ||
            t.status === 'PENDING' ||
            (t.status === 'APPROVED' && t.activeGroup === null),
        )
        .map((t) => t.id),
    [selectedItems],
  );

  if (!allowed) return null;

  if (isProfilePending || isPermsPending) {
    return (
      <div className="flex justify-center py-14">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!canReviewDept) {
    return (
      <div className="isolate overflow-hidden rounded-xl border border-slate-300 dark:border-neutral-700 bg-white dark:bg-[#1e1e1e] shadow-2xs">
        <EmptyState
          icon={ClipboardCheck}
          title="Chức năng này chỉ dành cho Tổ trưởng Bộ môn."
        />
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 space-y-4">
      {/* ── Tiêu đề trang tích hợp đồng thời làm Tab điều hướng ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-3">
        <div className="flex items-center gap-8">
          <button
            type="button"
            onClick={() => setActiveTab('reviews')}
            className={cn(
              'group inline-flex items-center gap-2 pb-0.5 text-xl font-bold tracking-tight transition-colors cursor-pointer relative',
              activeTab === 'reviews'
                ? 'text-foreground after:absolute after:-bottom-3.5 after:left-0 after:right-0 after:h-[3px] after:rounded-full after:bg-primary'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            Đề tài cần duyệt
            {data && (
              <span className="ml-1 rounded-full bg-slate-200 dark:bg-neutral-800 px-2 py-0.5 text-xs font-mono font-medium text-slate-700 dark:text-neutral-300">
                {data.total}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('progress')}
            className={cn(
              'group inline-flex items-center gap-2 pb-0.5 text-xl font-bold tracking-tight transition-colors cursor-pointer relative',
              activeTab === 'progress'
                ? 'text-foreground after:absolute after:-bottom-3.5 after:left-0 after:right-0 after:h-[3px] after:rounded-full after:bg-primary'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            Tiến độ nộp đề tài
          </button>
        </div>
      </div>

      {activeTab === 'progress' ? (
        <RoundLecturerProgressTab
          semesterId={activeSemesterId}
          defaultMajorId={lecturer?.major?.id}
          onFilterByLecturer={(lecturerId, lecturerName) => {
            setFilterLecturerId(lecturerId);
            setFilterLecturerName(lecturerName || null);
            setFilterStatus('ALL');
            setPage(1);
            setActiveTab('reviews');
          }}
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-52 flex-1 sm:max-w-xs">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Tìm theo tên đề tài…"
                className="pl-8"
                aria-label="Tìm đề tài"
              />
            </div>

            <Select
              value={filterStatus}
              onValueChange={(val) => {
                if (
                  val === 'PENDING_DEPARTMENT' ||
                  val === 'APPROVED' ||
                  val === 'ALL'
                ) {
                  setFilterStatus(val);
                  setPage(1);
                }
              }}
            >
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PENDING_DEPARTMENT">Chờ duyệt</SelectItem>
                <SelectItem value="APPROVED">Đã duyệt</SelectItem>
                <SelectItem value="ALL">Tất cả trạng thái</SelectItem>
              </SelectContent>
            </Select>

            {filterLecturerId && (
              <div className="flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                <span>
                  Giảng viên: {filterLecturerName ?? `#${filterLecturerId}`}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setFilterLecturerId(null);
                    setFilterLecturerName(null);
                    setPage(1);
                  }}
                  className="rounded-full p-0.5 hover:bg-primary/20 cursor-pointer"
                  title="Xoá bộ lọc giảng viên"
                >
                  <X className="size-3" />
                </button>
              </div>
            )}

            {data && (
              <span className="ml-auto text-sm text-muted-foreground">
                {data.total} đề tài
              </span>
            )}
          </div>

          {error && (
            <p className="text-sm text-destructive">Không tải được hàng chờ.</p>
          )}

          <BulkActionBar
            variant="floating"
            count={selectedCount}
            itemName="đề tài"
            onClear={clearSelection}
          >
            {selectedPendingIds.length > 0 && (
              <BulkIconAction
                tone="primary"
                label={`Duyệt (${selectedPendingIds.length})`}
                icon={<Check className="size-4" />}
                disabled={bulkReview.isPending}
                onClick={() => setBulkApproveOpen(true)}
              />
            )}

            {selectedRevisableIds.length > 0 && (
              <BulkIconAction
                tone="warning"
                label={`Yêu cầu sửa (${selectedRevisableIds.length})`}
                icon={<RotateCcw className="size-4" />}
                disabled={bulkReview.isPending}
                onClick={() => {
                  setBulkFeedback('');
                  setBulkReviseOpen(true);
                }}
              />
            )}
          </BulkActionBar>

          <div className="isolate w-full min-w-0 overflow-hidden rounded-xl border border-slate-300 dark:border-neutral-700 bg-white dark:bg-[#1e1e1e] shadow-2xs">
            <Table
              containerClassName="w-full overflow-x-auto"
              className="w-full min-w-[890px] table-fixed text-left text-sm"
            >
              <TableHeader>
                <TableRow>
                  <TableHead className="w-11 px-3 py-3.5 text-center">
                    <Checkbox
                      checked={allOnPageSelected}
                      onCheckedChange={toggleAllOnPage}
                      disabled={topics.length === 0}
                      aria-label="Chọn tất cả đề tài trên trang"
                    />
                  </TableHead>
                  <TableHead className="w-[320px] max-w-[360px] min-w-[260px] px-5 py-3.5 whitespace-nowrap">
                    Tiêu đề
                  </TableHead>
                  <TableHead className="w-36 px-3 py-3.5 whitespace-nowrap">
                    Giảng viên
                  </TableHead>
                  <TableHead className="w-36 px-3 py-3.5 whitespace-nowrap">
                    Loại đồ án
                  </TableHead>
                  <TableHead className="w-28 px-3 py-3.5 whitespace-nowrap">
                    Trạng thái
                  </TableHead>
                  <TableHead className="w-28 px-3 py-3.5 whitespace-nowrap">
                    Ngày gửi
                  </TableHead>
                  <TableHead className="w-32 px-4 py-3.5 text-right whitespace-nowrap">
                    Thao tác
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topics.map((topic) => {
                  const checked = isSelected(topic.id);
                  return (
                  <TableRow
                    key={topic.id}
                    data-state={checked ? 'selected' : undefined}
                    className="transition-colors hover:bg-slate-50/70 dark:hover:bg-neutral-800/40"
                  >
                    <TableCell className="w-11 px-3 py-3.5 text-center align-middle">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(val) => toggleRow(topic, val)}
                        aria-label={`Chọn đề tài ${topic.title}`}
                      />
                    </TableCell>
                    <TableCell className="w-[320px] max-w-[360px] min-w-[260px] px-5 py-3.5 align-middle font-medium whitespace-normal">
                      <div className="w-full max-w-[360px] whitespace-normal">
                        <Link
                          href={`/lecturer/topics/${topic.id}?from=topic-reviews`}
                          className="line-clamp-2 font-bold text-slate-900 dark:text-neutral-100 hover:text-primary dark:hover:text-primary transition-colors leading-snug break-words [overflow-wrap:anywhere] whitespace-normal"
                          title={topic.title}
                        >
                          {topic.title}
                        </Link>
                      </div>
                    </TableCell>
                    <TableCell className="w-36 px-3 py-3.5 align-middle truncate font-medium text-slate-800 dark:text-neutral-200">
                      {topic.lecturer.fullName}
                    </TableCell>
                    <TableCell className="w-36 px-3 py-3.5 align-middle truncate font-medium text-slate-700 dark:text-neutral-300">
                      {topic.projectType.name}
                    </TableCell>
                    <TableCell className="w-28 px-3 py-3.5 align-middle whitespace-nowrap">
                      <TopicStatusBadge status={topic.status} />
                    </TableCell>
                    <TableCell className="w-28 px-3 py-3.5 align-middle whitespace-nowrap text-muted-foreground tabular-nums">
                      {dateFormat.format(new Date(topic.createdAt))}
                    </TableCell>
                    <TableCell className="w-32 px-4 py-3.5 align-middle text-right whitespace-nowrap">
                      {topic.status === 'PENDING_DEPARTMENT' ||
                      topic.status === 'PENDING' ? (
                        <Button
                          size="sm"
                          onClick={() => setSelectedTopicId(topic.id)}
                          className="cursor-pointer gap-1.5 font-semibold"
                        >
                          <Check className="size-4" />
                          <span>Duyệt</span>
                        </Button>
                      ) : topic.status === 'APPROVED' ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedTopicId(topic.id)}
                          className="cursor-pointer gap-1.5 font-medium text-amber-700 hover:text-amber-800 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/30 border-amber-300 dark:border-amber-700"
                        >
                          <RotateCcw className="size-3.5" />
                          <span>Hủy duyệt</span>
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelectedTopicId(topic.id)}
                          className="cursor-pointer gap-1.5 font-medium"
                        >
                          <Eye className="size-3.5" />
                          <span>Xem</span>
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {isPending && (
              <div className="flex justify-center py-14">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            )}

            {!isPending && topics.length === 0 && (
              <EmptyState
                icon={ClipboardCheck}
                title={
                  debouncedSearch
                    ? 'Không có đề tài nào khớp từ khoá.'
                    : filterStatus === 'PENDING_DEPARTMENT'
                      ? 'Không còn đề tài nào chờ duyệt.'
                      : 'Không có đề tài nào trong danh sách.'
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
        </>
      )}

      <TopicReviewSheet
        topicId={selectedTopicId}
        onClose={() => setSelectedTopicId(null)}
        stage="DEPARTMENT"
        isHeadOfDepartment={isHeadOfDepartment}
      />

      <ConfirmDialog
        open={bulkApproveOpen}
        onOpenChange={setBulkApproveOpen}
        title={`Phê duyệt ${selectedPendingIds.length} đề tài đã chọn?`}
        description="Các đề tài đạt chuẩn sẽ chuyển sang trạng thái Đã duyệt, sẵn sàng chờ Giáo vụ mở đăng ký cho sinh viên."
        confirmLabel="Phê duyệt hàng loạt"
        confirmVariant="default"
        onConfirm={async () => {
          const res = await bulkReview.mutateAsync({
            topicIds: selectedPendingIds,
            action: 'APPROVE',
          });
          toast.success(`Đã phê duyệt ${res.updated} đề tài.`);
          removeSelectedIds(selectedPendingIds);
          setBulkApproveOpen(false);
        }}
      />

      <Dialog open={bulkReviseOpen} onOpenChange={setBulkReviseOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Yêu cầu chỉnh sửa {selectedRevisableIds.length} đề tài
            </DialogTitle>
            <DialogDescription>
              Các đề tài được chọn sẽ chuyển về Bản nháp và gửi kèm nhận xét tới giảng viên ra đề.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={bulkFeedback}
            onChange={(e) => setBulkFeedback(e.target.value)}
            placeholder="Nhập nội dung cần giảng viên chỉnh sửa..."
            rows={4}
            className="text-sm"
          />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setBulkReviseOpen(false)}
              disabled={bulkReview.isPending}
            >
              Hủy
            </Button>
            <Button
              type="button"
              disabled={!bulkFeedback.trim() || bulkReview.isPending}
              onClick={async () => {
                try {
                  const res = await bulkReview.mutateAsync({
                    topicIds: selectedRevisableIds,
                    action: 'REQUEST_REVISION',
                    feedback: bulkFeedback.trim(),
                  });
                  toast.success(
                    `Đã gửi yêu cầu chỉnh sửa cho ${res.updated} đề tài.`,
                  );
                  removeSelectedIds(selectedRevisableIds);
                  setBulkReviseOpen(false);
                } catch (err: unknown) {
                  toast.error(
                    err instanceof Error
                      ? err.message
                      : 'Không thực hiện được thao tác hàng loạt.',
                  );
                }
              }}
            >
              {bulkReview.isPending && (
                <Loader2 className="mr-1.5 size-4 animate-spin" />
              )}
              Gửi yêu cầu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
