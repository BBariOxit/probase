'use client';

import { useState } from 'react';
import { ChartColumn, Download, Loader2 } from 'lucide-react';
import { useSemesters } from '@/lib/api/master-data';
import { useExportReport, useFacultyReport } from '@/lib/api/reports';
import type {
  MajorReportRow,
  RoundReportRow,
  SupervisionRow,
} from '@/lib/api/types';
import { useRequireRole } from '@/lib/auth/use-require-role';
import {
  cn,
  formatProjectTypeShort,
  formatSemesterShort,
  sanitizeLecturerName,
} from '@/lib/utils';
import { EmptyState } from '@/components/shared/empty-state';
import { StatusPill, type StatusTone } from '@/components/shared/status-pill';
import {
  ReportKpiGrid,
  SupplyDemandChart,
  TopicAndGroupBreakdown,
} from '@/components/admin/report-charts';
import { Button } from '@/components/ui/button';
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

const dateShort = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

const dateCompact = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
});

const PHASE: Record<string, { label: string; tone: StatusTone }> = {
  PREP: { label: 'Chưa mở', tone: 'waiting' },
  OPEN: { label: 'Đang mở', tone: 'success' },
  EXTENDED: { label: 'Đang gia hạn', tone: 'active' },
  RECONCILING: { label: 'Đang phân bổ', tone: 'active' },
  FINALIZED: { label: 'Đã chốt', tone: 'idle' },
};

function daysRemaining(targetIso: string): { text: string; urgent: boolean } {
  const end = new Date(targetIso);
  const now = new Date();
  const endDay = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = Math.round((endDay - today) / 86_400_000);

  if (diff > 0) return { text: `còn ${diff} ngày`, urgent: diff <= 3 };
  if (diff === 0) return { text: 'hạn hôm nay', urgent: true };
  return { text: `quá ${Math.abs(diff)} ngày`, urgent: true };
}

function InlineRatioBar({
  value,
  total,
  tone = 'bg-primary',
}: {
  value: number;
  total: number;
  tone?: string;
}) {
  const pct = total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0;
  return (
    <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
      <div
        className={cn('h-full rounded-full transition-all', tone)}
        style={{ width: `${value > 0 ? Math.max(pct, 6) : 0}%` }}
      />
    </div>
  );
}

