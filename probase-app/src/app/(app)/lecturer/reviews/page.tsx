'use client';

import { useMemo, useState } from 'react';
import {
  AlertCircle,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Eye,
  FileCheck2,
  Filter,
  GraduationCap,
  Layers,
  Loader2,
  Search,
  Sparkles,
  Users,
} from 'lucide-react';
import { useSemesters } from '@/lib/api/master-data';
import { useMyProfile } from '@/lib/api/me';
import { useTopics } from '@/lib/api/topics';
import type { TopicListItem } from '@/lib/api/types';
import { useRequireRole } from '@/lib/auth/use-require-role';
import { useSession } from '@/lib/auth/session';
import { DEFAULT_PAGE_SIZE } from '@/constants/pagination.constant';
import { useDebouncedValue } from '@/hooks/use-debounce';
import { usePagination } from '@/hooks/use-pagination';
import { TopicReviewModal } from '@/components/topics/topic-review-modal';
import { TopicStatusBadge } from '@/components/topics/topic-status-badge';
import { EmptyState } from '@/components/shared/empty-state';
import { PaginationBar } from '@/components/shared/pagination-bar';
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
import { cn } from '@/lib/utils';

export default function LecturerTopicReviewsPage() {
  const allowed = useRequireRole('LECTURER');
  const user = useSession((s) => s.user);
  const { data: profile, isLoading: isProfileLoading } = useMyProfile();

  const lecturer = profile?.lecturer;
  const isHeadOfDepartment = lecturer?.isHeadOfDepartment ?? false;
  const isFacultyBoard = lecturer?.isFacultyBoard ?? false;
  const isAcademicAssistant = lecturer?.isAcademicAssistant ?? false;
  const isAdmin = user?.role === 'ADMIN';

  const hasAnyReviewRole =
    isHeadOfDepartment || isFacultyBoard || isAcademicAssistant || isAdmin;

  // Active Tab: TTBM or Faculty Board
  const defaultTab = isHeadOfDepartment ? 'DEPARTMENT' : 'FACULTY';
  const [tab, setTab] = useState<'DEPARTMENT' | 'FACULTY' | 'ALL'>(defaultTab);

  const { page, setPage, pageSize } = usePagination({
    initialPage: 1,
    initialPageSize: DEFAULT_PAGE_SIZE,
  });
  const [semesterId, setSemesterId] = useState<number | undefined>(undefined);
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebouncedValue(searchInput, 300);

  const [reviewingTopicId, setReviewingTopicId] = useState<number | null>(null);

  const { data: semesters = [] } = useSemesters();

  const currentSemesterId = useMemo(() => {
    if (semesterId !== undefined) return semesterId;
    const active = semesters.find((s) => s.isActive);
    return active?.id ?? semesters[0]?.id;
  }, [semesterId, semesters]);

  // Query topics based on tab
  const { data, isPending, error } = useTopics({
    semesterId: currentSemesterId,
    reviewStage: tab,
    // If TTBM viewing department stage, filter to their major
    ...(tab === 'DEPARTMENT' && lecturer?.major?.id
      ? { majorId: lecturer.major.id }
      : {}),
    q: debouncedSearch || undefined,
    page,
    limit: pageSize,
  });

  if (!allowed) return null;

  if (isProfileLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-muted-foreground">
        <Loader2 className="size-8 animate-spin text-primary" />
        <p className="text-sm">Đang xác thực quyền thẩm định chuyên môn...</p>
      </div>
    );
  }

  if (!hasAnyReviewRole) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4">
        <div className="rounded-xl border bg-card p-8 text-center space-y-3">
          <div className="size-12 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 flex items-center justify-center mx-auto">
            <Building2 className="size-6" />
          </div>
          <h2 className="text-lg font-semibold">Khu vực Thẩm định & Phê duyệt Đề tài</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Chức năng này dành riêng cho <strong>Tổ trưởng Bộ môn (TTBM)</strong> thẩm định
            chuyên môn và <strong>Ban Chủ nhiệm Khoa (BCN Khoa)</strong> phê duyệt danh sách chính
            thức trước khi mở đăng ký cho sinh viên.
          </p>
        </div>
      </div>
    );
  }

  const topics = data?.items ?? [];
  const total = data?.total ?? 0;

  return (
    <div className="container max-w-7xl mx-auto py-8 px-4 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
            <Building2 className="size-4" />
            Khoa Công nghệ Thông tin — DLU
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Thẩm định & Phê duyệt Đề tài</h1>
          <p className="text-sm text-muted-foreground">
            Quy trình rà soát tính chuyên môn 2 cấp (Tổ bộ môn CNPM/MMT và Cấp Khoa) theo chuẩn
            BR-04 & BR-05.
          </p>
        </div>

        {/* User Badges */}
        <div className="flex flex-wrap items-center gap-2">
          {isHeadOfDepartment && (
            <Badge variant="secondary" className="gap-1.5 py-1 px-2.5 text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300">
              <Building2 className="size-3.5" />
              Tổ trưởng Bộ môn {lecturer?.major ? `(${lecturer.major.name})` : ''}
            </Badge>
          )}
          {(isFacultyBoard || isAcademicAssistant) && (
            <Badge variant="secondary" className="gap-1.5 py-1 px-2.5 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
              <FileCheck2 className="size-3.5" />
              {isFacultyBoard ? 'Ban Chủ nhiệm Khoa' : 'Giáo vụ Khoa'}
            </Badge>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b pb-2">
        {(isHeadOfDepartment || isAdmin) && (
          <button
            type="button"
            onClick={() => {
              setTab('DEPARTMENT');
              setPage(1);
            }}
            className={cn(
              'inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all',
              tab === 'DEPARTMENT'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            <Building2 className="size-4" />
            Cấp Bộ môn (TTBM)
            {lecturer?.major && (
              <span className="text-xs opacity-80">({lecturer.major.code})</span>
            )}
          </button>
        )}

        {(isFacultyBoard || isAcademicAssistant || isAdmin) && (
          <button
            type="button"
            onClick={() => {
              setTab('FACULTY');
              setPage(1);
            }}
            className={cn(
              'inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all',
              tab === 'FACULTY'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            <FileCheck2 className="size-4" />
            Cấp Khoa (BCN Khoa)
          </button>
        )}

        <button
          type="button"
          onClick={() => {
            setTab('ALL');
            setPage(1);
          }}
          className={cn(
            'inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all',
            tab === 'ALL'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground',
          )}
        >
          <Layers className="size-4" />
          Tất cả đề tài
        </button>
      </div>

      {/* Filter Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              setPage(1);
            }}
            placeholder="Tìm theo tên đề tài, giảng viên..."
            className="pl-9 text-sm"
          />
        </div>

        <div className="flex items-center gap-2">
          <Select
            value={currentSemesterId ? String(currentSemesterId) : undefined}
            onValueChange={(val) => {
              setSemesterId(Number(val));
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[220px] text-xs">
              <SelectValue placeholder="Chọn học kỳ..." />
            </SelectTrigger>
            <SelectContent>
              {semesters.map((sem) => (
                <SelectItem key={sem.id} value={String(sem.id)} className="text-xs">
                  {sem.name} {sem.isActive ? '(Hiện tại)' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table Listing */}
      <div className="rounded-xl border bg-card shadow-xs overflow-hidden">
        {isPending ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="size-6 animate-spin text-primary" />
            <p className="text-sm">Đang tải danh sách đề tài...</p>
          </div>
        ) : topics.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title={
              tab === 'DEPARTMENT'
                ? 'Toàn bộ đề tài thuộc Tổ chuyên môn đã được thẩm định xong.'
                : tab === 'FACULTY'
                  ? 'Tất cả đề tài đã qua Bộ môn duyệt đều đã được Khoa phê duyệt.'
                  : 'Không tìm thấy đề tài nào.'
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="w-[40%]">Tên đề tài & Chuyên ngành</TableHead>
                  <TableHead>Giảng viên ra đề</TableHead>
                  <TableHead>Loại đồ án</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topics.map((topic) => {
                  const isDepStage =
                    topic.status === 'PENDING_DEPARTMENT' || topic.status === 'PENDING';
                  const isFacStage = topic.status === 'PENDING_FACULTY';

                  return (
                    <TableRow key={topic.id} className="hover:bg-muted/30">
                      <TableCell className="space-y-1">
                        <div className="font-semibold text-sm leading-snug line-clamp-2">
                          {topic.title}
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {topic.major && (
                            <Badge
                              variant="outline"
                              className="text-[11px] px-1.5 py-0 font-normal border-primary/30 text-primary"
                            >
                              {topic.major.name}
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                            <Users className="size-3 text-muted-foreground/70" />
                            Tối đa {topic.maxStudents} SV
                          </span>
                        </div>
                      </TableCell>

                      <TableCell className="text-xs">
                        <div className="font-medium text-foreground">
                          {topic.lecturer.academicTitle
                            ? `${topic.lecturer.academicTitle} ${topic.lecturer.fullName}`
                            : topic.lecturer.fullName}
                        </div>
                        <div className="text-muted-foreground text-[11px]">
                          {topic.semester.name}
                        </div>
                      </TableCell>

                      <TableCell className="text-xs font-medium text-muted-foreground">
                        {topic.projectType.name}
                      </TableCell>

                      <TableCell>
                        <TopicStatusBadge status={topic.status} />
                      </TableCell>

                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant={isDepStage || isFacStage ? 'default' : 'outline'}
                          onClick={() => setReviewingTopicId(topic.id)}
                          className={cn(
                            'text-xs gap-1.5',
                            isDepStage &&
                              'bg-orange-600 hover:bg-orange-700 text-white shadow-xs',
                            isFacStage &&
                              'bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs',
                          )}
                        >
                          <Eye className="size-3.5" />
                          {isDepStage
                            ? 'Bộ môn thẩm định'
                            : isFacStage
                              ? 'Khoa phê duyệt'
                              : 'Xem chi tiết'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {total > pageSize && (
          <div className="p-4 border-t">
            <PaginationBar
              page={page}
              totalPages={data?.totalPages ?? 1}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>

      {/* Review & Similarity Modal */}
      <TopicReviewModal
        topicId={reviewingTopicId}
        onClose={() => setReviewingTopicId(null)}
        stage={tab === 'ALL' ? 'AUTO' : tab}
        isHeadOfDepartment={isHeadOfDepartment}
        isFacultyBoard={isFacultyBoard || isAcademicAssistant}
        isAdmin={isAdmin}
      />
    </div>
  );
}
