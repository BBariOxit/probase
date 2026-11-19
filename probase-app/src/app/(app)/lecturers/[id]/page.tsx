'use client';

import { use, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Archive,
  ArrowLeft,
  BookOpen,
  Eye,
  Loader2,
  Mail,
  Phone,
  RotateCcw,
  Search,
  X,
} from 'lucide-react';
import { useLecturer } from '@/lib/api/lecturers';
import {
  useActiveSemester,
  useProjectTypes,
  useSemesters,
} from '@/lib/api/master-data';
import { useTopics } from '@/lib/api/topics';
import type { Role, TopicListItem, TopicStatus } from '@/lib/api/types';
import { useSession } from '@/lib/auth/session';
import { useBreadcrumbLabel } from '@/lib/breadcrumb-context';
import { topicHref } from '@/lib/nav';
import { useDebouncedValue } from '@/lib/use-debounced-value';
import {
  cn,
  formatMajorShort,
  formatProjectTypeShort,
  formatSemesterShort,
  sanitizeLecturerName,
} from '@/lib/utils';
import { EmptyState } from '@/components/shared/empty-state';
import { PaginationBar } from '@/components/shared/pagination-bar';
import { StatusPill } from '@/components/shared/status-pill';
import { UserAvatar } from '@/components/shared/user-avatar';
import { TopicDetailSheet } from '@/components/topics/topic-detail-sheet';
import { TopicRegisterButton } from '@/components/topics/topic-register-button';
import { TopicStatusBadge } from '@/components/topics/topic-status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const PAGE_SIZE = 10;

const STUDENT_CURRENT_STATUS_FILTERS = [
  { value: 'ALL', label: 'Tất cả tình trạng' },
  { value: 'OPEN', label: 'Đang mở' },
  { value: 'IN_PROGRESS', label: 'Đang thực hiện' },
  { value: 'COMPLETED', label: 'Hoàn thành' },
] as const;

const STAFF_CURRENT_STATUS_FILTERS = [
  { value: 'ALL', label: 'Tất cả tình trạng' },
  { value: 'PENDING_DEPARTMENT', label: 'Chờ Bộ môn duyệt' },
  { value: 'APPROVED', label: 'Đã duyệt' },
  { value: 'OPEN', label: 'Đang mở' },
  { value: 'IN_PROGRESS', label: 'Đang thực hiện' },
  { value: 'COMPLETED', label: 'Hoàn thành' },
  { value: 'REJECTED', label: 'Bị từ chối' },
] as const;

