'use client';

import { useMemo, useState } from 'react';
import {
  BookMarked,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  Eye,
  Layers,
  Loader2,
  Search,
  Users,
} from 'lucide-react';
import { useSemesters } from '@/lib/api/master-data';
import { useMyProfile } from '@/lib/api/me';
import { useTopics } from '@/lib/api/topics';
import { useRequireRole } from '@/lib/auth/use-require-role';
import { useSession } from '@/lib/auth/session';
import { EmptyState } from '@/components/shared/empty-state';
import { PaginationBar } from '@/components/shared/pagination-bar';
import { TopicReviewModal } from '@/components/topics/topic-review-modal';
import { TopicStatusBadge } from '@/components/topics/topic-status-badge';
import { Badge } from '@/components/ui/badge';
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
import { TOPIC_PAGE_SIZE } from '@/constants/pagination.constant';
import { useDebounce, usePagination } from '@/hooks';
import { cn } from '@/lib/utils';

type ReviewTab = 'DEPARTMENT' | 'ALL';

export default function LecturerTopicReviewsPage() {
  const allowed = useRequireRole(['LECTURER', 'ADMIN']);
  const user = useSession((s) => s.user);
  const isAdmin = user?.role === 'ADMIN';
  const { data: profile, isPending: isProfilePending } = useMyProfile({
    enabled: user?.role === 'LECTURER',
  });

  const isProfileLoading = user?.role === 'LECTURER' && isProfilePending;
  const lecturer = profile?.lecturer;
  const isHeadOfDepartment = lecturer?.isHeadOfDepartment ?? false;
  const hasReviewAccess = isHeadOfDepartment || isAdmin;

  const [tab, setTab] = useState<ReviewTab>('DEPARTMENT');
  const { page, setPage, pageSize, setPageSize, resetPage } = usePagination({
    initialPage: 1,
    initialPageSize: TOPIC_PAGE_SIZE,
    storageKey: 'probase_ttbm_topic_reviews_page_size',
  });
  const [semesterFilter, setSemesterFilter] = useState<string>('AUTO');
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput, 300);
  const [reviewingTopicId, setReviewingTopicId] = useState<number | null>(null);

  const { data: semesters = [] } = useSemesters();

  const activeSemester = useMemo(
    () => semesters.find((s) => s.isActive) ?? semesters[0],
    [semesters],
  );

  const resolvedSemesterValue =
    semesterFilter === 'AUTO'
      ? activeSemester
        ? String(activeSemester.id)
        : 'ALL'
      : semesterFilter;

  const currentSemesterId =
    resolvedSemesterValue === 'ALL' ? undefined : Number(resolvedSemesterValue);

  const { data, isPending, error } = useTopics(
    {
      semesterId: currentSemesterId,
      reviewStage: tab,
      ...(isHeadOfDepartment && !isAdmin && lecturer?.major?.id
        ? { majorId: lecturer.major.id }
        : {}),
      q: debouncedSearch || undefined,
      page,
      limit: pageSize,
    },
    { enabled: allowed && !isProfileLoading && hasReviewAccess },
  );

  if (!allowed) return null;

  if (isProfileLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-muted-foreground">
        <Loader2 className="size-8 animate-spin text-primary" />
        <p className="text-sm">Đang xác thực quyền thẩm định chuyên môn...</p>
      </div>
    );
  }

  if (!hasReviewAccess) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <div className="space-y-3 rounded-xl border bg-card p-8 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
            <Building2 className="size-6" />
          </div>
          <h2 className="text-lg font-semibold">Khu vực Thẩm định Đề tài Bộ môn</h2>
          <p className="mx-auto max-w-md text-sm text-muted-foreground">
            Chức năng này dành cho <strong>Tổ trưởng Bộ môn (TTBM)</strong> rà soát
            chuyên môn, kiểm tra trùng lặp và duyệt đề tài trước khi chuyển sang Giáo vụ
            Khoa mở đăng ký.
          </p>
        </div>
      </div>
    );
  }

  const topics = data?.items ?? [];
  const total = data?.total ?? 0;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
            <Building2 className="size-4" />
            Khoa Công nghệ Thông tin — DLU
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Thẩm định Đề tài Bộ môn</h1>
          <p className="text-sm text-muted-foreground">
            Rà soát nội dung chuyên môn và kiểm tra trùng lặp đề tài do giảng viên gửi
            duyệt (BR-04 &amp; BR-05). Sau khi duyệt, đề tài sẽ sẵn sàng để Giáo vụ tổng
            hợp và mở đăng ký.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isHeadOfDepartment && (
            <Badge
              variant="secondary"
              className="gap-1.5 bg-orange-100 px-2.5 py-1 text-xs font-medium text-orange-800 dark:bg-orange-950 dark:text-orange-300"
            >
              <Building2 className="size-3.5" />
              Tổ trưởng Bộ môn {lecturer?.major ? `(${lecturer.major.name})` : ''}
            </Badge>
          )}
          {isAdmin && !isHeadOfDepartment && (
            <Badge
              variant="secondary"
              className="gap-1.5 bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-800 dark:bg-blue-950 dark:text-blue-300"
            >
              <ClipboardCheck className="size-3.5" />
              Quản trị / Giáo vụ Khoa
            </Badge>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b pb-2">
        <button
          type="button"
          onClick={() => {
            setTab('DEPARTMENT');
            resetPage();
          }}
          className={cn(
            'inline-flex cursor-pointer items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-all',
            tab === 'DEPARTMENT'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground',
          )}
        >
          <ClipboardCheck className="size-4" />
          Chờ Bộ môn duyệt
          {lecturer?.major && (
            <span className="text-xs opacity-80">({lecturer.major.code})</span>
          )}
        </button>

        <button
          type="button"
          onClick={() => {
            setTab('ALL');
            resetPage();
          }}
          className={cn(
            'inline-flex cursor-pointer items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-all',
            tab === 'ALL'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground',
          )}
        >
          <Layers className="size-4" />
          Tất cả đề tài
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center">
        <div className="relative max-w-md flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              resetPage();
            }}
            placeholder="Tìm theo tên đề tài, mô tả..."
            className="pl-9 text-sm"
            aria-label="Tìm đề tài thẩm định"
          />
        </div>

        <div className="flex items-center gap-3">
          <Select
            value={resolvedSemesterValue}
            onValueChange={(val) => {
              setSemesterFilter(val ?? 'ALL');
              resetPage();
            }}
          >
            <SelectTrigger className="w-[260px] text-xs" aria-label="Lọc theo học kỳ">
              <SelectValue>
                {(value) =>
                  value === 'ALL'
                    ? 'Tất cả học kỳ'
                    : (semesters.find((sem) => String(sem.id) === value)?.name ??
                      'Chọn học kỳ')
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL" className="text-xs">
                Tất cả học kỳ
              </SelectItem>
              {semesters.map((sem) => (
                <SelectItem key={sem.id} value={String(sem.id)} className="text-xs">
                  {sem.name} {sem.isActive ? '(Hiện tại)' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {data && (
            <span className="shrink-0 text-xs font-medium text-muted-foreground">
              <strong className="font-bold text-primary">{total}</strong> đề tài
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
          Không tải được danh sách đề tài: {error.message}
        </div>
      )}

      {/* Table */}
      <div className="isolate overflow-hidden rounded-xl border border-slate-300 bg-white shadow-2xs dark:border-neutral-700 dark:bg-[#1e1e1e]">
        {isPending ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
            <Loader2 className="size-6 animate-spin text-primary" />
            <p className="text-sm">Đang tải danh sách đề tài...</p>
          </div>
        ) : topics.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title={
              tab === 'DEPARTMENT'
                ? 'Không còn đề tài nào đang chờ Bộ môn thẩm định.'
                : 'Không tìm thấy đề tài nào.'
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <Table className="w-full min-w-[820px] table-fixed text-left text-sm">
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="w-[42%] px-5 py-3.5">
                    Tên đề tài &amp; Chuyên ngành
                  </TableHead>
                  <TableHead className="w-[22%] px-3 py-3.5">Giảng viên ra đề</TableHead>
                  <TableHead className="w-[14%] px-3 py-3.5">Loại đồ án</TableHead>
                  <TableHead className="w-[12%] px-3 py-3.5">Trạng thái</TableHead>
                  <TableHead className="w-[14%] px-5 py-3.5 text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topics.map((topic) => {
                  const isPendingDepartment =
                    topic.status === 'PENDING_DEPARTMENT' || topic.status === 'PENDING';

                  return (
                    <TableRow
                      key={topic.id}
                      onClick={() => setReviewingTopicId(topic.id)}
                      className="cursor-pointer transition-colors hover:bg-slate-50/70 dark:hover:bg-neutral-800/40"
                    >
                      <TableCell className="space-y-1.5 px-5 py-3.5 align-middle whitespace-normal">
                        <div className="line-clamp-2 text-sm font-semibold leading-snug break-words [overflow-wrap:anywhere]">
                          {topic.title}
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {topic.major && (
                            <Badge
                              variant="outline"
                              className="border-primary/30 px-1.5 py-0 text-[11px] font-normal text-primary"
                            >
                              {topic.major.name}
                            </Badge>
                          )}
                          {topic.fromProposal && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-purple-300 bg-purple-50 px-1.5 py-0 text-[11px] font-medium text-purple-700 dark:border-purple-800 dark:bg-purple-950 dark:text-purple-300">
                              <BookMarked className="size-2.5" />
                              Từ đề xuất SV
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <Users className="size-3 text-muted-foreground/70" />
                            Tối đa {topic.maxStudents} SV
                          </span>
                        </div>
                      </TableCell>

                      <TableCell className="px-3 py-3.5 align-middle text-xs">
                        <div className="font-medium text-foreground">
                          {topic.lecturer.academicTitle
                            ? `${topic.lecturer.academicTitle} ${topic.lecturer.fullName}`
                            : topic.lecturer.fullName}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {topic.semester.name}
                        </div>
                      </TableCell>

                      <TableCell className="px-3 py-3.5 align-middle text-xs font-medium text-muted-foreground">
                        {topic.projectType.name}
                      </TableCell>

                      <TableCell className="px-3 py-3.5 align-middle whitespace-nowrap">
                        <TopicStatusBadge status={topic.status} />
                      </TableCell>

                      <TableCell
                        className="px-5 py-3.5 align-middle text-right whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          size="sm"
                          variant={isPendingDepartment ? 'default' : 'outline'}
                          onClick={() => setReviewingTopicId(topic.id)}
                          className={cn(
                            'cursor-pointer gap-1.5 text-xs',
                            isPendingDepartment &&
                              'bg-orange-600 text-white shadow-xs hover:bg-orange-700',
                          )}
                        >
                          <Eye className="size-3.5" />
                          {isPendingDepartment ? 'Thẩm định' : 'Xem chi tiết'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {data && (
        <PaginationBar
          page={data.page}
          totalPages={data.totalPages}
          total={data.total}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          itemName="đề tài"
        />
      )}

      <TopicReviewModal
        topicId={reviewingTopicId}
        onClose={() => setReviewingTopicId(null)}
        stage={tab === 'ALL' ? 'AUTO' : 'DEPARTMENT'}
        isHeadOfDepartment={isHeadOfDepartment}
        isAdmin={isAdmin}
      />
    </div>
  );
}

