'use client';

import { useState } from 'react';
import Link from 'next/link';
import { BookOpen, Loader2, Search } from 'lucide-react';
import {
  useActiveSemester,
  useMyEligibleProjectTypes,
  useMyRounds,
  useProjectTypes,
} from '@/lib/api/master-data';
import { useMyGroup } from '@/lib/api/registration';
import { useTopicLecturers, useTopics } from '@/lib/api/topics';
import { useRequireRole } from '@/lib/auth/use-require-role';
import { useDebouncedValue } from '@/lib/use-debounced-value';
import { EmptyState } from '@/components/shared/empty-state';
import { MyGroupBanner } from '@/components/groups/my-group-banner';
import { PaginationBar } from '@/components/shared/pagination-bar';
import { RegistrationPhaseNotice } from '@/components/rounds/registration-phase-notice';
import { SeatBadge } from '@/components/groups/seat-indicator';
import { TopicRegisterButton } from '@/components/topics/topic-register-button';
import { TopicDetailSheet } from '@/components/topics/topic-detail-sheet';
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
import { Button } from '@/components/ui/button';

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

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [projectTypeId, setProjectTypeId] = useState(MY_COHORT);
  const [lecturerId, setLecturerId] = useState(ANY);
  const [selectedTopicId, setSelectedTopicId] = useState<number | null>(null);
  const debouncedSearch = useDebouncedValue(search);

  const { data, isPending, error } = useTopics(
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
      page,
      limit: PAGE_SIZE,
    },
    { enabled: activeSemester !== undefined },
  );

  if (!allowed) return null;

  const topics = data?.items ?? [];
  const filtering =
    debouncedSearch !== '' ||
    (projectTypeId !== ANY && projectTypeId !== MY_COHORT) ||
    lecturerId !== ANY;

  const myCohortTypes = myTypes?.map((type) => type.name).join(', ');

  function resetPage() {
    setPage(1);
  }

  return (
    <div className="space-y-4">
      {myGroup && <MyGroupBanner group={myGroup} />}

      {rounds?.map((round) => (
        <RegistrationPhaseNotice
          key={round.id}
          subject={rounds.length > 1 ? round.projectType.name : undefined}
          round={round}
          hasGroup={myGroup != null}
        />
      ))}

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-52 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              resetPage();
            }}
            placeholder="Tìm đề tài…"
            className="pl-8"
            aria-label="Tìm đề tài"
          />
        </div>

        <Select
          value={projectTypeId}
          onValueChange={(value) => {
            setProjectTypeId(value as number);
            resetPage();
          }}
        >
          <SelectTrigger className="w-56" aria-label="Lọc theo loại đồ án">
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
          <SelectContent>
            <SelectItem value={MY_COHORT}>
              <span className="flex flex-col items-start">
                <span>Dành cho khóa của bạn</span>
                {myCohortTypes && (
                  <span className="text-xs text-muted-foreground">
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
            resetPage();
          }}
        >
          <SelectTrigger className="w-52" aria-label="Lọc theo giảng viên">
            <SelectValue>
              {(value) => {
                const lecturer = lecturers?.find((one) => one.id === value);
                if (!lecturer) return 'Mọi giảng viên';
                return lecturer.academicTitle
                  ? `${lecturer.academicTitle} ${lecturer.fullName}`
                  : lecturer.fullName;
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Mọi giảng viên</SelectItem>
            {lecturers?.map((lecturer) => (
              <SelectItem key={lecturer.id} value={lecturer.id}>
                {lecturer.academicTitle
                  ? `${lecturer.academicTitle} ${lecturer.fullName}`
                  : lecturer.fullName}
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
        <p className="text-sm text-destructive">
          Không tải được danh sách đề tài.
        </p>
      )}

      {isPending && (
        <div className="flex justify-center py-16">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {!isPending && topics.length === 0 && (
        <div className="rounded-xl border">
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

      {topics.length > 0 && (
        <div className="overflow-hidden rounded-xl border">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-64">Đề tài</TableHead>
                  <TableHead className="w-56">Giảng viên</TableHead>
                  <TableHead className="w-32">Tình trạng</TableHead>
                  <TableHead className="w-32 text-right">Hành động</TableHead>
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
                      <Link
                        href={`/student/topics/${topic.id}`}
                        className="rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                        onClick={(e) => {
                          e.preventDefault();
                          setSelectedTopicId(topic.id);
                        }}
                      >
                        {topic.title}
                      </Link>
                      <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                        {topic.projectType.name}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {topic.lecturer.academicTitle
                        ? `${topic.lecturer.academicTitle} ${topic.lecturer.fullName}`
                        : topic.lecturer.fullName}
                    </TableCell>
                    <TableCell>
                      <SeatBadge topic={topic} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div onClick={(e) => e.stopPropagation()}>
                        <TopicRegisterButton
                          topic={topic}
                          idle={
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setSelectedTopicId(topic.id)}
                            >
                              Xem chi tiết
                            </Button>
                          }
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {data && (
        <PaginationBar
          page={data.page}
          totalPages={data.totalPages}
          onPageChange={setPage}
        />
      )}

      <TopicDetailSheet
        topicId={selectedTopicId}
        onClose={() => setSelectedTopicId(null)}
      />
    </div>
  );
}