export default function LecturerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const lecturerId = Number(id);
  const role = useSession((state) => state.user?.role);

  const { data: lecturer, isPending, error } = useLecturer(lecturerId);
  const { data: semesters = [], isPending: isLoadingSemesters } =
    useSemesters();
  const activeSemester = useActiveSemester();
  const { data: projectTypes = [] } = useProjectTypes();

  const [activeTab, setActiveTab] = useState<'current' | 'past'>('current');
  const [selectedTopicId, setSelectedTopicId] = useState<number | null>(null);

  const sanitizedName = lecturer
    ? sanitizeLecturerName(lecturer.fullName, lecturer.academicTitle)
        .displayName
    : undefined;
  useBreadcrumbLabel(id, sanitizedName);

  if (isPending) {
    return (
      <div className="mx-auto max-w-6xl space-y-4">
        <Button
          variant="outline"
          size="sm"
          render={<Link href="/lecturers" />}
          className="gap-1.5"
        >
          <ArrowLeft className="size-4" />
          <span>Danh sách giảng viên</span>
        </Button>
        <div className="flex justify-center rounded-xl border border-slate-300 bg-card py-20 dark:border-neutral-700">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (error || !lecturer) {
    return (
      <div className="mx-auto max-w-6xl space-y-4">
        <Button
          variant="outline"
          size="sm"
          render={<Link href="/lecturers" />}
          className="gap-1.5"
        >
          <ArrowLeft className="size-4" />
          <span>Danh sách giảng viên</span>
        </Button>
        <div className="rounded-xl border border-destructive/30 bg-card p-6 text-sm text-destructive">
          {error?.message ?? 'Không tìm thấy giảng viên.'}
        </div>
      </div>
    );
  }

  const contactable = lecturer.email !== null || lecturer.phone !== null;
  const stats = lecturer.topicStats ?? {
    currentCount: 0,
    openCount: 0,
    pastCount: 0,
  };
  const totalTopics = stats.currentCount + stats.pastCount;
  const majorInfo = formatMajorShort(lecturer.major);
  const pastSemesters = semesters.filter((s) => !s.isActive);

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      {/* Nút quay lại */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          render={<Link href="/lecturers" />}
          className="gap-1.5 border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-neutral-700 dark:bg-[#1e1e1e] dark:text-neutral-200 dark:hover:bg-neutral-800"
        >
          <ArrowLeft className="size-4" />
          <span>Danh sách giảng viên</span>
        </Button>
      </div>

      {/* Khối thông tin giảng viên */}
      <section className="rounded-xl border border-slate-300 bg-card p-5 shadow-2xs sm:p-6 dark:border-neutral-700">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <UserAvatar
              name={lecturer.fullName}
              src={lecturer.avatarUrl}
              className="size-14 shrink-0 text-base font-semibold sm:size-16 sm:text-lg"
            />
            <div className="min-w-0">
              <h1 className="font-heading truncate text-xl font-bold tracking-tight text-slate-900 sm:text-2xl dark:text-neutral-50">
                {sanitizedName}
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-muted-foreground">
                {lecturer.lecturerCode && (
                  <span className="font-mono text-xs font-medium text-slate-600 dark:text-neutral-400">
                    {lecturer.lecturerCode}
                  </span>
                )}
                {lecturer.major && (
                  <>
                    {lecturer.lecturerCode && <span>·</span>}
                    <span
                      className="font-semibold text-slate-800 dark:text-neutral-200"
                      title={majorInfo.full}
                    >
                      {majorInfo.short}
                    </span>
                  </>
                )}
                {lecturer.isHeadOfDepartment && (
                  <>
                    <span>·</span>
                    <span className="font-semibold text-sky-600 dark:text-sky-400">
                      Tổ trưởng Bộ môn
                    </span>
                  </>
                )}
                {!lecturer.isHeadOfDepartment && lecturer.isHomeroomTeacher && (
                  <>
                    <span>·</span>
                    <span className="font-semibold text-amber-600 dark:text-amber-400">
                      Giáo viên chủ nhiệm
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Tổng số đề tài đã ra */}
          <div className="shrink-0 border-t border-border/60 pt-3 sm:border-t-0 sm:pt-0 sm:text-right">
            <div className="text-xs font-medium text-muted-foreground">
              Tổng số đề tài
            </div>
            <div className="mt-0.5 text-base font-semibold text-slate-900 dark:text-neutral-100">
              <span className="text-lg font-bold text-primary">
                {totalTopics}
              </span>{' '}
              đề tài
            </div>
          </div>
        </div>

        {/* Chi tiết chuyên môn & liên hệ */}
        <div className="mt-5 grid gap-6 border-t border-border/60 pt-4 text-sm md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <h2 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Hướng nghiên cứu
            </h2>
            <p className="mt-1.5 leading-relaxed break-words whitespace-pre-line text-slate-700 dark:text-neutral-300">
              {lecturer.researchInterests || (
                <span className="text-muted-foreground">Chưa cập nhật</span>
              )}
            </p>
          </div>

          <div>
            <h2 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Giới thiệu
            </h2>
            <p className="mt-1.5 leading-relaxed break-words whitespace-pre-line text-slate-700 dark:text-neutral-300">
              {lecturer.bio || (
                <span className="text-muted-foreground">Chưa cập nhật</span>
              )}
            </p>
          </div>

          <div>
            <h2 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Liên hệ
            </h2>
            {contactable ? (
              <div className="mt-1.5 flex flex-col gap-1.5 text-slate-700 dark:text-neutral-300">
                {lecturer.email && (
                  <a
                    href={`mailto:${lecturer.email}`}
                    className="inline-flex items-center gap-1.5 font-medium text-primary underline-offset-4 hover:underline"
                  >
                    <Mail className="size-3.5 shrink-0" />
                    <span className="truncate">{lecturer.email}</span>
                  </a>
                )}
                {lecturer.phone && (
                  <span className="inline-flex items-center gap-1.5 font-mono text-xs sm:text-sm">
                    <Phone className="size-3.5 shrink-0 text-muted-foreground" />
                    {lecturer.phone}
                  </span>
                )}
              </div>
            ) : (
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                Email và SĐT chỉ hiển thị với sinh viên thuộc nhóm hướng dẫn.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Tab điều hướng chuẩn gạch chân */}
      <div className="flex items-center gap-8 border-b border-border/60 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('current')}
          className={cn(
            'relative inline-flex cursor-pointer items-center gap-1.5 pb-0.5 text-lg font-bold tracking-tight transition-colors',
            activeTab === 'current'
              ? 'text-foreground after:absolute after:right-0 after:-bottom-3.5 after:left-0 after:h-[3px] after:rounded-full after:bg-primary'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <span>Đề tài hiện tại</span>
          <span
            className={cn(
              'text-sm font-semibold',
              activeTab === 'current'
                ? 'text-primary'
                : 'text-muted-foreground',
            )}
          >
            ({stats.currentCount})
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('past')}
          className={cn(
            'relative inline-flex cursor-pointer items-center gap-1.5 pb-0.5 text-lg font-bold tracking-tight transition-colors',
            activeTab === 'past'
              ? 'text-foreground after:absolute after:right-0 after:-bottom-3.5 after:left-0 after:h-[3px] after:rounded-full after:bg-primary'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <span>Đề tài trong quá khứ</span>
          <span
            className={cn(
              'text-sm font-semibold',
              activeTab === 'past' ? 'text-primary' : 'text-muted-foreground',
            )}
          >
            ({stats.pastCount})
          </span>
        </button>
      </div>

      {/* Nội dung từng Tab */}
      {activeTab === 'current' ? (
        <CurrentTopicsTab
          lecturerId={lecturer.id}
          role={role}
          activeSemesterId={activeSemester?.id}
          isLoadingSemesters={isLoadingSemesters}
          projectTypes={projectTypes}
          onSelectTopic={setSelectedTopicId}
        />
      ) : (
        <PastTopicsTab
          lecturerId={lecturer.id}
          role={role}
          activeSemesterId={activeSemester?.id}
          isLoadingSemesters={isLoadingSemesters}
          pastSemesters={pastSemesters}
          projectTypes={projectTypes}
          onSelectTopic={setSelectedTopicId}
        />
      )}

      {/* Sheet xem nhanh chi tiết đề tài */}
      <TopicDetailSheet
        topicId={selectedTopicId}
        onClose={() => setSelectedTopicId(null)}
        hideRegisterButton={activeTab === 'past'}
      />
    </div>
  );
}

// ── Tab 1: Đề tài hiện tại ──────────────────────────────────────────────────

function CurrentTopicsTab({
  lecturerId,
  role,
  activeSemesterId,
  isLoadingSemesters,
  projectTypes,
  onSelectTopic,
}: {
  lecturerId: number;
  role: Role | undefined;
  activeSemesterId: number | undefined;
  isLoadingSemesters: boolean;
  projectTypes: Array<{ id: number; name: string; code: string }>;
  onSelectTopic: (topicId: number) => void;
}) {
  const isStudent = role === 'STUDENT';
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [projectTypeId, setProjectTypeId] = useState<string>('ALL');
  const [status, setStatus] = useState<string>('ALL');
  const [onlyAvailable, setOnlyAvailable] = useState(false);

  const debouncedSearch = useDebouncedValue(search, 300);

  const statusOptions = isStudent
    ? STUDENT_CURRENT_STATUS_FILTERS
    : STAFF_CURRENT_STATUS_FILTERS;

  const effectiveStatus = onlyAvailable
    ? 'OPEN'
    : status === 'ALL'
      ? undefined
      : (status as TopicStatus);

  const { data, isPending, error } = useTopics(
    {
      lecturerId,
      semesterId: activeSemesterId,
      projectTypeId:
        projectTypeId !== 'ALL' ? Number(projectTypeId) : undefined,
      status: effectiveStatus,
      q: debouncedSearch || undefined,
      page,
      limit: PAGE_SIZE,
    },
    { enabled: !isLoadingSemesters && activeSemesterId !== undefined },
  );

  const topics = useMemo(() => {
    const rawTopics = data?.items ?? [];
    if (!onlyAvailable) return rawTopics;
    return rawTopics.filter((t) => {
      const isTaken =
        Boolean(t.activeGroup) ||
        t.isFull ||
        (t.occupiedSeats ?? 0) >= t.maxStudents ||
        t.status !== 'OPEN';
      const isHeldForOther = Boolean(
        t.fromProposal && t.proposedByMe === false && !isTaken,
      );
      return !isTaken && !isHeldForOther;
    });
  }, [data?.items, onlyAvailable]);

  const isFiltered =
    search !== '' ||
    projectTypeId !== 'ALL' ||
    status !== 'ALL' ||
    onlyAvailable;

  function handleReset() {
    setSearch('');
    setProjectTypeId('ALL');
    setStatus('ALL');
    setOnlyAvailable(false);
    setPage(1);
  }

  if (!isLoadingSemesters && activeSemesterId === undefined) {
    return (
      <div className="rounded-xl border border-slate-300 bg-card dark:border-neutral-700">
        <EmptyState
          icon={BookOpen}
          title="Hiện chưa có học kỳ đang mở."
        />
      </div>
    );
  }

  return (
    <div className="space-y-3.5">
      {/* Bộ lọc đề tài hiện tại */}
      <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
        <div className="relative min-w-52 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400 dark:text-neutral-500" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Tìm tên đề tài…"
            className="h-9.5 rounded-lg border-[1.5px] border-slate-300 bg-white pr-8 pl-9 text-sm text-slate-900 shadow-2xs placeholder:text-slate-400 focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary dark:border-neutral-700 dark:bg-[#1e1e1e] dark:text-neutral-100 dark:placeholder:text-neutral-500"
            aria-label="Tìm đề tài hiện tại"
          />
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setPage(1);
              }}
              className="absolute top-1/2 right-2.5 -translate-y-1/2 cursor-pointer rounded-full p-0.5 text-muted-foreground hover:text-foreground"
              aria-label="Xóa tìm kiếm"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        <Select
          value={projectTypeId}
          onValueChange={(val) => {
            setProjectTypeId((val as string) ?? 'ALL');
            setPage(1);
          }}
        >
          <SelectTrigger
            className="h-9.5 w-48 rounded-lg border-[1.5px] border-slate-300 bg-white text-sm font-medium text-slate-800 shadow-2xs dark:border-neutral-700 dark:bg-[#1e1e1e] dark:text-neutral-200"
            aria-label="Lọc theo loại đồ án"
          >
            <SelectValue>
              {(val) => {
                if (!val || val === 'ALL') return 'Tất cả loại đồ án';
                return (
                  projectTypes.find((pt) => String(pt.id) === String(val))
                    ?.name ?? 'Tất cả loại đồ án'
                );
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="border-slate-300 bg-white shadow-xl dark:border-neutral-700 dark:bg-[#1e1e1e]">
            <SelectItem value="ALL" className="text-sm">
              Tất cả loại đồ án
            </SelectItem>
            {projectTypes.map((pt) => (
              <SelectItem key={pt.id} value={String(pt.id)} className="text-sm">
                {pt.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={onlyAvailable ? 'OPEN' : status}
          disabled={onlyAvailable}
          onValueChange={(val) => {
            setStatus((val as string) ?? 'ALL');
            setPage(1);
          }}
        >
          <SelectTrigger
            className="h-9.5 w-44 rounded-lg border-[1.5px] border-slate-300 bg-white text-sm font-medium text-slate-800 shadow-2xs dark:border-neutral-700 dark:bg-[#1e1e1e] dark:text-neutral-200"
            aria-label="Lọc theo tình trạng"
          >
            <SelectValue>
              {(val) =>
                statusOptions.find((opt) => opt.value === val)?.label ??
                'Tất cả tình trạng'
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="border-slate-300 bg-white shadow-xl dark:border-neutral-700 dark:bg-[#1e1e1e]">
            {statusOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="text-sm">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {isStudent && (
          <button
            type="button"
            role="switch"
            aria-checked={onlyAvailable}
            onClick={() => {
              setOnlyAvailable((prev) => !prev);
              setPage(1);
            }}
            className={cn(
              'inline-flex h-9.5 shrink-0 cursor-pointer items-center gap-2 rounded-lg border px-3 text-xs font-semibold shadow-2xs transition-all select-none sm:text-sm',
              onlyAvailable
                ? 'border-primary bg-primary text-primary-foreground shadow-xs hover:bg-primary/90'
                : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400 dark:border-neutral-700 dark:bg-[#1e1e1e] dark:text-neutral-300 dark:hover:border-neutral-600',
            )}
          >
            <span>Còn trống</span>
            <span
              className={cn(
                'relative inline-flex h-4 w-7 shrink-0 items-center rounded-full p-0.5 transition-colors duration-200',
                onlyAvailable
                  ? 'bg-black/25 ring-1 ring-white/30 dark:bg-black/35'
                  : 'bg-slate-300 dark:bg-neutral-700',
              )}
            >
              <span
                className={cn(
                  'pointer-events-none block size-3 rounded-full bg-white shadow-xs transition-transform duration-200',
                  onlyAvailable ? 'translate-x-3' : 'translate-x-0',
                )}
              />
            </span>
          </button>
        )}

        {isFiltered && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="h-9.5 cursor-pointer px-3 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="mr-1.5 size-4" />
            Đặt lại
          </Button>
        )}

        {data && (
          <div className="ml-auto text-sm font-medium text-slate-600 select-none dark:text-neutral-400">
            <strong className="font-bold text-primary">
              {onlyAvailable ? topics.length : data.total}
            </strong>{' '}
            đề tài
          </div>
        )}
      </div>

      {error && (
        <p className="text-sm text-destructive">
          Không tải được danh sách đề tài hiện tại.
        </p>
      )}

      {/* Bảng đề tài hiện tại */}
      <div className="flex flex-col overflow-hidden rounded-xl border border-slate-300 bg-card shadow-2xs dark:border-neutral-700">
        <div className="overflow-x-auto">
          <Table className="w-full min-w-[780px] text-left text-sm">
            <TableHeader sticky>
              <TableRow className="hover:bg-transparent">
                <TableHead className="min-w-[280px] px-5">
                  Tên đề tài
                </TableHead>
                <TableHead className="w-24 px-3">Loại đồ án</TableHead>
                <TableHead className="w-28 px-3">Chuyên ngành</TableHead>
                <TableHead className="w-28 px-3 text-center">
                  Số lượng
                </TableHead>
                <TableHead className="w-36 px-3 text-center">
                  Tình trạng
                </TableHead>
                <TableHead className="w-36 px-5 text-right">
                  Thao tác
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isPending || isLoadingSemesters ? (
                <TopicTableSkeleton columns={6} />
              ) : topics.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={6} className="p-0">
                    <EmptyState
                      icon={BookOpen}
                      title={
                        isFiltered
                          ? 'Không có đề tài nào khớp bộ lọc.'
                          : 'Giảng viên chưa có đề tài nào trong học kỳ này.'
                      }
                    />
                  </TableCell>
                </TableRow>
              ) : (
                topics.map((topic) => (
                  <CurrentTopicRow
                    key={topic.id}
                    topic={topic}
                    role={role}
                    onSelect={() => onSelectTopic(topic.id)}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {data && data.totalPages > 1 && (
        <PaginationBar
          page={page}
          totalPages={data.totalPages}
          total={data.total}
          pageSize={PAGE_SIZE}
          itemName="đề tài"
          onPageChange={setPage}
        />
      )}
    </div>
  );
}

function CurrentTopicRow({
  topic,
  role,
  onSelect,
}: {
  topic: TopicListItem;
  role: Role | undefined;
  onSelect: () => void;
}) {
  const isStudent = role === 'STUDENT';
  const typeInfo = formatProjectTypeShort(topic.projectType);
  const majorInfo = formatMajorShort(topic.major);
  const isTaken =
    Boolean(topic.activeGroup) ||
    topic.isFull ||
    (topic.occupiedSeats ?? 0) >= topic.maxStudents ||
    topic.status !== 'OPEN';
  const isHeldForOther = Boolean(
    topic.fromProposal && topic.proposedByMe === false && !isTaken,
  );
  const occupied = topic.occupiedSeats ?? 0;

  return (
    <TableRow onClick={onSelect} className="cursor-pointer transition-colors">
      <TableCell className="max-w-[420px] px-5 py-3.5 whitespace-normal">
        {role ? (
          <Link
            href={topicHref(role, topic.id)}
            onClick={(e) => e.stopPropagation()}
            className="line-clamp-2 font-semibold leading-snug break-words text-slate-900 transition-colors [overflow-wrap:anywhere] hover:text-primary dark:text-neutral-100 dark:hover:text-primary"
          >
            {topic.title}
          </Link>
        ) : (
          <span className="line-clamp-2 font-semibold leading-snug text-slate-900 dark:text-neutral-100">
            {topic.title}
          </span>
        )}
      </TableCell>

      <TableCell className="px-3 py-3.5 whitespace-nowrap">
        <span
          className="font-semibold text-slate-800 dark:text-neutral-200"
          title={typeInfo.full}
        >
          {typeInfo.short}
        </span>
      </TableCell>

      <TableCell className="px-3 py-3.5 whitespace-nowrap">
        <span
          className="font-medium text-slate-700 dark:text-neutral-300"
          title={majorInfo.full}
        >
          {majorInfo.short}
        </span>
      </TableCell>

      <TableCell className="px-3 py-3.5 text-center whitespace-nowrap">
        <span className="font-semibold text-primary">
          {occupied > 0 ? `${occupied}/${topic.maxStudents}` : topic.maxStudents}
        </span>{' '}
        <span className="text-xs font-medium text-muted-foreground">SV</span>
      </TableCell>

      <TableCell className="px-3 py-3.5 text-center whitespace-nowrap">
        {isStudent && topic.status === 'OPEN' ? (
          isTaken || isHeldForOther ? (
            <StatusPill label="Đã có nhóm" tone="idle" />
          ) : (
            <StatusPill label="Còn trống" tone="success" />
          )
        ) : (
          <TopicStatusBadge status={topic.status} variant="text" />
        )}
      </TableCell>

      <TableCell
        className="px-5 py-3.5 text-right whitespace-nowrap"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-end gap-2">
          {isStudent &&
            topic.status === 'OPEN' &&
            !isHeldForOther &&
            (topic.canRegister || topic.canJoin) && (
              <TopicRegisterButton topic={topic} idle={null} />
            )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onSelect}
            className="h-8 cursor-pointer px-2.5 text-xs font-medium text-slate-600 hover:text-primary dark:text-neutral-300"
          >
            <Eye className="mr-1 size-3.5" />
            Xem
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

// ── Tab 2: Đề tài trong quá khứ ─────────────────────────────────────────────

function PastTopicsTab({
  lecturerId,
  role,
  activeSemesterId,
  isLoadingSemesters,
  pastSemesters,
  projectTypes,
  onSelectTopic,
}: {
  lecturerId: number;
  role: Role | undefined;
  activeSemesterId: number | undefined;
  isLoadingSemesters: boolean;
  pastSemesters: Array<{ id: number; name: string; code: string }>;
  projectTypes: Array<{ id: number; name: string; code: string }>;
  onSelectTopic: (topicId: number) => void;
}) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [semesterId, setSemesterId] = useState<string>('ALL');
  const [projectTypeId, setProjectTypeId] = useState<string>('ALL');

  const debouncedSearch = useDebouncedValue(search, 300);

  const selectedSemesterId =
    semesterId !== 'ALL' ? Number(semesterId) : undefined;

  const { data, isPending, error } = useTopics(
    {
      lecturerId,
      semesterId: selectedSemesterId,
      excludeSemesterId: selectedSemesterId ? undefined : activeSemesterId,
      projectTypeId:
        projectTypeId !== 'ALL' ? Number(projectTypeId) : undefined,
      q: debouncedSearch || undefined,
      page,
      limit: PAGE_SIZE,
    },
    { enabled: !isLoadingSemesters },
  );

  const topics = data?.items ?? [];
  const isFiltered =
    search !== '' || semesterId !== 'ALL' || projectTypeId !== 'ALL';

  function handleReset() {
    setSearch('');
    setSemesterId('ALL');
    setProjectTypeId('ALL');
    setPage(1);
  }

  return (
    <div className="space-y-3.5">
      {/* Bộ lọc đề tài quá khứ */}
      <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
        <div className="relative min-w-52 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400 dark:text-neutral-500" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Tìm tên đề tài…"
            className="h-9.5 rounded-lg border-[1.5px] border-slate-300 bg-white pr-8 pl-9 text-sm text-slate-900 shadow-2xs placeholder:text-slate-400 focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary dark:border-neutral-700 dark:bg-[#1e1e1e] dark:text-neutral-100 dark:placeholder:text-neutral-500"
            aria-label="Tìm đề tài trong quá khứ"
          />
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setPage(1);
              }}
              className="absolute top-1/2 right-2.5 -translate-y-1/2 cursor-pointer rounded-full p-0.5 text-muted-foreground hover:text-foreground"
              aria-label="Xóa tìm kiếm"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        <Select
          value={semesterId}
          onValueChange={(val) => {
            setSemesterId((val as string) ?? 'ALL');
            setPage(1);
          }}
        >
          <SelectTrigger
            className="h-9.5 w-48 rounded-lg border-[1.5px] border-slate-300 bg-white text-sm font-medium text-slate-800 shadow-2xs dark:border-neutral-700 dark:bg-[#1e1e1e] dark:text-neutral-200"
            aria-label="Lọc theo học kỳ"
          >
            <SelectValue>
              {(val) => {
                if (!val || val === 'ALL') return 'Tất cả học kỳ trước';
                const found = pastSemesters.find(
                  (s) => String(s.id) === String(val),
                );
                return found ? formatSemesterShort(found) : 'Tất cả học kỳ trước';
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="border-slate-300 bg-white shadow-xl dark:border-neutral-700 dark:bg-[#1e1e1e]">
            <SelectItem value="ALL" className="text-sm">
              Tất cả học kỳ trước
            </SelectItem>
            {pastSemesters.map((s) => (
              <SelectItem key={s.id} value={String(s.id)} className="text-sm">
                {formatSemesterShort(s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={projectTypeId}
          onValueChange={(val) => {
            setProjectTypeId((val as string) ?? 'ALL');
            setPage(1);
          }}
        >
          <SelectTrigger
            className="h-9.5 w-48 rounded-lg border-[1.5px] border-slate-300 bg-white text-sm font-medium text-slate-800 shadow-2xs dark:border-neutral-700 dark:bg-[#1e1e1e] dark:text-neutral-200"
            aria-label="Lọc theo loại đồ án"
          >
            <SelectValue>
              {(val) => {
                if (!val || val === 'ALL') return 'Tất cả loại đồ án';
                return (
                  projectTypes.find((pt) => String(pt.id) === String(val))
                    ?.name ?? 'Tất cả loại đồ án'
                );
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="border-slate-300 bg-white shadow-xl dark:border-neutral-700 dark:bg-[#1e1e1e]">
            <SelectItem value="ALL" className="text-sm">
              Tất cả loại đồ án
            </SelectItem>
            {projectTypes.map((pt) => (
              <SelectItem key={pt.id} value={String(pt.id)} className="text-sm">
                {pt.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {isFiltered && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="h-9.5 cursor-pointer px-3 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="mr-1.5 size-4" />
            Đặt lại
          </Button>
        )}

        {data && (
          <div className="ml-auto text-sm font-medium text-slate-600 select-none dark:text-neutral-400">
            <strong className="font-bold text-primary">{data.total}</strong> đề
            tài
          </div>
        )}
      </div>

      {error && (
        <p className="text-sm text-destructive">
          Không tải được danh sách đề tài trong quá khứ.
        </p>
      )}

      {/* Bảng đề tài quá khứ */}
      <div className="flex flex-col overflow-hidden rounded-xl border border-slate-300 bg-card shadow-2xs dark:border-neutral-700">
        <div className="overflow-x-auto">
          <Table className="w-full min-w-[780px] text-left text-sm">
            <TableHeader sticky>
              <TableRow className="hover:bg-transparent">
                <TableHead className="min-w-[280px] px-5">
                  Tên đề tài
                </TableHead>
                <TableHead className="w-36 px-3">Học kỳ</TableHead>
                <TableHead className="w-24 px-3">Loại đồ án</TableHead>
                <TableHead className="w-28 px-3">Chuyên ngành</TableHead>
                <TableHead className="w-24 px-3 text-center">Số SV</TableHead>
                <TableHead className="w-32 px-3 text-center">
                  Trạng thái
                </TableHead>
                <TableHead className="w-24 px-5 text-right">
                  Thao tác
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isPending || isLoadingSemesters ? (
                <TopicTableSkeleton columns={7} />
              ) : topics.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={7} className="p-0">
                    <EmptyState
                      icon={Archive}
                      title={
                        isFiltered
                          ? 'Không có đề tài nào khớp bộ lọc.'
                          : 'Chưa có đề tài nào ở các học kỳ trước.'
                      }
                    />
                  </TableCell>
                </TableRow>
              ) : (
                topics.map((topic) => {
                  const typeInfo = formatProjectTypeShort(topic.projectType);
                  const majorInfo = formatMajorShort(topic.major);

                  return (
                    <TableRow
                      key={topic.id}
                      onClick={() => onSelectTopic(topic.id)}
                      className="cursor-pointer transition-colors"
                    >
                      <TableCell className="max-w-[420px] px-5 py-3.5 whitespace-normal">
                        {role ? (
                          <Link
                            href={topicHref(role, topic.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="line-clamp-2 font-semibold leading-snug break-words text-slate-900 transition-colors [overflow-wrap:anywhere] hover:text-primary dark:text-neutral-100 dark:hover:text-primary"
                          >
                            {topic.title}
                          </Link>
                        ) : (
                          <span className="line-clamp-2 font-semibold leading-snug text-slate-900 dark:text-neutral-100">
                            {topic.title}
                          </span>
                        )}
                      </TableCell>

                      <TableCell className="px-3 py-3.5 font-medium whitespace-nowrap text-slate-700 dark:text-neutral-300">
                        {formatSemesterShort(topic.semester)}
                      </TableCell>

                      <TableCell className="px-3 py-3.5 whitespace-nowrap">
                        <span
                          className="font-semibold text-slate-800 dark:text-neutral-200"
                          title={typeInfo.full}
                        >
                          {typeInfo.short}
                        </span>
                      </TableCell>

                      <TableCell className="px-3 py-3.5 whitespace-nowrap">
                        <span
                          className="font-medium text-slate-700 dark:text-neutral-300"
                          title={majorInfo.full}
                        >
                          {majorInfo.short}
                        </span>
                      </TableCell>

                      <TableCell className="px-3 py-3.5 text-center whitespace-nowrap">
                        <span className="font-semibold text-primary">
                          {topic.maxStudents}
                        </span>{' '}
                        <span className="text-xs font-medium text-muted-foreground">
                          SV
                        </span>
                      </TableCell>

                      <TableCell className="px-3 py-3.5 text-center whitespace-nowrap">
                        <TopicStatusBadge status={topic.status} variant="text" />
                      </TableCell>

                      <TableCell
                        className="px-5 py-3.5 text-right whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => onSelectTopic(topic.id)}
                          className="h-8 cursor-pointer px-2.5 text-xs font-medium text-slate-600 hover:text-primary dark:text-neutral-300"
                        >
                          <Eye className="mr-1 size-3.5" />
                          Xem
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {data && data.totalPages > 1 && (
        <PaginationBar
          page={page}
          totalPages={data.totalPages}
          total={data.total}
          pageSize={PAGE_SIZE}
          itemName="đề tài"
          onPageChange={setPage}
        />
      )}
    </div>
  );
}

function TopicTableSkeleton({ columns }: { columns: number }) {
  return (
    <>
      {Array.from({ length: 5 }).map((_, rowIdx) => (
        <TableRow key={`skeleton-${rowIdx}`} className="hover:bg-transparent">
          <TableCell className="px-5 py-3.5">
            <Skeleton className="mb-1.5 h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </TableCell>
          {Array.from({ length: columns - 1 }).map((_, colIdx) => (
            <TableCell key={colIdx} className="px-3 py-3.5">
              <Skeleton className="h-4 w-16" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}
