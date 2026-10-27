'use client';

import { useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Building2,
  Calendar,
  CheckCircle2,
  Cpu,
  FileCheck2,
  FileText,
  GraduationCap,
  Layers,
  Loader2,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Users,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  useDepartmentReviewTopic,
  useFacultyReviewTopic,
  useTopic,
  useTopicSimilarity,
} from '@/lib/api/topics';
import type { TopicDetail, TopicStatus } from '@/lib/api/types';
import { TopicStatusBadge } from '@/components/topics/topic-status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface TopicReviewModalProps {
  topicId: number | null;
  onClose: () => void;
  // Can explicitly override stage, or auto-detect from topic.status
  stage?: 'DEPARTMENT' | 'FACULTY' | 'AUTO';
  isHeadOfDepartment?: boolean;
  isFacultyBoard?: boolean;
  isAdmin?: boolean;
}

export function TopicReviewModal({
  topicId,
  onClose,
  stage = 'AUTO',
  isHeadOfDepartment = false,
  isFacultyBoard = false,
  isAdmin = false,
}: TopicReviewModalProps) {
  const { data: topic, isPending } = useTopic(topicId ?? 0);
  const similarityQuery = useTopicSimilarity(topicId ?? 0, {
    enabled: !!topicId,
  });

  const departmentReview = useDepartmentReviewTopic();
  const facultyReview = useFacultyReviewTopic();

  const [activeTab, setActiveTab] = useState<'details' | 'similarity'>('details');
  const [feedback, setFeedback] = useState('');
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  if (!topicId) return null;

  // Determine which review stage is applicable
  const currentStatus: TopicStatus | undefined = topic?.status;
  const isDepartmentStage =
    stage === 'DEPARTMENT' ||
    (stage === 'AUTO' &&
      (currentStatus === 'PENDING_DEPARTMENT' || currentStatus === 'PENDING') &&
      (isHeadOfDepartment || isAdmin));

  const isFacultyStage =
    stage === 'FACULTY' ||
    (stage === 'AUTO' &&
      currentStatus === 'PENDING_FACULTY' &&
      (isFacultyBoard || isAdmin));

  const isMutating =
    departmentReview.isPending || facultyReview.isPending;

  async function handleDepartmentAction(
    action: 'APPROVE' | 'REQUEST_REVISION' | 'REJECT',
  ) {
    if (!topic) return;

    if (action !== 'APPROVE' && !feedback.trim()) {
      toast.error('Vui lòng nhập lý do/nhận xét để phản hồi cho giảng viên');
      return;
    }

    try {
      setActionInProgress(action);
      await departmentReview.mutateAsync({
        id: topic.id,
        data: {
          action,
          feedback: feedback.trim() || undefined,
        },
      });

      const messages = {
        APPROVE: 'Đã duyệt đề tài chuyển lên Ban Chủ nhiệm Khoa.',
        REQUEST_REVISION: 'Đã yêu cầu giảng viên chỉnh sửa lại đề tài.',
        REJECT: 'Đã từ chối đề tài.',
      };
      toast.success(messages[action]);
      setFeedback('');
      onClose();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : 'Có lỗi xảy ra khi thẩm định đề tài',
      );
    } finally {
      setActionInProgress(null);
    }
  }

  async function handleFacultyAction(
    action: 'APPROVE' | 'REQUEST_REVISION' | 'REJECT',
  ) {
    if (!topic) return;

    if (action !== 'APPROVE' && !feedback.trim()) {
      toast.error('Vui lòng nhập lý do/ý kiến chỉ đạo cho Bộ môn/Giảng viên');
      return;
    }

    try {
      setActionInProgress(action);
      await facultyReview.mutateAsync({
        id: topic.id,
        data: {
          action,
          feedback: feedback.trim() || undefined,
        },
      });

      const messages = {
        APPROVE: 'Ban Chủ nhiệm Khoa đã phê duyệt chính thức đề tài.',
        REQUEST_REVISION: 'Đã gửi yêu cầu Bộ môn xem xét lại đề tài.',
        REJECT: 'Đã từ chối phê duyệt đề tài.',
      };
      toast.success(messages[action]);
      setFeedback('');
      onClose();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : 'Có lỗi xảy ra khi phê duyệt đề tài',
      );
    } finally {
      setActionInProgress(null);
    }
  }

  const similarityMatches = similarityQuery.data ?? [];
  const maxSimilarityScore =
    similarityMatches.length > 0
      ? Math.max(...similarityMatches.map((m) => m.similarityScore))
      : 0;

  return (
    <Dialog open={!!topicId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden sm:rounded-xl">
        {/* Header */}
        <DialogHeader className="p-6 pb-4 border-b bg-card">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1.5 pr-6">
              <div className="flex flex-wrap items-center gap-2">
                {topic && <TopicStatusBadge status={topic.status} />}
                {topic?.major && (
                  <Badge variant="outline" className="border-primary/30 text-primary font-normal">
                    {topic.major.name} ({topic.major.code})
                  </Badge>
                )}
                {topic?.projectType && (
                  <Badge variant="secondary" className="font-normal text-xs">
                    {topic.projectType.name}
                  </Badge>
                )}
              </div>
              <DialogTitle className="text-xl font-semibold leading-tight line-clamp-2">
                {isPending ? 'Đang tải thông tin...' : topic?.title}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 pt-1">
                {topic && (
                  <>
                    <span className="inline-flex items-center gap-1">
                      <GraduationCap className="size-3.5 text-muted-foreground/80" />
                      {topic.lecturer.academicTitle
                        ? `${topic.lecturer.academicTitle} ${topic.lecturer.fullName}`
                        : topic.lecturer.fullName}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="size-3.5 text-muted-foreground/80" />
                      {topic.semester.name}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Users className="size-3.5 text-muted-foreground/80" />
                      Tối đa {topic.maxStudents} SV
                    </span>
                  </>
                )}
              </DialogDescription>
            </div>
          </div>

          {/* Navigation Pill Tabs */}
          <div className="flex items-center gap-2 pt-3">
            <button
              type="button"
              onClick={() => setActiveTab('details')}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                activeTab === 'details'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <FileText className="size-3.5" />
              Nội dung đề tài
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('similarity')}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                activeTab === 'similarity'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <Sparkles className="size-3.5" />
              Kiểm tra trùng lặp (BR-04)
              {maxSimilarityScore >= 0.4 ? (
                <span className="ml-1 size-2 rounded-full bg-rose-500 animate-pulse" />
              ) : null}
            </button>
          </div>
        </DialogHeader>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isPending ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="size-6 animate-spin text-primary" />
              <p className="text-sm">Đang tải hồ sơ đề tài...</p>
            </div>
          ) : !topic ? (
            <div className="py-12 text-center text-muted-foreground">
              Không tìm thấy thông tin đề tài
            </div>
          ) : activeTab === 'details' ? (
            <div className="space-y-5">
              {/* Previous Review Feedback (if any) */}
              {(topic.departmentFeedback || topic.facultyFeedback) && (
                <div className="rounded-lg border bg-amber-50/60 dark:bg-amber-950/20 p-4 space-y-2.5">
                  <div className="flex items-center gap-2 text-amber-800 dark:text-amber-400 font-semibold text-xs tracking-wider uppercase">
                    <AlertCircle className="size-4" />
                    Lịch sử thẩm định & Nhận xét
                  </div>
                  {topic.departmentFeedback && (
                    <div className="text-xs space-y-0.5">
                      <span className="font-medium text-foreground">
                        Ý kiến Tổ trưởng Bộ môn
                        {topic.departmentReviewer && ` (${topic.departmentReviewer.fullName})`}:
                      </span>
                      <p className="text-muted-foreground italic pl-2 border-l-2 border-amber-300">
                        &ldquo;{topic.departmentFeedback}&rdquo;
                      </p>
                    </div>
                  )}
                  {topic.facultyFeedback && (
                    <div className="text-xs space-y-0.5">
                      <span className="font-medium text-foreground">
                        Ý kiến Ban Chủ nhiệm Khoa
                        {topic.facultyApprover && ` (${topic.facultyApprover.fullName})`}:
                      </span>
                      <p className="text-muted-foreground italic pl-2 border-l-2 border-blue-300">
                        &ldquo;{topic.facultyFeedback}&rdquo;
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Description */}
              <div className="space-y-1.5">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <FileText className="size-3.5 text-primary" />
                  Mô tả nội dung yêu cầu
                </h4>
                <div className="rounded-lg border bg-card/60 p-3.5 text-sm whitespace-pre-wrap leading-relaxed">
                  {topic.description}
                </div>
              </div>

              {/* Objectives */}
              {topic.objectives && (
                <div className="space-y-1.5">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <FileCheck2 className="size-3.5 text-primary" />
                    Mục tiêu cần đạt được
                  </h4>
                  <div className="rounded-lg border bg-card/60 p-3.5 text-sm whitespace-pre-wrap leading-relaxed">
                    {topic.objectives}
                  </div>
                </div>
              )}

              {/* Expected Outcomes */}
              <div className="space-y-1.5">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Layers className="size-3.5 text-primary" />
                  Sản phẩm dự kiến hoàn thành
                </h4>
                <div className="rounded-lg border bg-card/60 p-3.5 text-sm whitespace-pre-wrap leading-relaxed">
                  {topic.expectedOutcomes}
                </div>
              </div>

              {/* Tech stack */}
              {topic.techStack && (
                <div className="space-y-1.5">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Cpu className="size-3.5 text-primary" />
                    Công nghệ & Công cụ dự kiến
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {topic.techStack.split(',').map((tech, i) => (
                      <Badge key={i} variant="secondary" className="text-xs font-normal">
                        {tech.trim()}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Similarity Check Tab (BR-04) */
            <div className="space-y-4">
              <div className="rounded-lg border p-4 bg-muted/30">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="size-4 text-primary" />
                    <h4 className="text-sm font-semibold">Kết quả đối chiếu kho đề tài (BR-04)</h4>
                  </div>
                  {similarityQuery.isFetching ? (
                    <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                      <Loader2 className="size-3 animate-spin" /> Đang tính toán...
                    </span>
                  ) : null}
                </div>
                <p className="text-xs text-muted-foreground">
                  Hệ thống tự động so khớp độ tương đồng văn bản (Tokens & N-grams) của Tiêu đề,
                  Mục tiêu và Nội dung với kho đề tài các khóa trước của Khoa CNTT - Đại học Đà Lạt.
                </p>
              </div>

              {similarityQuery.isLoading ? (
                <div className="py-8 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                  <Loader2 className="size-5 animate-spin text-primary" />
                  <p className="text-xs">Đang quét ngân hàng đề tài...</p>
                </div>
              ) : similarityMatches.length === 0 ? (
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20 p-5 text-center space-y-1.5">
                  <CheckCircle2 className="size-8 text-emerald-600 mx-auto" />
                  <h5 className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                    Đề tài đạt độ mới &lt; 35%
                  </h5>
                  <p className="text-xs text-muted-foreground">
                    Không tìm thấy đề tài nào có tỷ lệ trùng lặp đáng kể trong các khóa gần nhất.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {maxSimilarityScore >= 0.5 ? (
                    <div className="rounded-lg border border-rose-500/40 bg-rose-50/60 dark:bg-rose-950/20 p-3.5 flex items-start gap-2.5">
                      <ShieldAlert className="size-5 text-rose-600 shrink-0 mt-0.5" />
                      <div className="text-xs space-y-0.5">
                        <span className="font-semibold text-rose-800 dark:text-rose-300">
                          Cảnh báo nguy cơ trùng lặp cao ({Math.round(maxSimilarityScore * 100)}%)
                        </span>
                        <p className="text-muted-foreground">
                          Đề tài có độ tương đồng lớn với một hoặc nhiều đề tài đã thực hiện. Đề
                          nghị TTBM yêu cầu giảng viên điều chỉnh phạm vi hoặc đối tượng nghiên cứu.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-amber-500/40 bg-amber-50/60 dark:bg-amber-950/20 p-3.5 flex items-start gap-2.5">
                      <AlertTriangle className="size-5 text-amber-600 shrink-0 mt-0.5" />
                      <div className="text-xs space-y-0.5">
                        <span className="font-semibold text-amber-800 dark:text-amber-300">
                          Phát hiện tương đồng một phần ({Math.round(maxSimilarityScore * 100)}%)
                        </span>
                        <p className="text-muted-foreground">
                          Có một số từ khóa và nội dung tương đồng với đề tài khóa trước.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    {similarityMatches.map((match) => {
                      const percent = Math.round(match.similarityScore * 100);
                      const isHigh = percent >= 50;

                      return (
                        <div
                          key={match.matchedTopicId}
                          className="rounded-lg border bg-card p-3.5 space-y-2 hover:border-primary/40 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-0.5">
                              <h5 className="text-sm font-medium leading-snug">
                                {match.matchedTitle}
                              </h5>
                              <p className="text-xs text-muted-foreground">
                                GVHD: {match.matchedLecturerName} • {match.matchedSemesterName}
                              </p>
                            </div>
                            <span
                              className={cn(
                                'text-xs font-bold px-2 py-0.5 rounded-full shrink-0',
                                isHigh
                                  ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                                  : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
                              )}
                            >
                              {percent}% trùng lặp
                            </span>
                          </div>

                          {match.matchedFields.overlappingKeywords.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1 pt-1 border-t border-dashed">
                              <span className="text-[11px] text-muted-foreground mr-1">
                                Từ khóa trùng:
                              </span>
                              {match.matchedFields.overlappingKeywords.map((kw, i) => (
                                <Badge
                                  key={i}
                                  variant="outline"
                                  className="text-[11px] px-1.5 py-0 font-normal bg-muted/40"
                                >
                                  {kw}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Review Action Form (Rendered only if in a reviewable stage) */}
          {(isDepartmentStage || isFacultyStage) && topic && (
            <div className="rounded-xl border bg-card/90 shadow-xs p-4 space-y-3 pt-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
                {isDepartmentStage ? (
                  <>
                    <Building2 className="size-4" />
                    Thẩm định Chuyên môn (Tổ trưởng Bộ môn)
                  </>
                ) : (
                  <>
                    <FileCheck2 className="size-4" />
                    Phê duyệt Chính thức (Ban Chủ nhiệm Khoa)
                  </>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="review-feedback" className="text-xs font-medium">
                  Nhận xét & Góp ý chuyên môn{' '}
                  <span className="text-muted-foreground font-normal">
                    (Bắt buộc khi Yêu cầu sửa hoặc Từ chối)
                  </span>
                </Label>
                <Textarea
                  id="review-feedback"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder={
                    isDepartmentStage
                      ? 'Nhập góp ý chuyên môn, tính khả thi, công nghệ dự kiến hoặc yêu cầu giảng viên chỉnh sửa...'
                      : 'Nhập ý kiến chỉ đạo, nhận xét phê duyệt của Ban Chủ nhiệm Khoa...'
                  }
                  rows={3}
                  className="text-xs resize-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <DialogFooter className="p-4 border-t bg-card/60 flex flex-wrap items-center justify-between gap-2 sm:justify-between">
          <Button variant="ghost" onClick={onClose} disabled={isMutating} size="sm">
            Đóng
          </Button>

          <div className="flex flex-wrap items-center gap-2">
            {isDepartmentStage ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDepartmentAction('REJECT')}
                  disabled={isMutating}
                  className="text-rose-600 border-rose-200 hover:bg-rose-50 dark:hover:bg-rose-950"
                >
                  {actionInProgress === 'REJECT' ? (
                    <Loader2 className="size-3.5 animate-spin mr-1.5" />
                  ) : (
                    <XCircle className="size-3.5 mr-1.5" />
                  )}
                  Từ chối
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDepartmentAction('REQUEST_REVISION')}
                  disabled={isMutating}
                  className="text-amber-600 border-amber-200 hover:bg-amber-50 dark:hover:bg-amber-950"
                >
                  {actionInProgress === 'REQUEST_REVISION' ? (
                    <Loader2 className="size-3.5 animate-spin mr-1.5" />
                  ) : (
                    <RotateCcw className="size-3.5 mr-1.5" />
                  )}
                  Yêu cầu sửa
                </Button>

                <Button
                  size="sm"
                  onClick={() => handleDepartmentAction('APPROVE')}
                  disabled={isMutating}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {actionInProgress === 'APPROVE' ? (
                    <Loader2 className="size-3.5 animate-spin mr-1.5" />
                  ) : (
                    <CheckCircle2 className="size-3.5 mr-1.5" />
                  )}
                  Duyệt chuyển lên Khoa
                </Button>
              </>
            ) : isFacultyStage ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleFacultyAction('REJECT')}
                  disabled={isMutating}
                  className="text-rose-600 border-rose-200 hover:bg-rose-50 dark:hover:bg-rose-950"
                >
                  {actionInProgress === 'REJECT' ? (
                    <Loader2 className="size-3.5 animate-spin mr-1.5" />
                  ) : (
                    <XCircle className="size-3.5 mr-1.5" />
                  )}
                  Từ chối
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleFacultyAction('REQUEST_REVISION')}
                  disabled={isMutating}
                  className="text-amber-600 border-amber-200 hover:bg-amber-50 dark:hover:bg-amber-950"
                >
                  {actionInProgress === 'REQUEST_REVISION' ? (
                    <Loader2 className="size-3.5 animate-spin mr-1.5" />
                  ) : (
                    <RotateCcw className="size-3.5 mr-1.5" />
                  )}
                  Yêu cầu xem xét lại
                </Button>

                <Button
                  size="sm"
                  onClick={() => handleFacultyAction('APPROVE')}
                  disabled={isMutating}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {actionInProgress === 'APPROVE' ? (
                    <Loader2 className="size-3.5 animate-spin mr-1.5" />
                  ) : (
                    <CheckCircle2 className="size-3.5 mr-1.5" />
                  )}
                  Khoa phê duyệt chính thức
                </Button>
              </>
            ) : null}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
