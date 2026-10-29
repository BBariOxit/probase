'use client';

import { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Filter,
  GraduationCap,
  Layers,
  Loader2,
  Search,
  Sparkles,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { useMajors } from '@/lib/api/majors';
import {
  useAssignReviewer,
  useReviewAssignmentsOverview,
  useUnassignReviewer,
} from '@/lib/api/reviewers';
import { useRequireRole } from '@/lib/auth/use-require-role';
import { AutoAssignDialog } from '@/components/reviewers/auto-assign-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function ReviewersAdminPage() {
  const allowed = useRequireRole(['ADMIN', 'LECTURER']);

  const [selectedMajorId, setSelectedMajorId] = useState<number | undefined>();
  const [selectedStatus, setSelectedStatus] = useState<
    'ALL' | 'ASSIGNED' | 'UNASSIGNED'
  >('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [autoAssignOpen, setAutoAssignOpen] = useState(false);

  const { data: majors } = useMajors();

  const {
    data: overview,
    isPending,
    error,
  } = useReviewAssignmentsOverview({
    majorId: selectedMajorId,
    status: selectedStatus,
    q: searchQuery.trim() || undefined,
  });

  const assign = useAssignReviewer();
  const unassign = useUnassignReviewer();

  if (!allowed) return null;

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">
            Phân công Giảng viên phản biện (GVPB)
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Quản lý và ghép cặp Giảng viên phản biện cho các nhóm đồ án theo Bộ
            môn và cân bằng tải công việc.
          </p>
        </div>

        <Button
          onClick={() => setAutoAssignOpen(true)}
          className="shrink-0 gap-2"
        >
          <Sparkles className="size-4" />
          Phân công tự động
        </Button>
      </div>

      {/* Stats Cards */}
      {overview?.stats && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border bg-card p-4">
            <p className="text-xs font-medium text-muted-foreground">
              Tổng số đề tài
            </p>
            <p className="mt-1 text-2xl font-bold">
              {overview.stats.totalGroups}
            </p>
          </div>
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
            <p className="text-xs font-medium text-emerald-800 dark:text-emerald-300">
              Đã phân công phản biện
            </p>
            <p className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {overview.stats.assignedCount}
            </p>
          </div>
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
            <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
              Chưa phân công phản biện
            </p>
            <p className="mt-1 text-2xl font-bold text-amber-600 dark:text-amber-400">
              {overview.stats.unassignedCount}
            </p>
          </div>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-3.5">
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="size-4 text-muted-foreground" />

          {/* Major Filter */}
          <select
            value={selectedMajorId ?? ''}
            onChange={(e) =>
              setSelectedMajorId(
                e.target.value ? Number(e.target.value) : undefined,
              )
            }
            className="h-8 rounded-lg border bg-background px-2.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">Tất cả Bộ môn / Chuyên ngành</option>
            {majors?.map((major) => (
              <option key={major.id} value={major.id}>
                {major.name} ({major.code})
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) =>
              setSelectedStatus(
                e.target.value as 'ALL' | 'ASSIGNED' | 'UNASSIGNED',
              )
            }
            className="h-8 rounded-lg border bg-background px-2.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="UNASSIGNED">Chưa phân công</option>
            <option value="ASSIGNED">Đã phân công</option>
          </select>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Tìm đề tài, GVHD, tên nhóm..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 pl-8 text-xs"
          />
        </div>
      </div>

      {/* Main Content */}
      {isPending ? (
        <div className="flex justify-center py-20">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
          Không tải được dữ liệu phân công: {error.message}
        </div>
      ) : overview.groups.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center">
          <p className="text-sm font-medium text-muted-foreground">
            Không tìm thấy đề tài nào phù hợp với bộ lọc hiện tại.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b bg-muted/40 font-medium text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Đề tài & Chuyên ngành</th>
                  <th className="px-4 py-3">Nhóm sinh viên</th>
                  <th className="px-4 py-3">Giảng viên hướng dẫn</th>
                  <th className="px-4 py-3">Giảng viên phản biện (GVPB)</th>
                  <th className="px-4 py-3 text-right">Tiến độ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {overview.groups.map((group) => {
                  const supervisorId = group.topic.lecturer.id;
                  const topicMajorId = group.topic.majorId;

                  // Lọc ứng viên GVPB:
                  // 1. Không trùng GVHD
                  // 2. Cùng chuyên ngành/bộ môn
                  const eligibleCandidates = overview.candidates.filter(
                    (cand) => {
                      if (cand.id === supervisorId) return false;
                      if (
                        topicMajorId &&
                        cand.majorId &&
                        cand.majorId !== topicMajorId
                      )
                        return false;
                      return true;
                    },
                  );

                  const stage1 = group.progressReports.find(
                    (r) => r.stage === 'STAGE_1',
                  );
                  const stage2 = group.progressReports.find(
                    (r) => r.stage === 'STAGE_2',
                  );

                  return (
                    <tr
                      key={group.id}
                      className="transition-colors hover:bg-muted/20"
                    >
                      {/* Đề tài */}
                      <td className="max-w-xs px-4 py-3.5">
                        <p className="font-semibold text-foreground line-clamp-2">
                          {group.topic.title}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          {group.topic.major && (
                            <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                              {group.topic.major.code}
                            </span>
                          )}
                          {group.topic.round?.projectType && (
                            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                              <Layers className="size-3" />
                              {group.topic.round.projectType.name}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Sinh viên */}
                      <td className="px-4 py-3.5">
                        <div className="space-y-0.5">
                          {group.members.map((m) => (
                            <p
                              key={m.student.id}
                              className="font-medium text-foreground"
                            >
                              {m.student.fullName}{' '}
                              <span className="text-[11px] font-normal text-muted-foreground">
                                ({m.student.studentCode}
                                {m.student.class ? ` - ${m.student.class}` : ''}
                                )
                              </span>
                            </p>
                          ))}
                        </div>
                      </td>

                      {/* GVHD */}
                      <td className="px-4 py-3.5">
                        <div className="inline-flex items-center gap-1.5 font-medium text-foreground">
                          <GraduationCap className="size-4 shrink-0 text-muted-foreground" />
                          <span>
                            {group.topic.lecturer.academicTitle
                              ? `${group.topic.lecturer.academicTitle} `
                              : ''}
                            {group.topic.lecturer.fullName}
                          </span>
                        </div>
                      </td>

                      {/* GVPB */}
                      <td className="px-4 py-3.5">
                        {group.assignment ? (
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-800 dark:text-emerald-300">
                              <UserCheck className="size-3.5" />
                              {group.assignment.reviewer.academicTitle
                                ? `${group.assignment.reviewer.academicTitle} `
                                : ''}
                              {group.assignment.reviewer.fullName}
                            </span>
                            <button
                              type="button"
                              title="Hủy phân công"
                              onClick={() => unassign.mutate(group.id)}
                              disabled={unassign.isPending}
                              className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-destructive focus:outline-none"
                            >
                              <X className="size-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <select
                              defaultValue=""
                              onChange={(e) => {
                                if (e.target.value) {
                                  assign.mutate({
                                    groupId: group.id,
                                    reviewerId: Number(e.target.value),
                                  });
                                }
                              }}
                              disabled={assign.isPending}
                              className="h-8 max-w-[220px] rounded-lg border border-amber-500/30 bg-amber-500/5 px-2 text-xs font-medium text-amber-900 focus:outline-none focus:ring-1 focus:ring-ring dark:text-amber-200"
                            >
                              <option value="" disabled>
                                ⚠️ Chọn GVPB...
                              </option>
                              {eligibleCandidates.map((cand) => (
                                <option key={cand.id} value={cand.id}>
                                  {cand.academicTitle
                                    ? `${cand.academicTitle} `
                                    : ''}
                                  {cand.fullName} (HD: {cand.supervisedCount} |
                                  PB: {cand.reviewingCount})
                                </option>
                              ))}
                            </select>
                            {assign.isPending && (
                              <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
                            )}
                          </div>
                        )}
                      </td>

                      {/* Tiến độ */}
                      <td className="px-4 py-3.5 text-right">
                        <div className="inline-flex flex-col items-end gap-1">
                          <span className="text-[11px] text-muted-foreground">
                            Đợt 1:{' '}
                            {stage1?.finalStageGrade !== undefined &&
                            stage1?.finalStageGrade !== null ? (
                              <span className="font-semibold text-foreground">
                                {stage1.finalStageGrade.toFixed(1)}đ
                              </span>
                            ) : (
                              'Chưa nộp'
                            )}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            Đợt 2:{' '}
                            {stage2?.workloadPercentage !== undefined &&
                            stage2?.workloadPercentage !== null ? (
                              <span
                                className={`font-semibold ${stage2.isPassed === false ? 'text-destructive' : 'text-emerald-600'}`}
                              >
                                {stage2.workloadPercentage}%
                              </span>
                            ) : (
                              'Chưa đánh giá'
                            )}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Auto-Assign Dialog */}
      <AutoAssignDialog
        open={autoAssignOpen}
        onOpenChange={setAutoAssignOpen}
        majorId={selectedMajorId}
      />
    </div>
  );
}
