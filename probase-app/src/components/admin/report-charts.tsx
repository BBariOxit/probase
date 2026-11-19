'use client';

import { useMemo, useSyncExternalStore } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type {
  FacultyReport,
  MajorReportRow,
  RoundReportRow,
} from '@/lib/api/types';
import { cn, formatProjectTypeShort } from '@/lib/utils';

const CHART_COLORS = {
  eligible: '#64748b',
  placed: '#2563eb',
  capacity: '#10b981',
};

interface TooltipEntry {
  name?: string;
  value?: number | string;
  color?: string;
  payload?: { fullTitle?: string };
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const title = payload[0]?.payload?.fullTitle || label;

  return (
    <div className="min-w-44 rounded-lg border border-border bg-popover px-3 py-2.5 text-xs text-popover-foreground shadow-lg">
      {title && <p className="mb-2 font-semibold text-foreground">{title}</p>}
      <div className="space-y-1.5">
        {payload.map((entry, idx) => (
          <div key={idx} className="flex items-center justify-between gap-5">
            <span className="flex items-center gap-2 text-muted-foreground">
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ backgroundColor: entry.color || CHART_COLORS.placed }}
              />
              {entry.name}
            </span>
            <span className="font-semibold tabular-nums text-foreground">
              {entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── 1. Hàng KPI tổng quan (4 thẻ tối giản chuẩn enterprise) ── */
export function ReportKpiGrid({ data }: { data: FacultyReport }) {
  const { overview } = data;
  const studentRate =
    overview.eligibleStudents > 0
      ? Math.round((overview.studentsWithGroup / overview.eligibleStudents) * 100)
      : 0;
  const balance = overview.topics.seatBalance;

  const cards = [
    {
      label: 'Sinh viên có nhóm',
      main: String(overview.studentsWithGroup),
      suffix: `/ ${overview.eligibleStudents}`,
      tag: `${studentRate}%`,
      tagTone:
        overview.studentsWithoutGroup > 0
          ? 'text-amber-600 dark:text-amber-400'
          : 'text-emerald-600 dark:text-emerald-400',
      foot:
        overview.studentsWithoutGroup > 0
          ? `${overview.studentsWithoutGroup} chưa có nhóm`
          : `${overview.selfRegistered} tự ĐK · ${overview.assigned} khoa xếp`,
    },
    {
      label: 'Đề tài khả dụng',
      main: String(overview.topics.usable),
      suffix: `${overview.topics.seatCapacity} chỗ`,
      tag:
        balance >= 0 ? `Dư ${balance} chỗ` : `Thiếu ${Math.abs(balance)} chỗ`,
      tagTone:
        balance < 0
          ? 'text-rose-600 dark:text-rose-400'
          : 'text-emerald-600 dark:text-emerald-400',
      foot: `${overview.topics.openAvailable} còn trống · ${overview.topics.pending} chờ duyệt`,
    },
    {
      label: 'Nhóm đăng ký',
      main: String(overview.groups.total),
      suffix: 'nhóm',
      tag: `TB ${overview.groups.avgSize} SV`,
      tagTone: 'text-muted-foreground',
      foot: `${overview.groups.full} đã đủ · ${overview.groups.forming} còn tuyển`,
    },
    {
      label: 'Đề xuất từ SV',
      main: String(overview.proposals.total),
      suffix: 'đề xuất',
      tag:
        overview.proposals.pending > 0
          ? `${overview.proposals.pending} chờ GV`
          : 'Đã xử lý hết',
      tagTone:
        overview.proposals.pending > 0
          ? 'text-amber-600 dark:text-amber-400'
          : 'text-muted-foreground',
      foot: `${overview.proposals.accepted} đã nhận · ${overview.proposals.rejected} từ chối`,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-xl border border-border bg-card p-5"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              {card.label}
            </span>
            <span className={cn('text-xs font-semibold tabular-nums', card.tagTone)}>
              {card.tag}
            </span>
          </div>

          <div className="mt-2.5 flex items-baseline gap-1.5 tabular-nums">
            <span className="text-3xl font-semibold tracking-tight text-foreground">
              {card.main}
            </span>
            <span className="text-sm font-medium text-muted-foreground">
              {card.suffix}
            </span>
          </div>

          <p className="mt-2 text-xs text-muted-foreground tabular-nums">
            {card.foot}
          </p>
        </div>
      ))}
    </div>
  );
}

const emptySubscribe = () => () => {};

function useIsMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}

/* ── 2A. Biểu đồ Cân đối Cung – Cầu ── */
export function SupplyDemandChart({
  rounds,
  majors,
  isFilteredRound,
}: {
  rounds: RoundReportRow[];
  majors: MajorReportRow[];
  isFilteredRound: boolean;
}) {
  const mounted = useIsMounted();

  const data = useMemo(() => {
    if (isFilteredRound) {
      return majors.map((m) => ({
        name: m.code,
        fullTitle: m.name,
        eligible: m.eligibleStudents,
        placed: m.withGroup,
        capacity: m.seatCapacity,
      }));
    }

    return rounds.map((r) => {
      const pt = formatProjectTypeShort(r.projectType);
      return {
        name: pt.short,
        fullTitle: pt.full,
        eligible: r.eligible,
        placed: r.withGroup,
        capacity: r.topics.seatCapacity,
      };
    });
  }, [rounds, majors, isFilteredRound]);

  if (!mounted || data.length === 0) {
    return (
      <div className="flex h-[250px] items-center justify-center text-sm text-muted-foreground">
        Chưa có dữ liệu đối chiếu
      </div>
    );
  }

  return (
    <div className="h-[250px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 10, right: 12, left: -12, bottom: 0 }}
          barGap={6}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="var(--border)"
          />
          <XAxis
            dataKey="name"
            tick={{ fill: 'var(--foreground)', fontSize: 12, fontWeight: 500 }}
            axisLine={{ stroke: 'var(--border)' }}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            content={<ChartTooltip />}
            cursor={{ fill: 'var(--muted)', opacity: 0.35 }}
          />
          <Legend
            verticalAlign="top"
            align="right"
            wrapperStyle={{ paddingBottom: 12, fontSize: 12 }}
            formatter={(value) => (
              <span className="text-xs font-medium text-foreground">{value}</span>
            )}
          />
          <Bar
            dataKey="eligible"
            name="SV đủ ĐK"
            fill={CHART_COLORS.eligible}
            radius={[4, 4, 0, 0]}
            maxBarSize={26}
          />
          <Bar
            dataKey="placed"
            name="Đã có nhóm"
            fill={CHART_COLORS.placed}
            radius={[4, 4, 0, 0]}
            maxBarSize={26}
          />
          <Bar
            dataKey="capacity"
            name="Sức chứa đề tài"
            fill={CHART_COLORS.capacity}
            radius={[4, 4, 0, 0]}
            maxBarSize={26}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ── 2B. Phễu Đề tài & Quy mô Nhóm (Linear/Vercel inline bars) ── */
export function TopicAndGroupBreakdown({ data }: { data: FacultyReport }) {
  const { topics, groups, outlines } = data.overview;
  const totalBase = Math.max(topics.total, 1);

  const stages = [
    {
      label: 'Đang mở (còn trống)',
      count: topics.openAvailable,
      bar: 'bg-emerald-500',
    },
    {
      label: 'Đã có nhóm nhận',
      count: topics.inUse,
      bar: 'bg-primary',
    },
    {
      label: 'Đã duyệt (chờ mở)',
      count: topics.approvedNotOpen,
      bar: 'bg-sky-500',
    },
    {
      label: 'Chờ Bộ môn duyệt',
      count: topics.pending,
      bar: 'bg-amber-500',
    },
    {
      label: 'Bản nháp GV',
      count: topics.draft,
      bar: 'bg-slate-400 dark:bg-neutral-500',
    },
  ];

  const groupChips = [
    { label: '1 SV', value: groups.size1 },
    { label: '2 SV', value: groups.size2 },
    { label: '3+ SV', value: groups.size3Plus },
  ];

  return (
    <div className="flex h-full flex-col justify-between gap-5">
      <div className="space-y-3">
        {stages.map((stage) => {
          const pct = Math.round((stage.count / totalBase) * 100);
          return (
            <div key={stage.label} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-foreground">{stage.label}</span>
                <span className="font-semibold tabular-nums text-foreground">
                  {stage.count}
                  <span className="ml-1 font-normal text-muted-foreground">
                    ({pct}%)
                  </span>
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={cn('h-full rounded-full transition-all', stage.bar)}
                  style={{ width: `${stage.count > 0 ? Math.max(pct, 3) : 0}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3.5 text-xs">
        <div className="flex items-center gap-3">
          <span className="font-medium text-muted-foreground">Quy mô nhóm:</span>
          {groupChips.map((chip) => (
            <span key={chip.label} className="tabular-nums text-foreground">
              <span className="text-muted-foreground">{chip.label}:</span>{' '}
              <span className="font-semibold">{chip.value}</span>
            </span>
          ))}
        </div>

        <span className="tabular-nums text-muted-foreground">
          M03 duyệt:{' '}
          <span className="font-semibold text-foreground">
            {outlines.approved}/{outlines.totalGroups}
          </span>
        </span>
      </div>
    </div>
  );
}