export default function ReportsPage() {
  const allowed = useRequireRole('ADMIN');
  const { data: semesters } = useSemesters();
  const [pickedSemester, setPickedSemester] = useState<number | null>(null);
  const [pickedRound, setPickedRound] = useState<number | undefined>(undefined);

  const semesterId = pickedSemester ?? semesters?.find((one) => one.isActive)?.id;
  const { data, isPending, error } = useFacultyReport(semesterId, pickedRound);
  const exportReport = useExportReport();

  if (!allowed) return null;

  const hasRounds = Boolean(data && data.availableRounds.length > 0);
  const isFilteredRound = pickedRound !== undefined;

  return (
    <div className="space-y-8">
      {/* Thanh điều khiển */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Select
            value={semesterId ?? null}
            onValueChange={(value) => {
              setPickedSemester(value as number);
              setPickedRound(undefined);
            }}
          >
            <SelectTrigger className="w-52" aria-label="Chọn học kỳ">
              <SelectValue>
                {(value) => {
                  const found = semesters?.find((one) => one.id === value);
                  return found ? formatSemesterShort(found) : 'Chọn học kỳ';
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {semesters?.map((semester) => (
                <SelectItem key={semester.id} value={semester.id}>
                  {formatSemesterShort(semester)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasRounds && data && (
            <div
              className="flex flex-wrap items-center gap-1 rounded-lg border border-border bg-card p-1"
              role="group"
              aria-label="Lọc theo đợt"
            >
              <button
                type="button"
                onClick={() => setPickedRound(undefined)}
                className={cn(
                  'rounded-md px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer',
                  !isFilteredRound
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                Tất cả đợt
              </button>
              {data.availableRounds.map((opt) => {
                const pt = formatProjectTypeShort(opt.projectType);
                const active = pickedRound === opt.roundId;
                return (
                  <button
                    key={opt.roundId}
                    type="button"
                    title={pt.full}
                    onClick={() => setPickedRound(opt.roundId)}
                    className={cn(
                      'rounded-md px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer',
                      active
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {pt.short}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <Button
          variant="outline"
          disabled={!data || exportReport.isPending}
          onClick={() =>
            exportReport.mutate({ semesterId, roundId: pickedRound })
          }
          className="cursor-pointer"
        >
          {exportReport.isPending ? (
            <Loader2 className="animate-spin" />
          ) : (
            <Download />
          )}
          Xuất Excel
        </Button>
      </div>

      {error && (
        <p className="text-sm text-destructive">
          Không tải được số liệu báo cáo.
        </p>
      )}

      {isPending && (
        <div className="flex justify-center py-16">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {data && data.availableRounds.length === 0 && (
        <div className="rounded-xl border border-border bg-card">
          <EmptyState
            icon={ChartColumn}
            title="Học kỳ này chưa mở đợt đăng ký nào."
          />
        </div>
      )}

      {data && data.rounds.length > 0 && (
        <div className="space-y-8">
          {/* 1. Chỉ số tổng quan */}
          <ReportKpiGrid data={data} />

          {/* 2. Trực quan Cung – Cầu & Phễu Đề tài */}
          <div className="grid gap-5 lg:grid-cols-12">
            <div className="rounded-xl border border-border bg-card p-5 lg:col-span-7">
              <div className="mb-3 flex items-baseline justify-between gap-2">
                <h2 className="text-sm font-semibold text-foreground">
                  {isFilteredRound
                    ? 'Cung – cầu theo chuyên ngành'
                    : 'Cung – cầu theo đợt'}
                </h2>
                <span className="text-xs text-muted-foreground">
                  SV đủ ĐK · Đã có nhóm · Sức chứa
                </span>
              </div>
              <SupplyDemandChart
                rounds={data.rounds}
                majors={data.majors}
                isFilteredRound={isFilteredRound}
              />
            </div>

            <div className="flex flex-col rounded-xl border border-border bg-card p-5 lg:col-span-5">
              <div className="mb-4 flex items-baseline justify-between gap-2">
                <h2 className="text-sm font-semibold text-foreground">
                  Trạng thái đề tài
                </h2>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {data.overview.topics.total} đề tài
                </span>
              </div>
              <div className="flex-1">
                <TopicAndGroupBreakdown data={data} />
              </div>
            </div>
          </div>

          {/* 3. Bảng Đợt đăng ký & Cân đối Chuyên ngành */}
          <section className="space-y-4">
            <div className="flex items-baseline justify-between">
              <h2 className="text-base font-semibold tracking-tight text-foreground">
                Chi tiết theo đợt đăng ký
              </h2>
              <span className="text-xs text-muted-foreground">
                {data.rounds.length} đợt
              </span>
            </div>
            <div className="overflow-hidden rounded-xl border border-border bg-card">
              <RoundsTable rows={data.rounds} />
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-baseline justify-between">
              <h2 className="text-base font-semibold tracking-tight text-foreground">
                Cân đối theo chuyên ngành
              </h2>
              <span className="text-xs text-muted-foreground">
                Tính trên SV đủ ĐK trong phạm vi đã chọn
              </span>
            </div>
            <div className="overflow-hidden rounded-xl border border-border bg-card">
              <MajorsTable rows={data.majors} />
            </div>
          </section>

          {/* 4. Phân bổ Giảng viên */}
          <section className="space-y-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-base font-semibold tracking-tight text-foreground">
                Phân bổ giảng viên
              </h2>
              <span className="text-xs text-muted-foreground tabular-nums">
                {data.supervision.length} giảng viên · TB{' '}
                {data.overview.avgGroupsPerLecturer} nhóm / GV ·{' '}
                {data.overview.lecturersWithoutTopics} chưa có đề tài
              </span>
            </div>
            <div className="overflow-hidden rounded-xl border border-border bg-card">
              <SupervisionTable rows={data.supervision} />
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function RoundsTable({ rows }: { rows: RoundReportRow[] }) {
  return (
    <Table>
      <TableHeader sticky>
        <TableRow>
          <TableHead className="px-4">Đợt</TableHead>
          <TableHead className="px-3 text-center">Trạng thái</TableHead>
          <TableHead className="px-3 text-center">Thời gian đăng ký</TableHead>
          <TableHead className="px-3 text-center">Sinh viên có nhóm</TableHead>
          <TableHead className="px-3 text-center">Chưa có</TableHead>
          <TableHead className="px-3 text-center">Nhóm</TableHead>
          <TableHead className="px-3 text-center">Đề tài trống / Tổng</TableHead>
          <TableHead className="px-4 text-center">Dư / Thiếu chỗ</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => {
          const pt = formatProjectTypeShort(row.projectType);
          const regDeadline =
            row.phase === 'OPEN' || row.phase === 'EXTENDED'
              ? daysRemaining(row.registrationEnd)
              : null;
          const rate =
            row.eligible > 0
              ? Math.round((row.withGroup / row.eligible) * 100)
              : 0;
          const balance = row.topics.seatBalance;

          return (
            <TableRow key={row.roundId}>
              <TableCell className="px-4">
                <span className="font-semibold text-foreground">{pt.full}</span>
                <p className="text-xs text-muted-foreground">
                  Khóa {row.cohorts.join(', ') || '—'} · tối đa{' '}
                  {row.maxStudentsPerTopic} SV/nhóm
                </p>
              </TableCell>

              <TableCell className="px-3 text-center whitespace-nowrap">
                <StatusPill {...PHASE[row.phase]} variant="text" />
              </TableCell>

              <TableCell className="px-3 text-center whitespace-nowrap">
                <span className="text-sm text-foreground tabular-nums">
                  {dateCompact.format(new Date(row.registrationStart))} –{' '}
                  {dateShort.format(new Date(row.registrationEnd))}
                </span>
                {regDeadline && (
                  <p
                    className={cn(
                      'text-xs font-medium',
                      regDeadline.urgent
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-muted-foreground',
                    )}
                  >
                    {regDeadline.text}
                  </p>
                )}
              </TableCell>

              <TableCell className="px-3">
                <div className="flex items-center justify-center gap-3">
                  <InlineRatioBar
                    value={row.withGroup}
                    total={row.eligible}
                    tone="bg-primary"
                  />
                  <span className="text-sm font-semibold tabular-nums text-foreground">
                    {row.withGroup}/{row.eligible}
                  </span>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    ({rate}%)
                  </span>
                </div>
              </TableCell>

              <TableCell className="px-3 text-center font-semibold tabular-nums">
                <span
                  className={
                    row.withoutGroup > 0
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-muted-foreground'
                  }
                >
                  {row.withoutGroup}
                </span>
              </TableCell>

              <TableCell className="px-3 text-center whitespace-nowrap tabular-nums">
                <span className="font-semibold text-foreground">
                  {row.groups.total}
                </span>
                {row.groups.forming > 0 && (
                  <span className="ml-1.5 text-xs text-amber-600 dark:text-amber-400">
                    ({row.groups.forming} thiếu)
                  </span>
                )}
              </TableCell>

              <TableCell className="px-3 text-center whitespace-nowrap tabular-nums">
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {row.topics.openAvailable}
                </span>
                <span className="text-muted-foreground">
                  {' '}
                  / {row.topics.usable}
                </span>
              </TableCell>

              <TableCell className="px-4 text-center font-semibold tabular-nums">
                <span
                  className={
                    balance < 0
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-emerald-600 dark:text-emerald-400'
                  }
                >
                  {balance >= 0 ? `+${balance}` : balance}
                </span>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function MajorsTable({ rows }: { rows: MajorReportRow[] }) {
  return (
    <Table>
      <TableHeader sticky>
        <TableRow>
          <TableHead className="px-4">Chuyên ngành</TableHead>
          <TableHead className="px-3 text-center">SV đủ ĐK</TableHead>
          <TableHead className="px-3 text-center">Đã có nhóm</TableHead>
          <TableHead className="px-3 text-center">Chưa có</TableHead>
          <TableHead className="px-3 text-center">Số nhóm</TableHead>
          <TableHead className="px-3 text-center">Đề tài</TableHead>
          <TableHead className="px-4 text-center">Sức chứa (Chênh lệch)</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => {
          const rate =
            row.eligibleStudents > 0
              ? Math.round((row.withGroup / row.eligibleStudents) * 100)
              : 0;

          return (
            <TableRow key={row.code}>
              <TableCell className="px-4">
                <span className="font-semibold text-foreground">{row.name}</span>
                <span className="ml-2 text-xs text-muted-foreground">
                  {row.code}
                </span>
              </TableCell>

              <TableCell className="px-3 text-center font-semibold tabular-nums">
                {row.eligibleStudents}
              </TableCell>

              <TableCell className="px-3">
                <div className="flex items-center justify-center gap-3">
                  <InlineRatioBar
                    value={row.withGroup}
                    total={row.eligibleStudents}
                    tone="bg-emerald-500"
                  />
                  <span className="font-semibold tabular-nums text-foreground">
                    {row.withGroup}
                  </span>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    ({rate}%)
                  </span>
                </div>
              </TableCell>

              <TableCell className="px-3 text-center font-semibold tabular-nums">
                <span
                  className={
                    row.withoutGroup > 0
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-muted-foreground'
                  }
                >
                  {row.withoutGroup}
                </span>
              </TableCell>

              <TableCell className="px-3 text-center tabular-nums">
                {row.groups}
              </TableCell>

              <TableCell className="px-3 text-center tabular-nums">
                {row.usableTopics}
              </TableCell>

              <TableCell className="px-4 text-center whitespace-nowrap tabular-nums">
                <span className="font-semibold text-foreground">
                  {row.seatCapacity} chỗ
                </span>
                <span
                  className={cn(
                    'ml-2 text-xs font-semibold',
                    row.seatBalance < 0
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-emerald-600 dark:text-emerald-400',
                  )}
                >
                  ({row.seatBalance >= 0 ? `+${row.seatBalance}` : row.seatBalance})
                </span>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function SupervisionTable({ rows }: { rows: SupervisionRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="px-4 py-6 text-sm text-muted-foreground">
        Chưa có giảng viên tham gia trong học kỳ này.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader sticky>
        <TableRow>
          <TableHead className="px-4">Giảng viên</TableHead>
          <TableHead className="px-3 text-center">Tổ CM</TableHead>
          <TableHead className="px-3 text-center">Đề tài (Trống / Tổng)</TableHead>
          <TableHead className="px-3 text-center">Chờ duyệt</TableHead>
          <TableHead className="px-3 text-center">Nhóm HD</TableHead>
          <TableHead className="px-3 text-center">Sinh viên</TableHead>
          <TableHead className="px-4 text-center">Tải hướng dẫn</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => {
          const clean = sanitizeLecturerName(row.fullName, row.academicTitle);
          const cap = row.maxMentoringQuota ?? 5;
          const overQuota = row.groups > cap;
          const noTopics =
            !row.isExempt && row.topicsUsable === 0 && row.topicsPending === 0;

          return (
            <TableRow key={row.lecturerId}>
              <TableCell className="px-4">
                <span className="font-semibold text-foreground">
                  {clean.displayName}
                </span>
                {row.isExempt && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    (Miễn giảm)
                  </span>
                )}
              </TableCell>

              <TableCell className="px-3 text-center text-xs font-medium text-muted-foreground">
                {row.majorCode ?? '—'}
              </TableCell>

              <TableCell className="px-3 text-center whitespace-nowrap tabular-nums">
                <span
                  className={cn(
                    'font-semibold',
                    noTopics
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-emerald-600 dark:text-emerald-400',
                  )}
                >
                  {row.topicsOpenAvailable}
                </span>
                <span className="text-muted-foreground">
                  {' '}
                  / {row.topicsUsable}
                </span>
              </TableCell>

              <TableCell className="px-3 text-center tabular-nums text-muted-foreground">
                {row.topicsPending > 0 ? (
                  <span className="font-semibold text-amber-600 dark:text-amber-400">
                    {row.topicsPending}
                  </span>
                ) : (
                  '—'
                )}
              </TableCell>

              <TableCell className="px-3 text-center font-semibold tabular-nums text-primary">
                {row.groups}
              </TableCell>

              <TableCell className="px-3 text-center font-semibold tabular-nums text-foreground">
                {row.students}
              </TableCell>

              <TableCell className="px-4">
                <div className="flex items-center justify-center gap-3">
                  <InlineRatioBar
                    value={row.groups}
                    total={cap}
                    tone={overQuota ? 'bg-rose-500' : 'bg-primary'}
                  />
                  <span
                    className={cn(
                      'text-xs font-semibold tabular-nums',
                      overQuota
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-muted-foreground',
                    )}
                  >
                    {row.groups}/{cap}
                  </span>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
