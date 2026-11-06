'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  BookOpen,
  CalendarClock,
  Copy,
  Eye,
  Loader2,
  MoreHorizontal,
  RotateCcw,
  Search,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  useActiveSemester,
  useMyEligibleProjectTypes,
  useMyRounds,
  useProjectTypes,
} from '@/lib/api/master-data';
import { useMyGroup, useSwitchTopic } from '@/lib/api/registration';
import { useInfiniteTopics, useTopicLecturers } from '@/lib/api/topics';
import { useRequireRole } from '@/lib/auth/use-require-role';
import { useDebounce } from '@/hooks';
import { cn, sanitizeLecturerName } from '@/lib/utils';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { EmptyState } from '@/components/shared/empty-state';
import { LecturerCombobox } from '@/components/shared/lecturer-combobox';
import { RegistrationPhaseNotice } from '@/components/rounds/registration-phase-notice';
import { StatusPill } from '@/components/shared/status-pill';
import { TopicRegisterButton } from '@/components/topics/topic-register-button';
import { TopicDetailSheet } from '@/components/topics/topic-detail-sheet';
import type { TopicListItem } from '@/lib/api/types';
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

function StudentTopicsContent() {
  const allowed = useRequireRole('STUDENT');
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeSemester = useActiveSemester();
  const { data: rounds } = useMyRounds(activeSemester?.id);
  const { data: projectTypes } = useProjectTypes();
  const { data: myTypes } = useMyEligibleProjectTypes(activeSemester?.id);
  const { data: lecturers } = useTopicLecturers(activeSemester?.id);
  const { data: myGroup } = useMyGroup();

  const switchTopicForGroupId = searchParams.get('switchTopicForGroup');
  const isSwitchingTopic = Boolean(
    switchTopicForGroupId &&
      myGroup &&
      String(myGroup.id) === switchTopicForGroupId &&
      myGroup.isLeader,
  );
  const switchTopicMutation = useSwitchTopic(myGroup?.id ?? 0);
  const [topicToSwitch, setTopicToSwitch] = useState<TopicListItem | null>(null);

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
      status: onlyAvailable ? 'OPEN' : undefined,
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

  // Filter topics for "Còn trống" & lecturerId guarantee
  const topics = rawTopics.filter((t) => {
    const isTaken =
      Boolean(t.activeGroup) ||
      t.isFull ||
      (t.occupiedSeats ?? 0) >= t.maxStudents ||
      t.status !== 'OPEN';

    if (onlyAvailable && isTaken) {
      return false;
    }
    if (lecturerId !== ANY && t.lecturer?.id !== lecturerId) {
      return false;
    }
    return true;
  });

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

  return (
    <div className="space-y-4">
      {/* ── Banner đổi đề tài cho nhóm ── */}
      {isSwitchingTopic && myGroup && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-white">
              <RotateCcw className="size-4.5" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-neutral-100">
                Đang đổi đề tài cho nhóm ({myGroup.members.length} thành viên)
              </p>
              <p className="text-xs text-slate-600 dark:text-neutral-400">
                Đề tài hiện tại: <span className="font-semibold text-slate-800 dark:text-neutral-200">{myGroup.topic.title}</span>. Chọn một đề tài còn trống bên dưới để đổi sang.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/student/groups')}
            className="shrink-0 h-8.5 text-xs font-semibold"
          >
            Hủy đổi đề tài
          </Button>
        </div>
      )}

      {/* ── Thông báo tiến trình đợt ── */}
      {rounds?.map((round) => (
        <RegistrationPhaseNotice
          key={round.id}
          subject={rounds.length > 1 ? round.projectType.name : undefined}
          round={round}
          hasGroup={myGroup != null}
        />
      ))}
      {activeSemester && rounds && rounds.length === 0 && (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-slate-300 dark:border-neutral-700 bg-white px-4 py-3 shadow-2xs dark:bg-[#1e1e1e]">
          <div className="flex items-start gap-3">
            <CalendarClock className="mt-0.5 size-4.5 shrink-0 text-primary" />
            <div className="space-y-0.5 text-sm">
              <p className="font-semibold text-slate-900 dark:text-neutral-100">
                Chưa mở đợt đăng ký đề tài
              </p>
              <p className="text-xs text-slate-500 dark:text-neutral-400">
                Hiện tại chưa có đợt đăng ký nào được mở cho học kỳ này. Bạn có thể xem trước danh sách đề tài.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Khung tìm kiếm & bộ lọc: [Tìm tên đề tài...] [Loại đồ án ▾] [Giảng viên ▾] [Còn trống 🔘] ── */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 sm:gap-3">
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          {/* 1. Tìm tên đề tài */}
          <div className="relative w-56 sm:w-64 max-w-xs shrink-0">
            <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-slate-400 dark:text-neutral-500" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm tên đề tài…"
              className="pl-9 h-9 text-xs sm:text-sm rounded-lg border-[1.5px] border-slate-300 dark:border-neutral-700 bg-white dark:bg-[#141414] text-slate-900 dark:text-neutral-100 placeholder:text-slate-400 dark:placeholder:text-neutral-500 focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary shadow-2xs"
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
              className="h-9 w-32 sm:w-36 shrink-0 text-xs sm:text-sm font-medium rounded-lg border-[1.5px] border-slate-300 dark:border-neutral-700 bg-white dark:bg-[#141414] text-slate-800 dark:text-neutral-200 focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary shadow-2xs"
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
            <SelectContent className="w-auto min-w-[270px] whitespace-nowrap bg-white dark:bg-[#1e1e1e] border-slate-300 dark:border-neutral-700 shadow-xl">
              <SelectItem value={ANY}>Tất cả loại đồ án</SelectItem>
              {projectTypes?.map((type) => {
                const abbr = getProjectTypeAbbr(type);
                return (
                  <SelectItem key={type.id} value={type.id}>
                    <span className="font-semibold text-slate-900 dark:text-neutral-100">
                      {abbr.full}
                    </span>
                    <span className="text-muted-foreground font-normal">
                      ({abbr.short})
                    </span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>

          {/* 3. Giảng viên ▾ (Combobox tìm kiếm) */}
          <LecturerCombobox
            lecturers={lecturers ?? []}
            value={lecturerId}
            onChange={setLecturerId}
            className="w-48 sm:w-52 shrink-0"
            triggerClassName="h-9 w-full text-xs sm:text-sm font-medium rounded-lg border border-slate-300 dark:border-neutral-700 bg-white dark:bg-[#1e1e1e] text-slate-800 dark:text-neutral-200 focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary shadow-2xs"
          />

          {/* 4. Còn trống 🔘 (Toggle switch with solid primary background when ON) */}
          <button
            type="button"
            role="switch"
            aria-checked={onlyAvailable}
            onClick={() => setOnlyAvailable((prev) => !prev)}
            className={cn(
              'inline-flex h-9 shrink-0 items-center gap-2 rounded-lg border px-3 text-xs sm:text-sm font-semibold transition-all cursor-pointer select-none shadow-2xs',
              onlyAvailable
                ? 'border-primary bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs'
                : 'border-slate-300 dark:border-neutral-700 bg-white dark:bg-[#1e1e1e] text-slate-700 dark:text-neutral-300 hover:border-slate-400 dark:hover:border-neutral-600',
            )}
            title={onlyAvailable ? 'Đang lọc đề tài còn trống (nhấn để tắt)' : 'Nhấn để chỉ hiện đề tài còn trống'}
          >
            <span>Còn trống</span>
            <span
              className={cn(
                'relative inline-flex h-4 w-7 shrink-0 items-center rounded-full p-0.5 transition-colors duration-200 ease-in-out',
                onlyAvailable
                  ? 'bg-black/25 dark:bg-black/35 ring-1 ring-white/30'
                  : 'bg-slate-300 dark:bg-neutral-700',
              )}
            >
              <span
                className={cn(
                  'pointer-events-none block size-3 rounded-full bg-white shadow-xs transition-transform duration-200 ease-in-out',
                  onlyAvailable ? 'translate-x-3' : 'translate-x-0',
                )}
              />
            </span>
          </button>
        </div>

        {topics.length > 0 && (
          <span className="text-xs sm:text-sm font-medium text-slate-600 dark:text-neutral-400 select-none ml-auto">
            <strong className="text-primary font-bold text-sm">{topics.length}</strong> đề tài
          </span>
        )}
      </div>

      {error && (
        <div className="p-6 text-center text-sm text-destructive">
          Không tải được danh sách đề tài. Vui lòng thử lại sau.
        </div>
      )}

      {/* ── Bảng dữ liệu dùng chung (Shared Table Component) ── */}
      <div className="flex flex-col rounded-xl border border-slate-300 dark:border-neutral-700 bg-card shadow-2xs overflow-hidden">
        <Table className="relative w-full min-w-[850px] table-fixed text-left text-sm">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[340px] max-w-[340px] px-5">Tên đề tài</TableHead>
              <TableHead className="w-24 px-3 whitespace-nowrap">Loại đồ án</TableHead>
              <TableHead className="w-24 px-3 text-center whitespace-nowrap">Số lượng</TableHead>
              <TableHead className="w-44 px-3 whitespace-nowrap">Cán bộ hướng dẫn</TableHead>
              <TableHead className="w-32 px-3 text-center whitespace-nowrap">Tình trạng</TableHead>
              <TableHead className="w-32 px-5 text-right whitespace-nowrap">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {topics.map((topic) => {
              const lecturerInfo = sanitizeLecturerName(
                topic.lecturer.fullName,
                topic.lecturer.academicTitle,
              );
              const typeInfo = getProjectTypeAbbr(topic.projectType);
              const isTaken =
                Boolean(topic.activeGroup) ||
                topic.isFull ||
                (topic.occupiedSeats ?? 0) >= topic.maxStudents ||
                topic.status !== 'OPEN';

              return (
                <TableRow
                  key={topic.id}
                  className="cursor-pointer transition-colors hover:bg-slate-50/70 dark:hover:bg-neutral-800/40"
                  onClick={() => setSelectedTopicId(topic.id)}
                >
                  <TableCell className="w-[340px] max-w-[340px] px-5 py-3.5 align-middle whitespace-normal">
                    <div className="w-full max-w-[340px] whitespace-normal">
                      <Link
                        href={`/student/topics/${topic.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="block font-bold text-slate-900 dark:text-neutral-100 hover:text-primary dark:hover:text-primary transition-colors leading-snug break-words whitespace-normal line-clamp-2"
                      >
                        {topic.title}
                      </Link>
                    </div>
                  </TableCell>

                  <TableCell className="w-24 px-3 py-3.5 align-middle whitespace-nowrap">
                    <span
                      className="font-semibold text-slate-800 dark:text-neutral-200"
                      title={typeInfo.full}
                    >
                      {typeInfo.short}
                    </span>
                  </TableCell>

                  <TableCell className="w-24 px-3 py-3.5 text-center align-middle whitespace-nowrap">
                    <span className="font-semibold text-primary">
                      {topic.maxStudents}
                    </span>{' '}
                    <span className="font-medium text-slate-600 dark:text-neutral-400">
                      SV
                    </span>
                  </TableCell>

                  <TableCell className="w-44 px-3 py-3.5 align-middle whitespace-nowrap">
                    <span className="font-medium text-slate-900 dark:text-neutral-100">
                      {lecturerInfo.displayName}
                    </span>
                    {lecturerInfo.departmentRole && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {lecturerInfo.departmentRole}
                      </p>
                    )}
                  </TableCell>

                  <TableCell className="w-32 px-3 py-3.5 text-center align-middle whitespace-nowrap">
                    {isTaken ? (
                      <StatusPill label="Đã có nhóm" tone="idle" />
                    ) : (
                      <StatusPill label="Còn trống" tone="success" />
                    )}
                  </TableCell>

                  <TableCell className="w-32 px-5 py-3.5 text-right whitespace-nowrap align-middle">
                    {isSwitchingTopic && myGroup ? (
                      <div
                        className="flex items-center justify-end"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {topic.id === myGroup.topic.id ? (
                          <span className="text-xs font-semibold text-primary">
                            Đề tài hiện tại
                          </span>
                        ) : isTaken ? (
                          <span className="text-xs text-slate-400 dark:text-neutral-500 font-medium">
                            Đã có nhóm
                          </span>
                        ) : topic.maxStudents < myGroup.members.length ? (
                          <span
                            className="text-xs text-slate-400 dark:text-neutral-500 font-medium"
                            title="Đề tài không đủ chỗ cho số thành viên nhóm hiện tại"
                          >
                            Không đủ chỗ
                          </span>
                        ) : (
                          <Button
                            size="sm"
                            className="h-8 px-3 text-xs font-bold bg-primary hover:bg-primary/90 text-white shadow-xs cursor-pointer"
                            onClick={() => setTopicToSwitch(topic)}
                          >
                            Đổi sang đề tài này
                          </Button>
                        )}
                      </div>
                    ) : (
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
                    )}
                  </TableCell>
                </TableRow>
              );
            })}

            {/* Skeleton initial loading */}
            {isPending &&
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={`skeleton-init-${i}`} className="hover:bg-transparent">
                  <TableCell className="px-5 py-3.5">
                    <div className="max-w-[400px]">
                      <Skeleton className="h-4 w-3/4 mb-1.5" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </TableCell>
                  <TableCell className="w-24 px-3 py-3.5">
                    <Skeleton className="h-4 w-12" />
                  </TableCell>
                  <TableCell className="w-24 px-3 py-3.5 text-center">
                    <Skeleton className="h-4 w-10 mx-auto" />
                  </TableCell>
                  <TableCell className="w-44 px-3 py-3.5">
                    <Skeleton className="h-4 w-32 mb-1" />
                    <Skeleton className="h-3 w-20" />
                  </TableCell>
                  <TableCell className="w-32 px-3 py-3.5 text-center">
                    <div className="flex justify-center">
                      <Skeleton className="h-6 w-20 rounded-md" />
                    </div>
                  </TableCell>
                  <TableCell className="w-32 px-5 py-3.5 text-right">
                    <div className="flex justify-end gap-1.5">
                      <Skeleton className="h-8 w-18 rounded-md" />
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
                    <div className="max-w-[400px]">
                      <Skeleton className="h-4 w-3/4 mb-1.5" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </TableCell>
                  <TableCell className="w-24 px-3 py-3.5">
                    <Skeleton className="h-4 w-12" />
                  </TableCell>
                  <TableCell className="w-24 px-3 py-3.5 text-center">
                    <Skeleton className="h-4 w-10 mx-auto" />
                  </TableCell>
                  <TableCell className="w-44 px-3 py-3.5">
                    <Skeleton className="h-4 w-32 mb-1" />
                    <Skeleton className="h-3 w-20" />
                  </TableCell>
                  <TableCell className="w-32 px-3 py-3.5 text-center">
                    <div className="flex justify-center">
                      <Skeleton className="h-6 w-20 rounded-md" />
                    </div>
                  </TableCell>
                  <TableCell className="w-32 px-5 py-3.5 text-right">
                    <div className="flex justify-end gap-1.5">
                      <Skeleton className="h-8 w-18 rounded-md" />
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
            Đã hiển thị tất cả <strong className="text-primary font-bold">{topics.length}</strong> đề tài
          </div>
        )}
      </div>

      {/* ── Sheet chi tiết đề tài ── */}
      <TopicDetailSheet
        topicId={selectedTopicId}
        onClose={() => setSelectedTopicId(null)}
      />

      {/* ── Dialog xác nhận đổi đề tài ── */}
      <ConfirmDialog
        open={topicToSwitch !== null}
        onOpenChange={(open) => !open && setTopicToSwitch(null)}
        title="Đổi sang đề tài mới?"
        description={
          myGroup && topicToSwitch ? (
            <div className="space-y-3 pt-1 text-left">
              <p className="text-xs text-slate-600 dark:text-neutral-400">
                Bạn có chắc chắn muốn đổi sang đề tài <strong className="text-slate-900 dark:text-neutral-100 font-bold">&ldquo;{topicToSwitch.title}&rdquo;</strong>?
              </p>
              <div className="rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/30 p-2.5 text-xs text-amber-800 dark:text-amber-300">
                ⚠️ Đề tài cũ <strong className="font-semibold">&ldquo;{myGroup.topic.title}&rdquo;</strong> sẽ được nhả ra cho nhóm khác ngay khi đổi.
              </div>
              <div className="rounded-lg border border-slate-200 dark:border-neutral-800 p-2.5 space-y-1.5 bg-slate-50 dark:bg-neutral-900">
                <p className="text-[11px] font-semibold text-slate-500 dark:text-neutral-400 uppercase tracking-wider">
                  Giữ nguyên {myGroup.members.length} thành viên nhóm:
                </p>
                <div className="space-y-1">
                  {myGroup.members.map((m) => (
                    <div key={m.id} className="text-xs flex items-center justify-between text-slate-800 dark:text-neutral-200">
                      <span>{m.student.fullName}</span>
                      <span className="font-mono text-primary font-semibold text-[11px]">{m.student.studentCode}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : ''
        }
        confirmLabel={switchTopicMutation.isPending ? 'Đang đổi...' : 'Xác nhận đổi đề tài'}
        onConfirm={async () => {
          if (!topicToSwitch) return;
          try {
            await switchTopicMutation.mutateAsync(topicToSwitch.id);
            toast.success('Đã đổi sang đề tài mới thành công!');
            setTopicToSwitch(null);
            router.push('/student/groups');
          } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Không thể đổi đề tài');
          }
        }}
      />
    </div>
  );
}

export default function StudentTopicsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <StudentTopicsContent />
    </Suspense>
  );
}
