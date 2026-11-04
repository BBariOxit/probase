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
import { MyGroupBanner } from '@/components/groups/my-group-banner';
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
const MY_COHORT = -1;

export default function StudentTopicsPage() {
  const allowed = useRequireRole('STUDENT');
  const activeSemester = useActiveSemester();
  const { data: rounds } = useMyRounds(activeSemester?.id);
  const { data: projectTypes } = useProjectTypes();
  const { data: myTypes } = useMyEligibleProjectTypes(activeSemester?.id);
  const { data: lecturers } = useTopicLecturers(activeSemester?.id);
  const { data: myGroup } = useMyGroup();

  const [search, setSearch] = useState('');
  const [projectTypeId, setProjectTypeId] = useState(MY_COHORT);
  const [lecturerId, setLecturerId] = useState(ANY);
  const [selectedTopicId, setSelectedTopicId] = useState<number | null>(null);
  const debouncedSearch = useDebounce(search);

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
      forMyCohort: projectTypeId === MY_COHORT,
      projectTypeId:
        projectTypeId === ANY || projectTypeId === MY_COHORT
          ? undefined
          : projectTypeId,
      lecturerId: lecturerId === ANY ? undefined : lecturerId,
      q: debouncedSearch || undefined,
      limit: PAGE_SIZE,
    },
    { enabled: activeSemester !== undefined },
  );

  const topics = data?.pages.flatMap((page) => page.items) ?? [];
  const total = data?.pages[0]?.total ?? 0;

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
  }, [debouncedSearch, projectTypeId, lecturerId]);

  if (!allowed) return null;

  const filtering =
    debouncedSearch !== '' ||
    (projectTypeId !== ANY && projectTypeId !== MY_COHORT) ||
    lecturerId !== ANY;

  const myCohortTypes = myTypes?.map((type) => type.name).join(', ');

  const sanitizedLecturers = (lecturers ?? []).map((l) => ({
    ...l,
    ...sanitizeLecturerName(l.fullName, l.academicTitle),
  }));

  return (
    <div className="space-y-4">
      {/* ── Banner nhóm đã đăng ký ── */}
      {myGroup && <MyGroupBanner group={myGroup} />}

      {/* ── Thông báo tiến trình đợt ── */}
      {rounds?.map((round) => (
        <RegistrationPhaseNotice
          key={round.id}
          subject={rounds.length > 1 ? round.projectType.name : undefined}
          round={round}
          hasGroup={myGroup != null}
        />
      ))}

      {/* ── Khung tìm kiếm & bộ lọc ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <div className="relative min-w-56 flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-slate-400 dark:text-neutral-500" />
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
              }}
              placeholder="Tìm tên đề tài, mô tả…"
              className="pl-9 h-9 text-xs sm:text-sm rounded-lg border-[1.5px] border-[#c4c9d9] dark:border-neutral-700 bg-white dark:bg-[#141414] text-slate-900 dark:text-neutral-100 placeholder:text-slate-400 dark:placeholder:text-neutral-500 focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary"
              aria-label="Tìm đề tài"
            />
          </div>

          <Select
            value={projectTypeId}
            onValueChange={(value) => {
              setProjectTypeId(value as number);
            }}
          >
            <SelectTrigger
              className="h-9 min-w-44 text-xs sm:text-sm rounded-lg border-[1.5px] border-[#c4c9d9] dark:border-neutral-700 bg-white dark:bg-[#141414] text-slate-700 dark:text-neutral-200 focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary"
              aria-label="Lọc theo loại đồ án"
            >
              <SelectValue>
                {(value) => {
                  if (value === MY_COHORT) return 'Khóa của bạn';
                  return (
                    projectTypes?.find((type) => type.id === value)?.name ??
                    'Mọi loại đồ án'
                  );
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-[#1e1e1e] border-slate-200 dark:border-neutral-700">
              <SelectItem value={MY_COHORT}>
                <span className="flex flex-col items-start">
                  <span>Khóa của bạn</span>
                  {myCohortTypes && (
                    <span className="text-[11px] text-muted-foreground">
                      {myCohortTypes}
                    </span>
                  )}
                </span>
              </SelectItem>
              <SelectItem value={ANY}>Mọi loại đồ án</SelectItem>
              {projectTypes?.map((type) => (
                <SelectItem key={type.id} value={type.id}>
                  {type.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={lecturerId}
            onValueChange={(value) => {
              setLecturerId(value as number);
            }}
          >
            <SelectTrigger
              className="h-9 min-w-48 text-xs sm:text-sm rounded-lg border-[1.5px] border-[#c4c9d9] dark:border-neutral-700 bg-white dark:bg-[#141414] text-slate-700 dark:text-neutral-200 focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary"
              aria-label="Lọc theo giảng viên"
            >
              <SelectValue>
                {(value) => {
                  const lecturer = sanitizedLecturers.find((one) => one.id === value);
                  if (!lecturer) return 'Mọi giảng viên';
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
        </div>

        {total > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm font-medium text-slate-600 dark:text-neutral-400 select-none">
              Hiển thị <strong className="text-primary font-bold text-sm">{topics.length}</strong> trong số{' '}
              <strong className="text-primary font-bold text-sm">{total}</strong> đề tài
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
              <TableHead className="min-w-[280px] px-5">Tên đề tài</TableHead>
              <TableHead className="w-52 px-4">Loại đồ án</TableHead>
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
              const isEligibleForTopic = myTypes?.some(
                (t) => t.id === topic.projectTypeId,
              );

              return (
                <TableRow
                  key={topic.id}
                  className="cursor-pointer transition-colors hover:bg-slate-50/70 dark:hover:bg-neutral-800/40"
                  onClick={() => setSelectedTopicId(topic.id)}
                >
                  <TableCell className="px-5 py-3.5">
                    <Link
                      href={`/student/topics/${topic.id}`}
                      className="font-semibold text-slate-900 dark:text-neutral-100 hover:text-primary dark:hover:text-primary transition-colors line-clamp-2"
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

                  <TableCell className="px-4 py-3.5 whitespace-nowrap">
                    <span
                      className={cn(
                        'inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium border',
                        isEligibleForTopic
                          ? 'bg-primary/10 text-primary border-primary/25 font-semibold'
                          : 'bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-400 border-slate-200/80 dark:border-neutral-700/80',
                      )}
                    >
                      {topic.projectType.name}
                    </span>
                  </TableCell>

                  <TableCell className="px-4 py-3.5">
                    <span className="font-medium text-slate-800 dark:text-neutral-200">
                      {lecturerInfo.displayName}
                    </span>
                    {lecturerInfo.departmentRole && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {lecturerInfo.departmentRole}
                      </p>
                    )}
                  </TableCell>

                  <TableCell className="px-4 py-3.5 text-center">
                    <SeatBadge topic={topic} />
                  </TableCell>

                  <TableCell className="px-5 py-3.5 text-right whitespace-nowrap">
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
                  <TableCell className="px-5 py-3.5">
                    <Skeleton className="h-4 w-3/4 mb-1.5" />
                    <Skeleton className="h-3 w-1/2" />
                  </TableCell>
                  <TableCell className="px-4 py-3.5">
                    <Skeleton className="h-6 w-28 rounded-md" />
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
                  <TableCell className="px-5 py-3.5">
                    <Skeleton className="h-4 w-3/4 mb-1.5" />
                    <Skeleton className="h-3 w-1/2" />
                  </TableCell>
                  <TableCell className="px-4 py-3.5">
                    <Skeleton className="h-6 w-28 rounded-md" />
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
                filtering
                  ? 'Không có đề tài nào khớp bộ lọc.'
                  : projectTypeId === MY_COHORT
                    ? 'Chưa có đề tài nào mở cho khóa của bạn. Chọn "Mọi loại đồ án" để xem toàn bộ.'
                    : 'Chưa có đề tài nào được mở đăng ký.'
              }
            />
          </div>
        )}

        {!hasNextPage && topics.length > 0 && !isFetchingNextPage && (
          <div className="py-4 text-center text-xs text-muted-foreground select-none border-t border-slate-200/80 dark:border-neutral-700/80">
            Đã hiển thị tất cả {total} đề tài
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
