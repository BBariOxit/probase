'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  BookOpen,
  CheckCircle2,
  GraduationCap,
  Layers,
  PieChart as PieChartIcon,
  Users,
} from 'lucide-react';
import type {
  FacultyReport,
  MajorReportRow,
  ProgressRow,
  RoundReportRow,
  SupervisionRow,
} from '@/lib/api/types';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Palette chuẩn Enterprise Dark/Light
const PALETTE = {
  blue: '#3b82f6',
  emerald: '#10b981',
  amber: '#f59e0b',
  rose: '#ef4444',
  purple: '#8b5cf6',
  teal: '#14b8a6',
  indigo: '#6366f1',
  slate: '#64748b',
};

const PIE_COLORS = [
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#14b8a6',
];

/* ── Custom Chart Tooltip ── */
interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name?: string;
    value?: number | string;
    color?: string;
    fill?: string;
    dataKey?: string;
    payload?: Record<string, unknown>;
  }>;
  label?: string;
  suffix?: string;
}

function CleanTooltip({
  active,
  payload,
  label,
  suffix = '',
}: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const title =
    (payload[0]?.payload as { fullName?: string })?.fullName || label;

  return (
    <div className="max-w-xs rounded-lg border border-border bg-popover/95 px-3 py-2 text-xs shadow-md backdrop-blur-xs">
      {title && (
        <p className="mb-1.5 font-semibold leading-snug text-foreground">
          {title}
        </p>
      )}
      <div className="space-y-1">
        {payload.map((entry, index) => {
          const color = entry.color || entry.fill || PALETTE.blue;
          return (
            <div
              key={`tooltip-${index}`}
              className="flex items-center justify-between gap-4"
            >
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span
                  className="size-2 rounded-full"
                  style={{ backgroundColor: color }}
                />
                {entry.name}
              </span>
              <span className="font-semibold tabular-nums text-foreground">
                {entry.value}
                {suffix}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Executive Stat Cards ── */
export function ExecutiveStats({ data }: { data: FacultyReport }) {
  const stats = useMemo(() => {
    const totalEligible = data.rounds.reduce((acc, r) => acc + r.eligible, 0);
    const totalWithGroup = data.rounds.reduce((acc, r) => acc + r.withGroup, 0);
    const totalWithoutGroup = data.rounds.reduce(
      (acc, r) => acc + r.withoutGroup,
      0,
    );
    const groupRate =
      totalEligible > 0
        ? Math.round((totalWithGroup / totalEligible) * 100)
        : 0;

    const totalTopics = data.rounds.reduce((acc, r) => acc + r.topics, 0);
    const totalUnderway = data.rounds.reduce(
      (acc, r) => acc + r.topicsUnderway,
      0,
    );
    const topicRate =
      totalTopics > 0 ? Math.round((totalUnderway / totalTopics) * 100) : 0;

    const totalLecturers = data.supervision.length;
    const totalSupervisionGroups = data.supervision.reduce(
      (acc, s) => acc + s.groups,
      0,
    );
    const totalSupervisionStudents = data.supervision.reduce(
      (acc, s) => acc + s.students,
      0,
    );
    const avgGroups =
      totalLecturers > 0
        ? (totalSupervisionGroups / totalLecturers).toFixed(1)
        : '0';
    const atCapacity = data.supervision.filter((s) => s.groups >= 5).length;

    const totalRequired = data.progress.reduce((acc, p) => acc + p.required, 0);
    const totalComplete = data.progress.reduce((acc, p) => acc + p.complete, 0);
    const totalAwaiting = data.progress.reduce(
      (acc, p) => acc + p.awaitingFeedback,
      0,
    );
    const progressRate =
      totalRequired > 0
        ? Math.round((totalComplete / totalRequired) * 100)
        : 0;

    return {
      totalEligible,
      totalWithGroup,
      totalWithoutGroup,
      groupRate,
      totalTopics,
      totalUnderway,
      topicRate,
      totalLecturers,
      avgGroups,
      totalSupervisionStudents,
      atCapacity,
      totalRequired,
      totalComplete,
      totalAwaiting,
      progressRate,
    };
  }, [data]);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* 1. Sinh viên */}
      <Card className="border-border bg-card/70 py-4 shadow-xs">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xs font-medium text-muted-foreground">
            Sinh viên đủ điều kiện
          </CardTitle>
          <div className="flex size-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
            <Users className="size-4" />
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-2xl font-bold tabular-nums text-foreground">
            {stats.totalEligible.toLocaleString('vi-VN')}
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="font-medium text-emerald-500 tabular-nums">
              {stats.totalWithGroup} đã có nhóm ({stats.groupRate}%)
            </span>
            {stats.totalWithoutGroup > 0 && (
              <span>· {stats.totalWithoutGroup} chưa có</span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 2. Đề tài */}
      <Card className="border-border bg-card/70 py-4 shadow-xs">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xs font-medium text-muted-foreground">
            Đề tài thực hiện
          </CardTitle>
          <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
            <BookOpen className="size-4" />
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-2xl font-bold tabular-nums text-foreground">
            {stats.totalUnderway}
            <span className="text-base font-normal text-muted-foreground">
              /{stats.totalTopics}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="font-medium text-blue-500 tabular-nums">
              {stats.topicRate}% chỉ tiêu
            </span>
            <span>· {stats.totalTopics - stats.totalUnderway} còn trống</span>
          </div>
        </CardContent>
      </Card>

      {/* 3. Giảng viên hướng dẫn */}
      <Card className="border-border bg-card/70 py-4 shadow-xs">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xs font-medium text-muted-foreground">
            Định mức hướng dẫn
          </CardTitle>
          <div className="flex size-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
            <GraduationCap className="size-4" />
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-2xl font-bold tabular-nums text-foreground">
            {stats.avgGroups}{' '}
            <span className="text-base font-normal text-muted-foreground">
              nhóm / GV
            </span>
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>{stats.totalLecturers} giảng viên</span>
            {stats.atCapacity > 0 ? (
              <span className="font-medium text-amber-500 tabular-nums">
                · {stats.atCapacity} GV đạt trần (5)
              </span>
            ) : (
              <span>· đều trong định mức</span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 4. Tiến độ */}
      <Card className="border-border bg-card/70 py-4 shadow-xs">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xs font-medium text-muted-foreground">
            Tiến độ nộp bài
          </CardTitle>
          <div className="flex size-7 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-500">
            <CheckCircle2 className="size-4" />
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-2xl font-bold tabular-nums text-foreground">
            {stats.progressRate}%
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="tabular-nums">
              {stats.totalComplete}/{stats.totalRequired} lượt nộp
            </span>
            {stats.totalAwaiting > 0 && (
              <span className="font-medium text-blue-500 tabular-nums">
                · {stats.totalAwaiting} chờ xét
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ── Biểu đồ 1: Giảng viên hướng dẫn (Horizontal Bar) ── */
export function SupervisionChart({
  rows,
  height = 340,
}: {
  rows: SupervisionRow[];
  height?: number;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const chartData = useMemo(() => {
    return [...rows]
      .sort((a, b) => b.groups - a.groups || b.students - a.students)
      .map((r) => {
        const titlePrefix = r.academicTitle ? `${r.academicTitle} ` : '';
        return {
          id: r.lecturerId,
          name: `${titlePrefix}${r.fullName}`,
          groups: r.groups,
          students: r.students,
        };
      });
  }, [rows]);

  if (!mounted) {
    return (
      <div
        className="w-full animate-pulse rounded-lg bg-muted/20"
        style={{ height }}
      />
    );
  }

  if (chartData.length === 0) {
    return (
      <div
        className="flex w-full items-center justify-center text-xs text-muted-foreground"
        style={{ height }}
      >
        Chưa có dữ liệu hướng dẫn cho học kỳ này.
      </div>
    );
  }

  const finalHeight = Math.max(height, chartData.length * 36);

  return (
    <div className="w-full" style={{ height: finalHeight }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 8, right: 24, left: 10, bottom: 8 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            horizontal={false}
            stroke="var(--border, #383838)"
            opacity={0.4}
          />
          <XAxis
            type="number"
            domain={[0, 'dataMax + 1']}
            allowDecimals={false}
            tick={{ fill: 'var(--muted-foreground, #a3a3a3)', fontSize: 11 }}
            axisLine={{ stroke: 'var(--border, #383838)' }}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={140}
            tick={{
              fill: 'var(--foreground, #f5f5f5)',
              fontSize: 12,
              fontWeight: 500,
            }}
            axisLine={{ stroke: 'var(--border, #383838)' }}
          />
          <Tooltip content={<CleanTooltip />} />
          <Legend
            verticalAlign="top"
            align="right"
            wrapperStyle={{ paddingBottom: 10, fontSize: 11 }}
            formatter={(value) => (
              <span className="text-xs font-medium text-foreground">{value}</span>
            )}
          />
          <ReferenceLine
            x={5}
            stroke={PALETTE.amber}
            strokeDasharray="4 4"
            label={{
              value: 'Định mức: 5 nhóm',
              fill: PALETTE.amber,
              fontSize: 10,
              position: 'insideTopRight',
            }}
          />
          <Bar
            dataKey="groups"
            name="Số nhóm"
            fill={PALETTE.blue}
            radius={[0, 4, 4, 0]}
            maxBarSize={18}
          />
          <Bar
            dataKey="students"
            name="Số sinh viên"
            fill={PALETTE.emerald}
            radius={[0, 4, 4, 0]}
            maxBarSize={18}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ── Biểu đồ 2: Chỉ tiêu & Ghép nhóm theo Đợt (Grouped Bar) ── */
export function RoundsChart({
  rows,
  height = 340,
}: {
  rows: RoundReportRow[];
  height?: number;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const chartData = useMemo(() => {
    return rows.map((r) => ({
      name: r.projectType.name,
      code: r.projectType.code || r.projectType.name,
      eligible: r.eligible,
      withGroup: r.withGroup,
      withoutGroup: r.withoutGroup,
      topicsUnderway: r.topicsUnderway,
      selfRegistered: r.selfRegistered,
      assigned: r.assigned,
    }));
  }, [rows]);

  if (!mounted) {
    return (
      <div
        className="w-full animate-pulse rounded-lg bg-muted/20"
        style={{ height }}
      />
    );
  }

  if (chartData.length === 0) {
    return (
      <div
        className="flex w-full items-center justify-center text-xs text-muted-foreground"
        style={{ height }}
      >
        Chưa có dữ liệu đợt đăng ký.
      </div>
    );
  }

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 8, right: 16, left: -10, bottom: 8 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="var(--border, #383838)"
            opacity={0.4}
          />
          <XAxis
            dataKey="name"
            tick={{
              fill: 'var(--foreground, #f5f5f5)',
              fontSize: 12,
              fontWeight: 500,
            }}
            axisLine={{ stroke: 'var(--border, #383838)' }}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: 'var(--muted-foreground, #a3a3a3)', fontSize: 11 }}
            axisLine={{ stroke: 'var(--border, #383838)' }}
          />
          <Tooltip content={<CleanTooltip />} />
          <Legend
            verticalAlign="top"
            align="right"
            wrapperStyle={{ paddingBottom: 10, fontSize: 11 }}
            formatter={(value) => (
              <span className="text-xs font-medium text-foreground">{value}</span>
            )}
          />
          <Bar
            dataKey="eligible"
            name="Thuộc diện"
            fill={PALETTE.slate}
            radius={[4, 4, 0, 0]}
            maxBarSize={28}
          />
          <Bar
            dataKey="withGroup"
            name="Đã có nhóm"
            fill={PALETTE.emerald}
            radius={[4, 4, 0, 0]}
            maxBarSize={28}
          />
          <Bar
            dataKey="withoutGroup"
            name="Chưa có nhóm"
            fill={PALETTE.rose}
            radius={[4, 4, 0, 0]}
            maxBarSize={28}
          />
          <Bar
            dataKey="topicsUnderway"
            name="Đề tài đang làm"
            fill={PALETTE.purple}
            radius={[4, 4, 0, 0]}
            maxBarSize={28}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ── Biểu đồ 3: Cơ cấu Chuyên ngành (Donut Chart & Legend) ── */
export function MajorsChart({
  rows,
  height = 340,
}: {
  rows: MajorReportRow[];
  height?: number;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const totalStudents = useMemo(
    () => rows.reduce((acc, r) => acc + r.students, 0),
    [rows],
  );

  const chartData = useMemo(() => {
    return rows.map((r, index) => {
      const percentage =
        totalStudents > 0
          ? ((r.students / totalStudents) * 100).toFixed(1)
          : '0';
      return {
        name: r.name,
        code: r.code,
        value: r.students,
        withGroup: r.withGroup,
        percentage,
        fill: PIE_COLORS[index % PIE_COLORS.length],
      };
    });
  }, [rows, totalStudents]);

  if (!mounted) {
    return (
      <div
        className="w-full animate-pulse rounded-lg bg-muted/20"
        style={{ height }}
      />
    );
  }

  if (chartData.length === 0) {
    return (
      <div
        className="flex w-full items-center justify-center text-xs text-muted-foreground"
        style={{ height }}
      >
        Chưa có dữ liệu chuyên ngành.
      </div>
    );
  }

  return (
    <div
      className="flex flex-col items-center justify-center gap-4 sm:flex-row"
      style={{ minHeight: height }}
    >
      <div className="relative size-[220px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              innerRadius={65}
              outerRadius={95}
              paddingAngle={4}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} stroke="transparent" />
              ))}
            </Pie>
            <Tooltip content={<CleanTooltip suffix=" SV" />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-xl font-bold tabular-nums text-foreground">
            {totalStudents}
          </span>
          <span className="text-[11px] text-muted-foreground">Sinh viên</span>
        </div>
      </div>

      {/* Legend list */}
      <div className="w-full max-w-xs space-y-2 text-xs">
        {chartData.map((item) => (
          <div
            key={item.name}
            className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 px-3 py-2"
          >
            <div className="flex items-center gap-2 truncate">
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: item.fill }}
              />
              <span className="truncate font-medium text-foreground">
                {item.name}
              </span>
            </div>
            <div className="ml-2 shrink-0 text-right tabular-nums">
              <span className="font-semibold text-foreground">
                {item.value} SV
              </span>
              <span className="ml-1 text-[11px] text-muted-foreground">
                ({item.percentage}%)
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Biểu đồ 4: Tiến độ nộp bài các mốc (Horizontal Stacked Bar) ── */
export function ProgressMilestonesChart({
  rows,
  height = 300,
}: {
  rows: ProgressRow[];
  height?: number;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const chartData = useMemo(() => {
    return rows.flatMap((r) =>
      r.items.map((item) => {
        const rate =
          r.groups > 0 ? Math.round((item.submitted / r.groups) * 100) : 0;
        const roundCode = r.projectType.code || r.projectType.name;

        let cleanName = item.name;
        if (
          cleanName.toLowerCase().includes('m03') ||
          cleanName.toLowerCase().includes('đề cương')
        ) {
          cleanName = 'Đề cương (M03)';
        } else if (cleanName.includes('Tiến độ 1')) {
          cleanName = 'Tiến độ 1 (20%)';
        } else if (cleanName.includes('Tiến độ 2')) {
          cleanName = 'Tiến độ 2 (30%)';
        } else if (
          cleanName.toLowerCase().includes('toàn văn') ||
          cleanName.toLowerCase().includes('slide')
        ) {
          cleanName = 'Toàn văn & Slide (50%)';
        } else if (
          cleanName.toLowerCase().includes('số hóa') ||
          cleanName.toLowerCase().includes('thư mục')
        ) {
          cleanName = 'Hồ sơ số hóa';
        } else {
          cleanName = cleanName.replace(/Báo cáo\s*/gi, '').trim();
        }

        const displayName = `${roundCode} · ${cleanName}`;

        return {
          name: displayName,
          fullName: `${roundCode} - ${item.name}`,
          shortName: cleanName,
          roundName: r.projectType.name,
          submitted: item.submitted,
          totalGroups: r.groups,
          unsubmitted: Math.max(0, r.groups - item.submitted),
          completionRate: `${rate}%`,
          isRequired: item.isRequired,
        };
      }),
    );
  }, [rows]);

  if (!mounted) {
    return (
      <div
        className="w-full animate-pulse rounded-lg bg-muted/20"
        style={{ height }}
      />
    );
  }

  if (chartData.length === 0) {
    return (
      <div
        className="flex w-full items-center justify-center text-xs text-muted-foreground"
        style={{ height }}
      >
        Chưa có yêu cầu mốc tiến độ nào trong học kỳ này.
      </div>
    );
  }

  const finalHeight = Math.max(height, chartData.length * 40);

  return (
    <div className="w-full" style={{ height: finalHeight }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 8, right: 24, left: 10, bottom: 8 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            horizontal={false}
            stroke="var(--border, #383838)"
            opacity={0.4}
          />
          <XAxis
            type="number"
            domain={[0, 'dataMax + 1']}
            allowDecimals={false}
            tick={{ fill: 'var(--muted-foreground, #a3a3a3)', fontSize: 11 }}
            axisLine={{ stroke: 'var(--border, #383838)' }}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={185}
            tick={{
              fill: 'var(--foreground, #f5f5f5)',
              fontSize: 11,
              fontWeight: 500,
            }}
            axisLine={{ stroke: 'var(--border, #383838)' }}
          />
          <Tooltip content={<CleanTooltip />} />
          <Legend
            verticalAlign="top"
            align="right"
            wrapperStyle={{ paddingBottom: 10, fontSize: 11 }}
            formatter={(value) => (
              <span className="text-xs font-medium text-foreground">{value}</span>
            )}
          />
          <Bar
            dataKey="submitted"
            name="Đã nộp"
            fill={PALETTE.emerald}
            stackId="progress"
            radius={[0, 0, 0, 0]}
            maxBarSize={18}
          />
          <Bar
            dataKey="unsubmitted"
            name="Chưa nộp"
            fill={PALETTE.rose}
            stackId="progress"
            radius={[0, 4, 4, 0]}
            maxBarSize={18}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ── Suite Selector & Layout Manager ── */
export type ChartViewTab = 'all' | 'supervision' | 'rounds' | 'majors' | 'progress';

export function ReportChartSuite({ data }: { data: FacultyReport }) {
  const [activeTab, setActiveTab] = useState<ChartViewTab>('all');

  const tabs: Array<{ id: ChartViewTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'all', label: 'Tất cả biểu đồ', icon: Layers },
    { id: 'supervision', label: 'Giảng viên hướng dẫn', icon: GraduationCap },
    { id: 'rounds', label: 'Chỉ tiêu theo đợt', icon: BookOpen },
    { id: 'majors', label: 'Cơ cấu chuyên ngành', icon: PieChartIcon },
    { id: 'progress', label: 'Tiến độ nộp bài', icon: CheckCircle2 },
  ];

  return (
    <div className="space-y-4">
      {/* Switcher Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-border/80 bg-muted/40 p-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all cursor-pointer',
                  isSelected
                    ? 'bg-primary text-white shadow-xs'
                    : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground',
                )}
              >
                <Icon className="size-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <span className="text-xs text-muted-foreground tabular-nums">
          {activeTab === 'all'
            ? 'Tổng quan 4 góc'
            : tabs.find((t) => t.id === activeTab)?.label}
        </span>
      </div>

      {/* Render Charts Based on Tab */}
      {activeTab === 'all' && (
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Chart 1 */}
          <Card className="border-border bg-card/80 shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-semibold tracking-tight">
                Giảng viên hướng dẫn
              </CardTitle>
              <span className="text-xs text-muted-foreground tabular-nums">
                {data.supervision.length} GV
              </span>
            </CardHeader>
            <CardContent>
              <SupervisionChart rows={data.supervision} height={280} />
            </CardContent>
          </Card>

          {/* Chart 2 */}
          <Card className="border-border bg-card/80 shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-semibold tracking-tight">
                Chỉ tiêu & Ghép nhóm theo Đợt
              </CardTitle>
              <span className="text-xs text-muted-foreground tabular-nums">
                {data.rounds.length} đợt
              </span>
            </CardHeader>
            <CardContent>
              <RoundsChart rows={data.rounds} height={280} />
            </CardContent>
          </Card>

          {/* Chart 3 */}
          <Card className="border-border bg-card/80 shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-semibold tracking-tight">
                Cơ cấu theo Chuyên ngành
              </CardTitle>
              <span className="text-xs text-muted-foreground tabular-nums">
                {data.majors.length} ngành
              </span>
            </CardHeader>
            <CardContent>
              <MajorsChart rows={data.majors} height={260} />
            </CardContent>
          </Card>

          {/* Chart 4 */}
          <Card className="border-border bg-card/80 shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-semibold tracking-tight">
                Tiến độ nộp bài các mốc
              </CardTitle>
              <span className="text-xs text-muted-foreground tabular-nums">
                {data.progress.reduce((acc, p) => acc + p.items.length, 0)} mốc
              </span>
            </CardHeader>
            <CardContent>
              <ProgressMilestonesChart rows={data.progress} height={260} />
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'supervision' && (
        <Card className="border-border bg-card/80 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-semibold tracking-tight">
              Giảng viên hướng dẫn
            </CardTitle>
            <span className="text-xs text-muted-foreground tabular-nums">
              Tổng số {data.supervision.length} giảng viên
            </span>
          </CardHeader>
          <CardContent>
            <SupervisionChart rows={data.supervision} height={420} />
          </CardContent>
        </Card>
      )}

      {activeTab === 'rounds' && (
        <Card className="border-border bg-card/80 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-semibold tracking-tight">
              Chỉ tiêu & Ghép nhóm theo Đợt
            </CardTitle>
            <span className="text-xs text-muted-foreground tabular-nums">
              {data.rounds.length} đợt đăng ký
            </span>
          </CardHeader>
          <CardContent>
            <RoundsChart rows={data.rounds} height={400} />
          </CardContent>
        </Card>
      )}

      {activeTab === 'majors' && (
        <Card className="border-border bg-card/80 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-semibold tracking-tight">
              Cơ cấu theo Chuyên ngành
            </CardTitle>
            <span className="text-xs text-muted-foreground tabular-nums">
              {data.majors.length} chuyên ngành
            </span>
          </CardHeader>
          <CardContent className="py-6">
            <MajorsChart rows={data.majors} height={360} />
          </CardContent>
        </Card>
      )}

      {activeTab === 'progress' && (
        <Card className="border-border bg-card/80 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-semibold tracking-tight">
              Tiến độ nộp bài các mốc
            </CardTitle>
            <span className="text-xs text-muted-foreground tabular-nums">
              {data.progress.reduce((acc, p) => acc + p.items.length, 0)} mốc yêu cầu
            </span>
          </CardHeader>
          <CardContent>
            <ProgressMilestonesChart rows={data.progress} height={400} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
