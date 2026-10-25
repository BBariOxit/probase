'use client';

import { Fragment, useState } from 'react';
import { ChartColumn, Download, Loader2 } from 'lucide-react';
import { useSemesters } from '@/lib/api/master-data';
import { useExportReport, useFacultyReport } from '@/lib/api/reports';
import type {
  MajorReportRow,
  ProgressRow,
  RoundReportRow,
  SupervisionRow,
} from '@/lib/api/types';
import { useRequireRole } from '@/lib/auth/use-require-role';
import { EmptyState } from '@/components/shared/empty-state';
import { StatusPill, type StatusTone } from '@/components/shared/status-pill';
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

const dueFormat = new Intl.DateTimeFormat('vi-VN', {
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

export default function ReportsPage() {
  const allowed = useRequireRole('ADMIN');
  const { data: semesters } = useSemesters();
  const [picked, setPicked] = useState<number | null>(null);

  const semesterId = picked ?? semesters?.find((one) => one.isActive)?.id;
  const { data, isPending, error } = useFacultyReport(semesterId);
  const exportReport = useExportReport();

  if (!allowed) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={semesterId ?? null}
          onValueChange={(value) => setPicked(value as number)}
        >
          <SelectTrigger className="w-64" aria-label="Chọn học kỳ">
            <SelectValue>
              {(value) =>
                semesters?.find((one) => one.id === value)?.name ??
                'Chọn học kỳ'
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {semesters?.map((semester) => (
              <SelectItem key={semester.id} value={semester.id}>
                {semester.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          className="ml-auto"
          disabled={!data || exportReport.isPending}
          onClick={() => exportReport.mutate(semesterId)}
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
        <p className="text-sm text-destructive">Không tải được số liệu.</p>
      )}

      {isPending && (
        <div className="flex justify-center py-16">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {data && data.rounds.length === 0 && (
        <div className="rounded-xl border">
          <EmptyState
            icon={ChartColumn}
            title="Học kỳ này chưa mở đợt đăng ký nào, nên chưa có gì để thống kê."
          />
        </div>
      )}

      {data && data.rounds.length > 0 && (
        <>
          <Section title="Đợt đăng ký">
            <RegistrationTable rows={data.rounds} />
          </Section>

          {/*
            Side by side on a wide screen. They answer the same question from two
            sides — how the term is spread — and a reader comparing "thầy nào
            nhiều nhất" with "ngành nào đông nhất" wants them in front of each
            other rather than one below the fold.
          */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Section title="Giảng viên hướng dẫn">
              <SupervisionTable rows={data.supervision} />
            </Section>
            <Section title="Chuyên ngành">
              <MajorTable rows={data.majors} />
            </Section>
          </div>

          <Section title="Tiến độ nộp bài">
            <ProgressTable rows={data.progress} />
          </Section>
        </>
      )}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2.5">
      <h2 className="font-heading text-sm font-semibold tracking-tight">
        {title}
      </h2>
      <div className="overflow-x-auto rounded-xl border">{children}</div>
    </section>
  );
}

function RegistrationTable({ rows }: { rows: RoundReportRow[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Đợt</TableHead>
          <TableHead className="text-right">Thuộc diện</TableHead>
          <TableHead className="text-right">Có nhóm</TableHead>
          <TableHead className="text-right">Chưa có</TableHead>
          <TableHead className="w-52">Tự đăng ký / khoa xếp</TableHead>
          <TableHead className="text-right">Đề tài</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.roundId}>
            <TableCell>
              <div className="flex items-center gap-2">
                <span className="font-medium">{row.projectType.name}</span>
                <StatusPill {...PHASE[row.phase]} />
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Khóa {row.cohorts.join(', ')}
              </p>
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {row.eligible}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {row.withGroup}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {row.withoutGroup > 0 ? (
                <span className="text-status-danger">{row.withoutGroup}</span>
              ) : (
                row.withoutGroup
              )}
            </TableCell>
            <TableCell>
              <SplitBar self={row.selfRegistered} assigned={row.assigned} />
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {row.topicsUnderway}/{row.topics}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function SplitBar({ self, assigned }: { self: number; assigned: number }) {
  const total = self + assigned;

  if (total === 0) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  return (
    <div className="space-y-1.5">
      <p className="text-xs tabular-nums">
        {self} tự chọn
        {assigned > 0 && (
          <span className="text-muted-foreground"> · {assigned} khoa xếp</span>
        )}
      </p>
      <div
        className="flex h-1.5 overflow-hidden rounded-full bg-muted"
        role="img"
        aria-label={`${self} sinh viên tự đăng ký, ${assigned} sinh viên do khoa xếp`}
      >
        <div
          className="bg-status-success"
          style={{ width: `${(self / total) * 100}%` }}
        />
        <div
          className="bg-status-waiting"
          style={{ width: `${(assigned / total) * 100}%` }}
        />
      </div>
    </div>
  );
}

function SupervisionTable({ rows }: { rows: SupervisionRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="px-4 py-6 text-sm text-muted-foreground">
        Chưa có nhóm nào nhận đề tài trong học kỳ này.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Giảng viên</TableHead>
          <TableHead className="text-right">Nhóm</TableHead>
          <TableHead className="text-right">Sinh viên</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.lecturerId}>
            <TableCell className="font-medium">
              {row.academicTitle
                ? `${row.academicTitle} ${row.fullName}`
                : row.fullName}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {row.groups}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {row.students}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function MajorTable({ rows }: { rows: MajorReportRow[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Chuyên ngành</TableHead>
          <TableHead className="text-right">Sinh viên</TableHead>
          <TableHead className="text-right">Có nhóm</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.majorId}>
            <TableCell className="font-medium">{row.name}</TableCell>
            <TableCell className="text-right tabular-nums">
              {row.students}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {row.withGroup}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function ProgressTable({ rows }: { rows: ProgressRow[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Đợt · mục phải nộp</TableHead>
          <TableHead className="text-right">Hạn</TableHead>
          <TableHead className="text-right">Nhóm</TableHead>
          <TableHead className="text-right">Đã nộp</TableHead>
          <TableHead className="text-right">Chờ nhận xét</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <Fragment key={row.roundId}>
            <TableRow>
              <TableCell className="font-medium">
                {row.projectType.name}
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  {row.required > 0
                    ? `nộp đủ ${row.required} mục bắt buộc`
                    : 'chưa khai mục nào'}
                </span>
              </TableCell>
              <TableCell />
              <TableCell className="text-right tabular-nums">
                {row.groups}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {row.required > 0 ? row.complete : '—'}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {row.awaitingFeedback > 0 ? (
                  <span className="text-status-active">
                    {row.awaitingFeedback}
                  </span>
                ) : (
                  row.awaitingFeedback
                )}
              </TableCell>
            </TableRow>

            {row.items.map((item) => (
              <TableRow
                key={item.requirementId}
                className="text-muted-foreground"
              >
                <TableCell className="pl-8">
                  {item.name}
                  {!item.isRequired && (
                    <span className="ml-1.5 text-xs">tuỳ chọn</span>
                  )}
                </TableCell>
                <TableCell className="text-right text-xs tabular-nums">
                  {dueFormat.format(new Date(item.dueAt))}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {row.groups}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {item.submitted}
                </TableCell>
                <TableCell />
              </TableRow>
            ))}
          </Fragment>
        ))}
      </TableBody>
    </Table>
  );
}
