'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { BookOpen, Copy, Eye, MoreHorizontal, Search } from 'lucide-react';
import { toast } from 'sonner';
import {
  useActiveSemester,
  useMyEligibleProjectTypes,
  useMyRounds,
  useProjectTypes,
} from '@/lib/api/master-data';
import { useMyGroup } from '@/lib/api/registration';
import { useInfiniteTopics, useTopicLecturers } from '@/lib/api/topics';
import { useRequireRole } from '@/lib/auth/use-require-role';
import { useDebounce } from '@/hooks';
import { cn, sanitizeLecturerName } from '@/lib/utils';
import { EmptyState } from '@/components/shared/empty-state';
import { RegistrationPhaseNotice } from '@/components/rounds/registration-phase-notice';
import { SeatBadge } from '@/components/groups/seat-indicator';
import { TopicRegisterButton } from '@/components/topics/topic-register-button';
import { TopicDetailSheet } from '@/components/topics/topic-detail-sheet';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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

const PAGE_SIZE = 12;
const ANY = 0;

function getProjectTypeAbbr(projectType: { name: string; code?: string }): {
  short: string;
  full: string;
} {
  const code = projectType.code?.toUpperCase() ?? '';
  const name = projectType.name ?? '';

  if (
    code === 'DATN' ||
    name.toLowerCase().includes('khóa luận') ||
    name.toLowerCase().includes('tốt nghiệp')
  ) {
    return { short: 'KLTN', full: name || 'Khóa luận tốt nghiệp' };
  }
  if (code === 'DACN' || name.toLowerCase().includes('chuyên ngành')) {
    return { short: 'ĐACN', full: name || 'Đồ án chuyên ngành' };
  }
  if (code === 'DACS' || name.toLowerCase().includes('cơ sở')) {
    return { short: 'ĐACS', full: name || 'Đồ án cơ sở' };
  }
  return { short: projectType.code || name, full: name };
}

