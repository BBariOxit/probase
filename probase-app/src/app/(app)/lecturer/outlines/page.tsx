'use client';

import React, { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  Eye,
  FileCheck2,
  FileText,
  Filter,
  Loader2,
  MessageSquare,
  Search,
  ThumbsDown,
  ThumbsUp,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { useActiveSemester, useSemesters } from '@/lib/api/master-data';
import { useLecturerOutlines, useReviewOutline } from '@/lib/api/outlines';
import type { LecturerGroupOutlineItem, OutlineStatus } from '@/lib/api/types';
import { useRequireRole } from '@/lib/auth/use-require-role';
import { PageHeading } from '@/components/layout/page-heading';
import { EmptyState } from '@/components/shared/empty-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

function formatBytes(bytes?: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateString?: string | null): string {
  if (!dateString) return '';
  const d = new Date(dateString);
  return d.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function OutlineStatusBadge({ status }: { status?: OutlineStatus | null }) {
  switch (status) {
    case 'APPROVED_BY_LECTURER':
      return (
        <Badge className="bg-emerald-600/15 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-500/30 gap-1 px-2.5 py-0.5 text-xs font-medium">
          <CheckCircle2 className="size-3.5" />
          Đã duyệt
        </Badge>
      );
    case 'SUBMITTED':
      return (
        <Badge className="bg-amber-500/15 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 border border-amber-500/30 gap-1 px-2.5 py-0.5 text-xs font-medium">
          <Clock className="size-3.5" />
          Chờ duyệt
        </Badge>
      );
    case 'NEEDS_REVISION':
      return (
        <Badge className="bg-rose-500/15 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300 border border-rose-500/30 gap-1 px-2.5 py-0.5 text-xs font-medium">
          <AlertCircle className="size-3.5" />
          Cần chỉnh sửa
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="text-muted-foreground gap-1 px-2.5 py-0.5 text-xs">
          <FileText className="size-3.5" />
          Chưa nộp
        </Badge>
      );
  }
}

export default function LecturerOutlinesPage() {
  const allowed = useRequireRole('LECTURER');
  const activeSemester = useActiveSemester();
  const { data: semesters } = useSemesters();

  const [semesterId, setSemesterId] = useState<number | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');

  // Selected outline for review dialog
  const [selectedGroup, setSelectedGroup] = useState<LecturerGroupOutlineItem | null>(null);
  const [reviewAction, setReviewAction] = useState<'APPROVE' | 'REQUEST_REVISION' | null>(null);
  const [feedback, setFeedback] = useState('');

  const currentSemesterId = semesterId ?? activeSemester?.id;

  const { data, isLoading } = useLecturerOutlines({
    semesterId: currentSemesterId,
    status: statusFilter === 'ALL' ? undefined : statusFilter,
    search: search.trim() || undefined,
  });

  const reviewMutation = useReviewOutline();

  if (!allowed) return null;

  const handleOpenReview = (
    group: LecturerGroupOutlineItem,
    action: 'APPROVE' | 'REQUEST_REVISION',
  ) => {
    setSelectedGroup(group);
    setReviewAction(action);
    setFeedback(action === 'APPROVE' ? 'Đề cương đạt yêu cầu, đồng ý thông qua.' : '');
  };

  const handleCloseReview = () => {
    setSelectedGroup(null);
    setReviewAction(null);
    setFeedback('');
  };

  const handleConfirmReview = async () => {
    if (!selectedGroup?.outline?.id || !reviewAction) return;

    if (reviewAction === 'REQUEST_REVISION' && !feedback.trim()) {
      toast.error('Vui lòng nhập lý do/nhận xét khi yêu cầu chỉnh sửa đề cương.');
      return;
    }

    try {
      await reviewMutation.mutateAsync({
        id: selectedGroup.outline.id,
        action: reviewAction,
        feedback: feedback.trim() || undefined,
      });

      toast.success(
        reviewAction === 'APPROVE'
          ? 'Đã phê duyệt Đề cương M03 thành công!'
          : 'Đã gửi yêu cầu chỉnh sửa đến nhóm sinh viên.',
      );
      handleCloseReview();
    } catch (err: any) {
      toast.error(err?.message || 'Có lỗi xảy ra khi xử lý đề cương.');
    }
  };

  const items = data?.items ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeading
          title="Duyệt Đề cương M03"
          description="Kiểm tra và phê duyệt bản scan Đề cương thực hiện đồ án (Mẫu M03) của các nhóm hướng dẫn (BR-09)"
        />

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            render={
              <a
                href="/templates/M03_Mau_De_Cuong.pdf"
                download="M03_Mau_De_Cuong_Thuc_Hien_Do_An.pdf"
                target="_blank"
              />
            }
          >
            <Download className="size-4" />
            Mẫu M03 chuẩn (.pdf)
          </Button>
        </div>
      </div>

      {/* Bộ lọc học kỳ, trạng thái và tìm kiếm */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên nhóm, mã SV hoặc tên đề tài..."
            className="pl-9 h-9 text-sm"
          />
        </div>

        <Select
          value={statusFilter}
          onValueChange={(val) => setStatusFilter(val ?? 'ALL')}
        >
          <SelectTrigger className="w-full sm:w-[180px] h-9 text-sm">
            <SelectValue placeholder="Trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tất cả trạng thái</SelectItem>
            <SelectItem value="SUBMITTED">Chờ duyệt</SelectItem>
            <SelectItem value="APPROVED_BY_LECTURER">Đã duyệt</SelectItem>
            <SelectItem value="NEEDS_REVISION">Cần chỉnh sửa</SelectItem>
            <SelectItem value="NOT_SUBMITTED">Chưa nộp</SelectItem>
          </SelectContent>
        </Select>

        {semesters && semesters.length > 0 && (
          <Select
            value={currentSemesterId ? String(currentSemesterId) : undefined}
            onValueChange={(val) => setSemesterId(val ? Number(val) : undefined)}
          >
            <SelectTrigger className="w-full sm:w-[200px] h-9 text-sm">
              <SelectValue placeholder="Chọn học kỳ" />
            </SelectTrigger>
            <SelectContent>
              {semesters.map((s) => (
                <SelectItem key={s.id} value={String(s.id)}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Danh sách các nhóm */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <Card className="rounded-xl border">
          <EmptyState
            icon={FileText}
            title="Chưa có nhóm đồ án nào của bạn trong học kỳ này."
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {items.map((group) => {
            const outline = group.outline;
            const outlineStatus: OutlineStatus = outline?.status ?? 'NOT_SUBMITTED';
            const isSubmitted = outlineStatus === 'SUBMITTED';

            return (
              <Card key={group.id} className="border shadow-xs hover:border-border/80 transition-all overflow-hidden">
                <CardHeader className="bg-muted/20 pb-3 pt-4">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-foreground text-base">
                          {group.name ?? `Nhóm ${group.id}`}
                        </span>
                        <OutlineStatusBadge status={outlineStatus} />
                        {group.topic?.projectType && (
                          <Badge variant="secondary" className="text-xs">
                            {group.topic.projectType.name}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm font-medium text-emerald-800 dark:text-emerald-400">
                        {group.topic?.title}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {outline?.attachmentUrl && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5"
                          render={
                            <a
                              href={outline.attachmentUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                            />
                          }
                        >
                          <ExternalLink className="size-3.5" />
                          Xem bản scan
                        </Button>
                      )}

                      {isSubmitted && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-rose-700 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30 border-rose-200 gap-1.5"
                            onClick={() => handleOpenReview(group, 'REQUEST_REVISION')}
                          >
                            <ThumbsDown className="size-3.5" />
                            Yêu cầu sửa
                          </Button>
                          <Button
                            size="sm"
                            className="bg-emerald-700 hover:bg-emerald-800 text-white gap-1.5"
                            onClick={() => handleOpenReview(group, 'APPROVE')}
                          >
                            <ThumbsUp className="size-3.5" />
                            Phê duyệt
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-3 pb-4 space-y-3 text-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-muted-foreground gap-2 border-b pb-2.5">
                    <div>
                      <span className="font-medium text-foreground">Thành viên ({group.members.length}): </span>
                      {group.members.map((m, idx) => (
                        <span key={m.id}>
                          {m.student.fullName} ({m.student.studentCode})
                          {idx < group.members.length - 1 ? ', ' : ''}
                        </span>
                      ))}
                    </div>

                    {outline?.submittedAt && (
                      <div>
                        Nộp lúc: <span className="font-medium text-foreground">{formatDate(outline.submittedAt)}</span>
                      </div>
                    )}
                  </div>

                  {/* Thông tin file đính kèm */}
                  {outline?.attachmentUrl ? (
                    <div className="flex items-center justify-between bg-muted/30 rounded-lg p-2.5 px-3">
                      <div className="flex items-center gap-2.5">
                        <FileText className="size-4 text-emerald-600 dark:text-emerald-400" />
                        <span className="font-medium line-clamp-1">
                          {outline.fileName || 'Ban_scan_De_cuong_M03.pdf'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          ({formatBytes(outline.fileSize)})
                        </span>
                      </div>
                      {outline.approvedAt && (
                        <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                          Đã duyệt lúc {formatDate(outline.approvedAt)}
                        </span>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">
                      Nhóm sinh viên chưa nộp bản scan Đề cương M03 lên hệ thống.
                    </p>
                  )}

                  {/* Nhận xét đã gửi nếu có */}
                  {outline?.lecturerFeedback && (
                    <div className="text-xs bg-muted/40 rounded-lg p-2.5 space-y-1">
                      <p className="font-semibold text-muted-foreground">Góp ý của bạn:</p>
                      <p className="text-foreground whitespace-pre-line">{outline.lecturerFeedback}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialog Phê duyệt / Yêu cầu chỉnh sửa */}
      <Dialog open={Boolean(selectedGroup && reviewAction)} onOpenChange={handleCloseReview}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {reviewAction === 'APPROVE' ? 'Phê duyệt Đề cương M03' : 'Yêu cầu chỉnh sửa Đề cương M03'}
            </DialogTitle>
            <DialogDescription className="text-sm">
              Đề tài: <span className="font-semibold text-foreground">{selectedGroup?.topic?.title}</span> (
              {selectedGroup?.name ?? `Nhóm ${selectedGroup?.id}`})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {reviewAction === 'APPROVE' ? (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Bạn xác nhận bản scan Đề cương M03 đã có chữ ký xác nhận đầy đủ và nội dung đạt yêu cầu?
                </p>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">
                    Ghi chú / Nhận xét thêm (Không bắt buộc):
                  </label>
                  <Textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="Nhập lời dặn dò cho nhóm sinh viên..."
                    rows={3}
                    className="text-sm"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-rose-700 dark:text-rose-400">
                  Vui lòng nêu rõ lý do yêu cầu chỉnh sửa hoặc nộp lại (ví dụ: chữ ký mờ, thiếu mục kế hoạch tuần, cần điều chỉnh công nghệ...):
                </p>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Nhận xét / Yêu cầu chỉnh sửa (*):
                  </label>
                  <Textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="Nhập chi tiết các nội dung sinh viên cần chỉnh sửa và nộp lại..."
                    rows={4}
                    className="text-sm"
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={handleCloseReview} disabled={reviewMutation.isPending}>
              Hủy
            </Button>
            <Button
              onClick={handleConfirmReview}
              disabled={reviewMutation.isPending}
              className={
                reviewAction === 'APPROVE'
                  ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                  : 'bg-rose-700 hover:bg-rose-800 text-white'
              }
            >
              {reviewMutation.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin mr-1.5" />
                  Đang xử lý...
                </>
              ) : reviewAction === 'APPROVE' ? (
                'Xác nhận Phê duyệt'
              ) : (
                'Gửi yêu cầu chỉnh sửa'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
