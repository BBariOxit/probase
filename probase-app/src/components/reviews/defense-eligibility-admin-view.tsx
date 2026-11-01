'use client';

import { useState } from 'react';
import {
  AlertTriangle,
  Award,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  FileText,
  Filter,
  GraduationCap,
  Layers,
  Loader2,
  Search,
  ShieldAlert,
  ShieldCheck,
  User,
  Users,
  XCircle,
} from 'lucide-react';
import { useMajors } from '@/lib/api/majors';
import { useDefenseEligibility } from '@/lib/api/reviews';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TopicReviewDialog } from './topic-review-dialog';

export function DefenseEligibilityAdminView() {
  const [selectedMajorId, setSelectedMajorId] = useState<number | undefined>();
  const [selectedStatus, setSelectedStatus] = useState<
    'ALL' | 'ELIGIBLE' | 'NOT_ELIGIBLE' | 'PENDING'
  >('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [inspectingItem, setInspectingItem] = useState<any | null>(null);

  const { data: majors } = useMajors();

  const { data, isPending, error } = useDefenseEligibility({
    majorId: selectedMajorId,
    status: selectedStatus,
    search: searchQuery.trim() || undefined,
    limit: 50,
  });

  const stats = data?.stats || {
    totalGroups: 0,
    eligibleCount: 0,
    notEligibleCount: 0,
    pendingCount: 0,
  };

  const items = data?.items || [];

  // Export CSV of eligible groups
  const handleExportCsv = () => {
    if (!items.length) return;

    const headers = [
      'STT',
      'Mã nhóm',
      'Tên đề tài',
      'Chuyên ngành',
      'Loại đồ án',
      'Sinh viên thực hiện',
      'GVHD',
      'GVPB',
      'Tiến độ 2 (%)',
      'Kết quả TĐ2',
      'GVHD Cho bảo vệ',
      'GVPB Cho bảo vệ',
      'Trạng thái thẩm định',
    ];

    const rows = items.map((item, idx) => {
      const studentNames = item.members
        .map((m) => `${m.fullName} (${m.studentCode})`)
        .join('; ');

      return [
        idx + 1,
        item.name || item.id,
        `"${item.topic?.title?.replace(/"/g, '""') || ''}"`,
        item.topic?.major?.name || '—',
        item.topic?.round?.projectType?.name || '—',
        `"${studentNames}"`,
        item.supervisor?.fullName || '—',
        item.reviewer?.fullName || '—',
        item.stage2?.workloadPercentage ?? 0,
        item.stage2?.isPassed ? 'Đạt' : 'Chưa đạt',
        item.supervisorReview
          ? item.supervisorReview.isDefenseAllowed
            ? 'Đồng ý'
            : 'Không'
          : 'Chưa duyệt',
        item.reviewerReview
          ? item.reviewerReview.isDefenseAllowed
            ? 'Đồng ý'
            : 'Không'
          : 'Chưa duyệt',
        item.status === 'ELIGIBLE'
          ? 'ĐỦ ĐIỀU KIỆN'
          : item.status === 'NOT_ELIGIBLE'
          ? 'TỪ CHỐI'
          : 'ĐANG CHỜ',
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `DS_Tham_Dinh_Dieu_Kien_Bao_Ve_${new Date().toISOString().slice(0, 10)}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* 4 Stats Cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-xs font-medium text-muted-foreground">
            Tổng số nhóm đề tài
          </p>
          <p className="mt-1 font-heading text-2xl font-bold tracking-tight">
            {stats.totalGroups}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            toàn bộ đợt đồ án
          </p>
        </div>

        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 shadow-sm">
          <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
            <ShieldCheck className="size-4" />
            Đủ điều kiện ra Hội đồng
          </p>
          <p className="mt-1 font-heading text-2xl font-bold tracking-tight text-emerald-700 dark:text-emerald-300">
            {stats.eligibleCount}
          </p>
          <p className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80 mt-0.5">
            Cả 2 GV đồng ý & TĐ2 ≥ 50%
          </p>
        </div>

        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 shadow-sm">
          <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
            <Clock className="size-4" />
            Chờ thẩm định
          </p>
          <p className="mt-1 font-heading text-2xl font-bold tracking-tight text-amber-700 dark:text-amber-300">
            {stats.pendingCount}
          </p>
          <p className="text-[11px] text-amber-600/80 dark:text-amber-400/80 mt-0.5">
            Chưa đủ 2/2 nhận xét
          </p>
        </div>

        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 shadow-sm">
          <p className="text-xs font-semibold text-destructive flex items-center gap-1.5">
            <ShieldAlert className="size-4" />
            Từ chối / Đình chỉ
          </p>
          <p className="mt-1 font-heading text-2xl font-bold tracking-tight text-destructive">
            {stats.notEligibleCount}
          </p>
          <p className="text-[11px] text-destructive/80 mt-0.5">
            Không đạt hoặc GV từ chối
          </p>
        </div>
      </div>

      {/* Filter and Action Bar */}
      <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative min-w-[220px]">
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Tìm theo tên đề tài, SV, MSSV..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 text-xs"
            />
          </div>

          {/* Specialization Filter */}
          {majors && majors.length > 0 && (
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant={selectedMajorId === undefined ? 'default' : 'outline'}
                className="h-8 text-xs"
                onClick={() => setSelectedMajorId(undefined)}
              >
                Tất cả ngành
              </Button>
              {majors.map((m) => (
                <Button
                  key={m.id}
                  size="sm"
                  variant={selectedMajorId === m.id ? 'default' : 'outline'}
                  className="h-8 text-xs"
                  onClick={() => setSelectedMajorId(m.id)}
                >
                  {m.code || m.name}
                </Button>
              ))}
            </div>
          )}

          {/* Status Filter */}
          <div className="flex items-center gap-1 border-l pl-2">
            <Button
              size="sm"
              variant={selectedStatus === 'ALL' ? 'secondary' : 'ghost'}
              className="h-8 text-xs"
              onClick={() => setSelectedStatus('ALL')}
            >
              Tất cả
            </Button>
            <Button
              size="sm"
              variant={selectedStatus === 'ELIGIBLE' ? 'secondary' : 'ghost'}
              className="h-8 text-xs text-emerald-600 dark:text-emerald-400"
              onClick={() => setSelectedStatus('ELIGIBLE')}
            >
              Đủ ĐK
            </Button>
            <Button
              size="sm"
              variant={selectedStatus === 'PENDING' ? 'secondary' : 'ghost'}
              className="h-8 text-xs text-amber-600 dark:text-amber-400"
              onClick={() => setSelectedStatus('PENDING')}
            >
              Chờ duyệt
            </Button>
            <Button
              size="sm"
              variant={selectedStatus === 'NOT_ELIGIBLE' ? 'secondary' : 'ghost'}
              className="h-8 text-xs text-destructive"
              onClick={() => setSelectedStatus('NOT_ELIGIBLE')}
            >
              Đình chỉ
            </Button>
          </div>
        </div>

        {/* Export CSV Button */}
        <Button
          size="sm"
          variant="outline"
          className="h-8 text-xs gap-1.5 shrink-0"
          onClick={handleExportCsv}
          disabled={!items.length}
        >
          <Download className="size-3.5" />
          Xuất danh sách đối soát (CSV)
        </Button>
      </div>

      {/* Main Table */}
      {isPending ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-xs text-destructive">
          Không tải được danh sách đối soát điều kiện bảo vệ.
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center text-xs text-muted-foreground">
          Không tìm thấy nhóm đồ án nào phù hợp với điều kiện lọc.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b bg-muted/40 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Đề tài & Thành viên</th>
                  <th className="px-4 py-3">GVHD & GVPB</th>
                  <th className="px-3 py-3 text-center">Tiến độ 2</th>
                  <th className="px-3 py-3 text-center">Nhận xét GVHD</th>
                  <th className="px-3 py-3 text-center">Nhận xét GVPB</th>
                  <th className="px-4 py-3 text-center">Điều kiện bảo vệ</th>
                  <th className="px-4 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((item) => {
                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-muted/20 transition-colors"
                    >
                      {/* Đề tài & Thành viên */}
                      <td className="px-4 py-3 max-w-[280px]">
                        <p className="font-semibold text-foreground leading-snug">
                          {item.topic?.title}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          {item.topic?.round?.projectType && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              {item.topic.round.projectType.name}
                            </Badge>
                          )}
                          {item.topic?.major && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                              {item.topic.major.code || item.topic.major.name}
                            </Badge>
                          )}
                        </div>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {item.members.map((m) => `${m.fullName} (${m.studentCode})`).join(', ')}
                        </p>
                      </td>

                      {/* GVHD & GVPB */}
                      <td className="px-4 py-3 whitespace-nowrap space-y-1">
                        <div>
                          <span className="text-[10px] font-medium text-muted-foreground">
                            HD:{' '}
                          </span>
                          <span className="font-semibold text-foreground">
                            {item.supervisor?.fullName || '—'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] font-medium text-muted-foreground">
                            PB:{' '}
                          </span>
                          <span className="text-foreground">
                            {item.reviewer?.fullName || (
                              <span className="italic text-muted-foreground">
                                Chưa phân công
                              </span>
                            )}
                          </span>
                        </div>
                      </td>

                      {/* Tiến độ 2 */}
                      <td className="px-3 py-3 text-center whitespace-nowrap">
                        <Badge
                          variant="outline"
                          className={
                            item.stage2.isPassed
                              ? 'text-emerald-600 border-emerald-300 dark:text-emerald-400 font-semibold'
                              : 'text-destructive border-destructive/30 font-semibold'
                          }
                        >
                          {item.stage2.workloadPercentage ?? 0}% (
                          {item.stage2.isPassed ? 'Đạt' : 'Chưa đạt'})
                        </Badge>
                      </td>

                      {/* Nhận xét GVHD */}
                      <td className="px-3 py-3 text-center whitespace-nowrap">
                        {item.supervisorReview ? (
                          <Badge
                            className={
                              item.supervisorReview.isDefenseAllowed
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-bold'
                                : 'bg-destructive/10 text-destructive border-destructive/20 font-bold'
                            }
                          >
                            {item.supervisorReview.isDefenseAllowed
                              ? '✓ Cho bảo vệ'
                              : '✕ Không cho'}
                          </Badge>
                        ) : (
                          <span className="text-[11px] text-muted-foreground italic">
                            Chưa nộp
                          </span>
                        )}
                      </td>

                      {/* Nhận xét GVPB */}
                      <td className="px-3 py-3 text-center whitespace-nowrap">
                        {item.reviewerReview ? (
                          <Badge
                            className={
                              item.reviewerReview.isDefenseAllowed
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-bold'
                                : 'bg-destructive/10 text-destructive border-destructive/20 font-bold'
                            }
                          >
                            {item.reviewerReview.isDefenseAllowed
                              ? '✓ Cho bảo vệ'
                              : '✕ Không cho'}
                          </Badge>
                        ) : (
                          <span className="text-[11px] text-muted-foreground italic">
                            Chưa nộp
                          </span>
                        )}
                      </td>

                      {/* Kết luận điều kiện */}
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        {item.status === 'ELIGIBLE' ? (
                          <Badge className="bg-emerald-600 text-white font-bold text-xs gap-1">
                            <ShieldCheck className="size-3" />
                            ĐỦ ĐIỀU KIỆN
                          </Badge>
                        ) : item.status === 'NOT_ELIGIBLE' ? (
                          <Badge variant="destructive" className="font-bold text-xs gap-1">
                            <ShieldAlert className="size-3" />
                            ĐÌNH CHỈ
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-amber-600 border-amber-300 font-semibold text-xs gap-1">
                            <Clock className="size-3" />
                            CHỜ DUYỆT
                          </Badge>
                        )}
                      </td>

                      {/* Thao tác */}
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs text-primary"
                          onClick={() => setInspectingItem(item)}
                        >
                          <FileText className="size-3 mr-1" />
                          Xem chi tiết
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Inspecting Dialog */}
      {inspectingItem && (
        <TopicReviewDialog
          open={!!inspectingItem}
          onOpenChange={(open) => !open && setInspectingItem(null)}
          groupId={inspectingItem.id}
          groupName={inspectingItem.name}
          topicTitle={inspectingItem.topic?.title || ''}
          projectTypeName={inspectingItem.topic?.round?.projectType?.name}
          projectTypeCode={inspectingItem.topic?.round?.projectType?.code}
          role="SUPERVISOR"
          expectedTemplate={
            inspectingItem.topic?.round?.projectType?.code === 'KLTN' ? 'M04' : 'M02'
          }
          supervisorName={inspectingItem.supervisor?.fullName}
          reviewerName={inspectingItem.reviewer?.fullName}
          members={inspectingItem.members}
          stage2Report={inspectingItem.stage2}
        />
      )}
    </div>
  );
}