export default function StudentTopicsPage() {
  const allowed = useRequireRole('STUDENT');
  const activeSemester = useActiveSemester();
  const { data: rounds } = useMyRounds(activeSemester?.id);
  const { data: projectTypes } = useProjectTypes();
  const { data: myTypes } = useMyEligibleProjectTypes(activeSemester?.id);
  const { data: lecturers } = useTopicLecturers(activeSemester?.id);
  const { data: myGroup } = useMyGroup();

  const [search, setSearch] = useState('');
  const [projectTypeId, setProjectTypeId] = useState<number | null>(null);
  const userChangedTypeRef = useRef(false);
  const [lecturerId, setLecturerId] = useState(ANY);
  const [onlyAvailable, setOnlyAvailable] = useState(true);
  const [selectedTopicId, setSelectedTopicId] = useState<number | null>(null);
  const debouncedSearch = useDebounce(search);

  // Set default project type to the student's eligible type as soon as myTypes loads
  useEffect(() => {
    if (userChangedTypeRef.current) return;
    if (myTypes && myTypes.length > 0) {
      setProjectTypeId(myTypes[0].id);
    } else if (myTypes && myTypes.length === 0) {
      setProjectTypeId(ANY);
    }
  }, [myTypes]);

  const effectiveProjectTypeId = projectTypeId ?? myTypes?.[0]?.id ?? ANY;

  const {
    data,
    isPending,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    error,
  } = useInfiniteTopics(
    {
      status: 'OPEN',
      semesterId: activeSemester?.id,
      projectTypeId:
        effectiveProjectTypeId === ANY ? undefined : effectiveProjectTypeId,
      lecturerId: lecturerId === ANY ? undefined : lecturerId,
      q: debouncedSearch || undefined,
      limit: PAGE_SIZE,
    },
    { enabled: activeSemester !== undefined },
  );

  const rawTopics = data?.pages.flatMap((page) => page.items) ?? [];
  const rawTotal = data?.pages[0]?.total ?? 0;

  // Filter topics for "Còn trống" (topics that have no group or where join is still open)
  const topics = onlyAvailable
    ? rawTopics.filter(
        (t) => !t.isFull && (t.activeGroup === null || t.canJoin),
      )
    : rawTopics;

  const sentinelRef = useRef<HTMLDivElement>(null);
  const restoredRef = useRef(false);

  // ── Infinite scroll observer: load more when near bottom ──
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      {
        root: null,
        rootMargin: '400px', // Fetch well before hitting the exact bottom
      },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Extra scroll listener guarantee
  useEffect(() => {
    function handleScroll() {
      if (!hasNextPage || isFetchingNextPage) return;
      const scrollBottom =
        document.documentElement.scrollHeight -
        (window.scrollY + window.innerHeight);
      if (scrollBottom < 600) {
        fetchNextPage();
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // ── Preserve scroll position when navigating to detail and returning ──
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    const saveScroll = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        if (window.scrollY > 0) {
          sessionStorage.setItem(
            'student_topics_scroll_y',
            String(window.scrollY),
          );
        }
      }, 150);
    };

    window.addEventListener('scroll', saveScroll, { passive: true });
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('scroll', saveScroll);
    };
  }, []);

  // Restore scroll position after topics load
  useEffect(() => {
    if (restoredRef.current) return;
    const savedY = sessionStorage.getItem('student_topics_scroll_y');
    if (savedY && topics.length > 0) {
      const targetY = parseInt(savedY, 10);
      if (!isNaN(targetY) && targetY > 0) {
        restoredRef.current = true;
        requestAnimationFrame(() => {
          window.scrollTo({ top: targetY, behavior: 'instant' });
        });
      }
    }
  }, [topics.length]);

  // Reset scroll and saved position when user changes filter or search
  useEffect(() => {
    sessionStorage.removeItem('student_topics_scroll_y');
    restoredRef.current = true;
  }, [debouncedSearch, effectiveProjectTypeId, lecturerId, onlyAvailable]);

  if (!allowed) return null;

  const filtering =
    debouncedSearch !== '' ||
    effectiveProjectTypeId !== ANY ||
    lecturerId !== ANY ||
    !onlyAvailable;

  const sanitizedLecturers = (lecturers ?? []).map((l) => ({
    ...l,
    ...sanitizeLecturerName(l.fullName, l.academicTitle),
  }));

  return (
    <div className="space-y-4">
      {/* ── Thông báo tiến trình đợt ── */}
      {rounds?.map((round) => (
        <RegistrationPhaseNotice
          key={round.id}
          subject={rounds.length > 1 ? round.projectType.name : undefined}
          round={round}
          hasGroup={myGroup != null}
        />
      ))}

      {/* ── Khung tìm kiếm & bộ lọc: [Tìm tên đề tài...] [Loại đồ án ▾] [Giảng viên ▾] [Còn trống 🔘] ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          {/* 1. Tìm tên đề tài */}
          <div className="relative min-w-56 flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-slate-400 dark:text-neutral-500" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm tên đề tài…"
              className="pl-9 h-9 text-xs sm:text-sm rounded-lg border-[1.5px] border-[#c4c9d9] dark:border-neutral-700 bg-white dark:bg-[#141414] text-slate-900 dark:text-neutral-100 placeholder:text-slate-400 dark:placeholder:text-neutral-500 focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary"
              aria-label="Tìm tên đề tài"
            />
          </div>

          {/* 2. Loại đồ án ▾ (KLTN / DACN / DACS) */}
          <Select
            value={effectiveProjectTypeId}
            onValueChange={(val) => {
              userChangedTypeRef.current = true;
              setProjectTypeId(val as number);
            }}
          >
            <SelectTrigger
              className="h-9 min-w-36 text-xs sm:text-sm rounded-lg border-[1.5px] border-[#c4c9d9] dark:border-neutral-700 bg-white dark:bg-[#141414] text-slate-700 dark:text-neutral-200 focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary"
              aria-label="Lọc theo loại đồ án"
            >
              <SelectValue>
                {(val) => {
                  if (!val || val === ANY) return 'Tất cả loại đồ án';
                  const type = projectTypes?.find((t) => t.id === val);
                  if (!type) return 'Loại đồ án';
                  return getProjectTypeAbbr(type).short;
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-[#1e1e1e] border-slate-200 dark:border-neutral-700">
              <SelectItem value={ANY}>Tất cả loại đồ án</SelectItem>
              {projectTypes?.map((type) => {
                const abbr = getProjectTypeAbbr(type);
                return (
                  <SelectItem key={type.id} value={type.id}>
                    <span className="font-medium">{abbr.short}</span>
                    <span className="text-xs text-muted-foreground ml-2">
                      ({abbr.full})
                    </span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>

          {/* 3. Giảng viên ▾ */}
          <Select
            value={lecturerId}
            onValueChange={(val) => setLecturerId(val as number)}
          >
            <SelectTrigger
              className="h-9 min-w-44 text-xs sm:text-sm rounded-lg border-[1.5px] border-[#c4c9d9] dark:border-neutral-700 bg-white dark:bg-[#141414] text-slate-700 dark:text-neutral-200 focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary"
              aria-label="Lọc theo giảng viên"
            >
              <SelectValue>
                {(val) => {
                  const lecturer = sanitizedLecturers.find((one) => one.id === val);
                  if (!lecturer || val === ANY) return 'Mọi giảng viên';
                  return lecturer.displayName;
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="min-w-[220px] w-max bg-white dark:bg-[#1e1e1e] border-slate-200 dark:border-neutral-700">
              <SelectItem value={ANY}>Mọi giảng viên</SelectItem>
              {sanitizedLecturers.map((lecturer) => (
                <SelectItem key={lecturer.id} value={lecturer.id}>
                  {lecturer.displayName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* 4. Còn trống 🔘 (Toggle switch) */}
          <button
            type="button"
            role="switch"
            aria-checked={onlyAvailable}
            onClick={() => setOnlyAvailable((prev) => !prev)}
            className={cn(
              'inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-xs sm:text-sm font-medium transition-colors cursor-pointer select-none',
              onlyAvailable
                ? 'border-primary/50 bg-primary/10 text-primary'
                : 'border-[#c4c9d9] dark:border-neutral-700 bg-white dark:bg-[#141414] text-slate-600 dark:text-neutral-400 hover:border-slate-400 dark:hover:border-neutral-600',
            )}
            title={onlyAvailable ? 'Đang chỉ hiện đề tài còn trống' : 'Nhấn để chỉ hiện đề tài còn trống'}
          >
            <span>Còn trống</span>
            <span
              className={cn(
                'relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out',
                onlyAvailable ? 'bg-primary' : 'bg-slate-300 dark:bg-neutral-700',
              )}
            >
              <span
                className={cn(
                  'pointer-events-none inline-block size-3 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out',
                  onlyAvailable ? 'translate-x-3' : 'translate-x-0',
                )}
              />
            </span>
          </button>
        </div>

        {rawTotal > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm font-medium text-slate-600 dark:text-neutral-400 select-none">
              Hiển thị <strong className="text-primary font-bold text-sm">{topics.length}</strong> trong số{' '}
              <strong className="text-primary font-bold text-sm">{rawTotal}</strong> đề tài
            </span>
          </div>
        )}
      </div>

      {error && (
        <div className="p-6 text-center text-sm text-destructive">
          Không tải được danh sách đề tài. Vui lòng thử lại sau.
        </div>
      )}

      {/* ── Bảng dữ liệu dùng chung (Shared Table Component) ── */}
      <div className="flex flex-col rounded-xl border border-slate-300 dark:border-neutral-700 bg-card shadow-2xs overflow-hidden">
        <Table className="relative w-full text-left text-sm">
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[280px] max-w-[380px] w-[380px] px-5">Tên đề tài</TableHead>
              <TableHead className="w-28 px-4">Loại đồ án</TableHead>
              <TableHead className="w-56 px-4">Cán bộ hướng dẫn</TableHead>
              <TableHead className="w-40 px-4 text-center">Tình trạng</TableHead>
              <TableHead className="w-44 px-5 text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {topics.map((topic) => {
              const lecturerInfo = sanitizeLecturerName(
                topic.lecturer.fullName,
                topic.lecturer.academicTitle,
              );
              const typeInfo = getProjectTypeAbbr(topic.projectType);

              return (
                <TableRow
                  key={topic.id}
                  className="cursor-pointer transition-colors hover:bg-slate-50/70 dark:hover:bg-neutral-800/40"
                  onClick={() => setSelectedTopicId(topic.id)}
                >
                  <TableCell className="min-w-[280px] max-w-[380px] w-[380px] px-5 py-3.5 align-middle">
                    <Link
                      href={`/student/topics/${topic.id}`}
                      className="font-semibold text-slate-900 dark:text-neutral-100 hover:text-primary dark:hover:text-primary transition-colors leading-snug break-words"
                      onClick={(e) => {
                        if (!e.metaKey && !e.ctrlKey) {
                          e.preventDefault();
                          setSelectedTopicId(topic.id);
                        }
                      }}
                    >
                      {topic.title}
                    </Link>
                  </TableCell>

                  <TableCell className="w-28 px-4 py-3.5 align-middle">
                    <span
                      className="font-medium text-slate-700 dark:text-neutral-300"
                      title={typeInfo.full}
                    >
                      {typeInfo.short}
                    </span>
                  </TableCell>

                  <TableCell className="px-4 py-3.5 align-middle">
                    <span className="font-medium text-slate-800 dark:text-neutral-200">
                      {lecturerInfo.displayName}
                    </span>
                    {lecturerInfo.departmentRole && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {lecturerInfo.departmentRole}
                      </p>
                    )}
                  </TableCell>

                  <TableCell className="px-4 py-3.5 text-center align-middle">
                    <SeatBadge topic={topic} />
                  </TableCell>

                  <TableCell className="px-5 py-3.5 text-right whitespace-nowrap align-middle">
                    <div
                      className="flex items-center justify-end gap-1.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <TopicRegisterButton
                        topic={topic}
                        idle={
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled
                            className="text-xs cursor-not-allowed opacity-50 border-slate-300 dark:border-neutral-700 bg-transparent text-slate-400 dark:text-neutral-500 select-none"
                          >
                            Đăng ký
                          </Button>
                        }
                      />
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`Thao tác khác cho đề tài ${topic.title}`}
                              className="text-slate-500 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-neutral-100"
                            >
                              <MoreHorizontal className="size-4" />
                            </Button>
                          }
                        />
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem
                            onClick={() => setSelectedTopicId(topic.id)}
                          >
                            <Eye className="size-4 shrink-0 text-slate-500 dark:text-neutral-400" />
                            <span>Xem chi tiết</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              const url = `${window.location.origin}/student/topics/${topic.id}`;
                              navigator.clipboard.writeText(url);
                              toast.success('Đã sao chép liên kết đề tài');
                            }}
                          >
                            <Copy className="size-4 shrink-0 text-slate-500 dark:text-neutral-400" />
                            <span>Sao chép liên kết</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}

            {/* Skeleton initial loading */}
            {isPending &&
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={`skeleton-init-${i}`} className="hover:bg-transparent">
                  <TableCell className="min-w-[280px] max-w-[380px] w-[380px] px-5 py-3.5">
                    <Skeleton className="h-4 w-3/4 mb-1.5" />
                    <Skeleton className="h-3 w-1/2" />
                  </TableCell>
                  <TableCell className="w-28 px-4 py-3.5">
                    <Skeleton className="h-4 w-12" />
                  </TableCell>
                  <TableCell className="px-4 py-3.5">
                    <Skeleton className="h-4 w-32 mb-1" />
                    <Skeleton className="h-3 w-20" />
                  </TableCell>
                  <TableCell className="px-4 py-3.5 text-center">
                    <div className="flex justify-center">
                      <Skeleton className="h-6 w-24 rounded-full" />
                    </div>
                  </TableCell>
                  <TableCell className="px-5 py-3.5 text-right">
                    <div className="flex justify-end gap-1.5">
                      <Skeleton className="h-8 w-20 rounded-md" />
                      <Skeleton className="h-8 w-8 rounded-md" />
                    </div>
                  </TableCell>
                </TableRow>
              ))}

            {/* Skeleton loading more (appended to existing rows) */}
            {isFetchingNextPage &&
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={`skeleton-more-${i}`} className="hover:bg-transparent">
                  <TableCell className="min-w-[280px] max-w-[380px] w-[380px] px-5 py-3.5">
                    <Skeleton className="h-4 w-3/4 mb-1.5" />
                    <Skeleton className="h-3 w-1/2" />
                  </TableCell>
                  <TableCell className="w-28 px-4 py-3.5">
                    <Skeleton className="h-4 w-12" />
                  </TableCell>
                  <TableCell className="px-4 py-3.5">
                    <Skeleton className="h-4 w-32 mb-1" />
                    <Skeleton className="h-3 w-20" />
                  </TableCell>
                  <TableCell className="px-4 py-3.5 text-center">
                    <div className="flex justify-center">
                      <Skeleton className="h-6 w-24 rounded-full" />
                    </div>
                  </TableCell>
                  <TableCell className="px-5 py-3.5 text-right">
                    <div className="flex justify-end gap-1.5">
                      <Skeleton className="h-8 w-20 rounded-md" />
                      <Skeleton className="h-8 w-8 rounded-md" />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>

        {/* Sentinel element to trigger fetchNextPage when scrolled near */}
        <div ref={sentinelRef} className="h-1 w-full" aria-hidden="true" />

        {!isPending && topics.length === 0 && (
          <div className="py-12">
            <EmptyState
              icon={BookOpen}
              title={
                onlyAvailable && rawTopics.length > 0
                  ? 'Tất cả đề tài hiện tại đã có nhóm nhận. Tắt nút "Còn trống" để xem toàn bộ danh sách.'
                  : filtering
                    ? 'Không có đề tài nào khớp bộ lọc.'
                    : 'Chưa có đề tài nào được mở đăng ký.'
              }
            />
          </div>
        )}

        {!hasNextPage && topics.length > 0 && !isFetchingNextPage && (
          <div className="py-4 text-center text-xs text-muted-foreground select-none border-t border-slate-200/80 dark:border-neutral-700/80">
            Đã hiển thị tất cả {rawTotal} đề tài
          </div>
        )}
      </div>

      {/* ── Sheet chi tiết đề tài ── */}
      <TopicDetailSheet
        topicId={selectedTopicId}
        onClose={() => setSelectedTopicId(null)}
      />
    </div>
  );
}
