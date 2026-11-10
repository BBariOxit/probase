'use client';

import { useState } from 'react';
import {
  CheckCircle2,
  Clock,
  ExternalLink,
  FileDown,
  Loader2,
  Printer,
  XCircle,
} from 'lucide-react';
import { useGroupReviews } from '@/lib/api/reviews';
import type { TopicReviewItem } from '@/lib/api/types';
import { formatDate, sanitizeLecturerName } from '@/lib/utils';
import { StatusPill, type StatusLabel } from '@/components/shared/status-pill';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ReviewInspectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: number | null;
}

function getEligibilityPill(
  status?: 'ELIGIBLE' | 'NOT_ELIGIBLE' | 'PENDING',
): StatusLabel {
  switch (status) {
    case 'ELIGIBLE':
      return { label: 'Đủ điều kiện', tone: 'success' };
    case 'NOT_ELIGIBLE':
      return { label: 'Không đạt', tone: 'danger' };
    default:
      return { label: 'Chờ duyệt', tone: 'waiting' };
  }
}

export function ReviewInspectionDialog({
  open,
  onOpenChange,
  groupId,
}: ReviewInspectionDialogProps) {
  const [activeTab, setActiveTab] = useState<'supervisor' | 'reviewer'>(
    'supervisor',
  );
  const [printMode, setPrintMode] = useState(false);

  const { data, isPending, error } = useGroupReviews(open ? groupId : null);

  const projectTypeCode = data?.group.topic.round?.projectType?.code;
  const supervisorTemplate = projectTypeCode === 'KLTN' ? 'M04' : 'M02';
  const statusPill = getEligibilityPill(data?.eligibilityStatus);

  const activeReview: TopicReviewItem | null | undefined =
    activeTab === 'supervisor' ? data?.supervisorReview : data?.reviewerReview;

  const supervisorName = data?.group.supervisor
    ? sanitizeLecturerName(
        data.group.supervisor.fullName,
        data.group.supervisor.academicTitle,
      ).displayName
    : '—';
  const reviewerName = data?.group.reviewer
    ? sanitizeLecturerName(
        data.group.reviewer.fullName,
        data.group.reviewer.academicTitle,
      ).displayName
    : 'Chưa phân công';

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setPrintMode(false);
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto sm:max-w-3xl">
        <DialogHeader className="border-b pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2 pr-6">
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill
                variant="tag"
                label={statusPill.label}
                tone={statusPill.tone}
              />
              {data?.group.topic.round?.projectType?.name && (
                <span className="text-xs font-medium text-muted-foreground">
                  {data.group.topic.round.projectType.name}
                </span>
              )}
              {data?.group.topic.major?.name && (
                <span className="text-xs text-muted-foreground">
                  · {data.group.topic.major.name}
                </span>
              )}
            </div>

            {activeReview && (
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  size="sm"
                  variant={printMode ? 'default' : 'outline'}
                  className="h-7.5 text-xs cursor-pointer"
                  onClick={() => setPrintMode((prev) => !prev)}
                >
                  {printMode ? 'Xem dạng thẻ' : 'Xem mẫu in'}
                </Button>
                {printMode && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7.5 text-xs gap-1 cursor-pointer"
                    onClick={() => window.print()}
                  >
                    <Printer className="size-3.5" />
                    In
                  </Button>
                )}
              </div>
            )}
          </div>

          <DialogTitle className="mt-1.5 text-base font-semibold leading-snug">
            {data?.group.topic.title ?? 'Chi tiết thẩm định điều kiện bảo vệ'}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {data?.group.name ? `${data.group.name} · ` : ''}
            {data?.group.members
              .map((m) => `${m.fullName} (${m.studentCode})`)
              .join(', ')}
          </DialogDescription>
        </DialogHeader>

        {isPending ? (
          <div className="flex justify-center py-12">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : error || !data ? (
          <p className="py-6 text-sm text-destructive">
            Không tải được thông tin phiếu nhận xét của nhóm này.
          </p>
        ) : (
          <div className="space-y-4 py-1">
            {/* Tiến độ 2 & Hồ sơ */}
            <div className="rounded-lg border border-slate-200 dark:border-neutral-700 bg-slate-50/70 dark:bg-neutral-900/40 p-3 text-xs space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <span className="text-muted-foreground">GVHD: </span>
                  <span className="font-semibold text-foreground">
                    {supervisorName}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">GVPB: </span>
                  <span className="font-semibold text-foreground">
                    {reviewerName}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Tiến độ 2: </span>
                  {data.stage2 &&
                  (data.stage2.workloadPercentage !== null ||
                    data.stage2.isPassed !== null) ? (
                    <span
                      className={`font-semibold ${
                        data.stage2Passed
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {data.stage2.workloadPercentage ?? 0}% (
                      {data.stage2Passed ? 'Đạt' : 'Chưa đạt'})
                      {data.stage2.finalStageGrade !== null &&
                      data.stage2.finalStageGrade !== undefined
                        ? ` · ${data.stage2.finalStageGrade}đ`
                        : ''}
                    </span>
                  ) : data.stage2 ? (
                    <span className="text-muted-foreground">
                      Đã nộp · Chờ đánh giá
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Chưa đánh giá</span>
                  )}
                </div>
              </div>

              {(data.recentSubmissions.length > 0 ||
                data.stage2?.reportFileUrl ||
                data.stage2?.sourceCodeUrl) && (
                <div className="flex flex-wrap items-center gap-3 border-t border-slate-200 dark:border-neutral-700 pt-2">
                  {data.recentSubmissions[0]?.fileUrl && (
                    <a
                      href={data.recentSubmissions[0].fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline font-medium"
                    >
                      <FileDown className="size-3.5" />
                      {data.recentSubmissions[0].fileName || 'Báo cáo đã nộp'}
                    </a>
                  )}
                  {data.stage2?.reportFileUrl &&
                    !data.recentSubmissions[0]?.fileUrl && (
                      <a
                        href={data.stage2.reportFileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-primary hover:underline font-medium"
                      >
                        <FileDown className="size-3.5" />
                        Báo cáo Tiến độ 2
                      </a>
                    )}
                  {(data.recentSubmissions[0]?.submissionUrl ||
                    data.stage2?.sourceCodeUrl) && (
                    <a
                      href={
                        data.recentSubmissions[0]?.submissionUrl ||
                        data.stage2?.sourceCodeUrl ||
                        '#'
                      }
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline font-medium"
                    >
                      <ExternalLink className="size-3.5" />
                      Mã nguồn / Demo
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* Tabs Phiếu nhận xét */}
            <Tabs
              value={activeTab}
              onValueChange={(val) => {
                setActiveTab(val as 'supervisor' | 'reviewer');
                setPrintMode(false);
              }}
            >
              <TabsList className="w-full sm:w-auto">
                <TabsTrigger value="supervisor">
                  Phiếu GVHD ({supervisorTemplate})
                </TabsTrigger>
                <TabsTrigger value="reviewer">Phiếu GVPB (M05)</TabsTrigger>
              </TabsList>

              <TabsContent value="supervisor">
                <ReviewContentPanel
                  review={data.supervisorReview}
                  role="SUPERVISOR"
                  lecturerDisplayName={supervisorName}
                  topicTitle={data.group.topic.title}
                  members={data.group.members}
                  printMode={printMode}
                />
              </TabsContent>

              <TabsContent value="reviewer">
                <ReviewContentPanel
                  review={data.reviewerReview}
                  role="REVIEWER"
                  lecturerDisplayName={reviewerName}
                  topicTitle={data.group.topic.title}
                  members={data.group.members}
                  printMode={printMode}
                />
              </TabsContent>
            </Tabs>
          </div>
        )}

        <DialogFooter className="border-t pt-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Đóng
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReviewContentPanel({
  review,
  role,
  lecturerDisplayName,
  topicTitle,
  members,
  printMode,
}: {
  review: TopicReviewItem | null;
  role: 'SUPERVISOR' | 'REVIEWER';
  lecturerDisplayName: string;
  topicTitle: string;
  members: Array<{
    id: number;
    studentCode: string;
    fullName: string;
    class: string | null;
  }>;
  printMode: boolean;
}) {
  if (!review) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-neutral-700 p-6 text-sm text-muted-foreground">
        <Clock className="size-4 shrink-0" />
        <span>
          {role === 'SUPERVISOR'
            ? 'Giảng viên hướng dẫn chưa nộp phiếu nhận xét.'
            : 'Giảng viên phản biện chưa nộp phiếu nhận xét.'}
        </span>
      </div>
    );
  }

  const criteria = (review.evaluationCriteria ?? {}) as Record<string, unknown>;
  const signerName = review.lecturer
    ? sanitizeLecturerName(
        review.lecturer.fullName,
        review.lecturer.academicTitle,
      ).displayName
    : lecturerDisplayName;

  if (printMode) {
    return (
      <div className="rounded-xl border bg-white dark:bg-[#181818] p-6 text-xs leading-relaxed font-serif print:border-none print:p-0">
        <div className="grid grid-cols-2 border-b pb-3 text-center">
          <div>
            <p className="text-[11px] uppercase">TRƯỜNG ĐẠI HỌC ĐÀ LẠT</p>
            <p className="font-bold uppercase">KHOA CÔNG NGHỆ THÔNG TIN</p>
          </div>
          <div>
            <p className="text-[11px] font-bold">
              CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
            </p>
            <p className="text-[10px] italic">Độc lập – Tự do – Hạnh phúc</p>
          </div>
        </div>

        <div className="my-4 text-center">
          <h3 className="text-sm font-bold uppercase">
            {review.templateCode === 'M04'
              ? 'PHIẾU NHẬN XÉT CỦA CÁN BỘ HƯỚNG DẪN (KLTN)'
              : review.templateCode === 'M02'
                ? 'PHIẾU NHẬN XÉT CỦA CÁN BỘ HƯỚNG DẪN ĐỒ ÁN'
                : 'PHIẾU NHẬN XÉT CỦA CÁN BỘ PHẢN BIỆN'}
          </h3>
        </div>

        <div className="space-y-1.5 my-3">
          <p>
            <strong>Tên đề tài:</strong> {topicTitle}
          </p>
          <p>
            <strong>Sinh viên thực hiện:</strong>
          </p>
          <ul className="list-disc pl-6 space-y-0.5">
            {members.map((m) => (
              <li key={m.id}>
                {m.fullName} — MSSV: <strong>{m.studentCode}</strong>
                {m.class ? ` — Lớp: ${m.class}` : ''}
              </li>
            ))}
          </ul>
          <p>
            <strong>
              Cán bộ {role === 'SUPERVISOR' ? 'hướng dẫn' : 'phản biện'}:
            </strong>{' '}
            {signerName}
          </p>
        </div>

        <CriteriaSection review={review} criteria={criteria} />

        <div className="my-3 space-y-1">
          <p className="font-bold uppercase text-[11px]">II. NHẬN XÉT CHUNG:</p>
          <p className="pl-3 whitespace-pre-wrap">{review.generalComment}</p>
        </div>

        <div className="my-3 border-t pt-3 space-y-1">
          <p className="font-bold uppercase text-[11px]">III. KẾT LUẬN:</p>
          <p className="pl-3 font-semibold">
            {review.isDefenseAllowed
              ? 'ĐƯỢC PHÉP BẢO VỆ TRƯỚC HỘI ĐỒNG.'
              : 'KHÔNG ĐƯỢC PHÉP BẢO VỆ TRƯỚC HỘI ĐỒNG.'}
          </p>
        </div>

        <div className="grid grid-cols-2 pt-4 mt-4 border-t text-center">
          <div />
          <div className="space-y-1">
            <p className="italic text-[11px]">
              Ngày ký: {formatDate(review.signedAt)}
            </p>
            <p className="font-bold uppercase">
              CÁN BỘ {role === 'SUPERVISOR' ? 'HƯỚNG DẪN' : 'PHẢN BIỆN'}
            </p>
            <div className="pt-6 font-bold">{signerName}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-slate-200 dark:border-neutral-700 p-4 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-neutral-800 pb-2.5">
        <div className="space-y-0.5">
          <p className="font-semibold text-sm text-foreground">
            {signerName} · Mẫu {review.templateCode}
          </p>
          <p className="text-muted-foreground">
            Ký ngày {formatDate(review.signedAt)}
          </p>
        </div>

        <div
          className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 font-semibold ${
            review.isDefenseAllowed
              ? 'border-emerald-300/70 bg-emerald-50 text-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-950/30 dark:text-emerald-400'
              : 'border-rose-300/70 bg-rose-50 text-rose-700 dark:border-rose-700/40 dark:bg-rose-950/30 dark:text-rose-400'
          }`}
        >
          {review.isDefenseAllowed ? (
            <>
              <CheckCircle2 className="size-3.5" />
              Cho phép bảo vệ
            </>
          ) : (
            <>
              <XCircle className="size-3.5" />
              Không cho bảo vệ
            </>
          )}
        </div>
      </div>

      <CriteriaSection review={review} criteria={criteria} />

      <div className="space-y-1 border-t border-slate-100 dark:border-neutral-800 pt-2.5">
        <p className="font-semibold text-foreground">Nhận xét tổng quan:</p>
        <p className="whitespace-pre-wrap text-slate-700 dark:text-neutral-300 leading-relaxed">
          {review.generalComment}
        </p>
      </div>
    </div>
  );
}

function CriteriaSection({
  review,
  criteria,
}: {
  review: TopicReviewItem;
  criteria: Record<string, unknown>;
}) {
  const str = (key: string) =>
    typeof criteria[key] === 'string' && criteria[key]
      ? String(criteria[key])
      : '—';
  const questions = Array.isArray(criteria.defenseQuestions)
    ? (criteria.defenseQuestions as unknown[]).filter(
        (q): q is string => typeof q === 'string' && q.trim().length > 0,
      )
    : [];

  return (
    <div className="space-y-1.5">
      <p className="font-semibold text-foreground">Đánh giá theo tiêu chí:</p>
      {review.reviewerType === 'SUPERVISOR' ? (
        <div className="space-y-1 pl-2 text-slate-700 dark:text-neutral-300">
          <p>
            <span className="text-muted-foreground">1. Thái độ làm việc: </span>
            {str('attitude')}
          </p>
          <p>
            <span className="text-muted-foreground">
              2. Khối lượng hoàn thành:{' '}
            </span>
            {str('workload')}
          </p>
          <p>
            <span className="text-muted-foreground">
              3. Chất lượng sản phẩm:{' '}
            </span>
            {str('productQuality')}
          </p>
          <p>
            <span className="text-muted-foreground">4. Quy cách báo cáo: </span>
            {str('reportQuality')}
          </p>
        </div>
      ) : (
        <div className="space-y-1 pl-2 text-slate-700 dark:text-neutral-300">
          <p>
            <span className="text-muted-foreground">
              1. Tính cấp thiết &amp; thực tiễn:{' '}
            </span>
            {str('scientificValue')}
          </p>
          <p>
            <span className="text-muted-foreground">
              2. Phương pháp &amp; kỹ thuật:{' '}
            </span>
            {str('methodology')}
          </p>
          <p>
            <span className="text-muted-foreground">
              3. Sản phẩm &amp; mã nguồn:{' '}
            </span>
            {str('productQuality')}
          </p>
          <p>
            <span className="text-muted-foreground">
              4. Hình thức báo cáo:{' '}
            </span>
            {str('reportQuality')}
          </p>
          {questions.length > 0 && (
            <div className="pt-1.5">
              <p className="font-medium text-foreground">
                Câu hỏi chất vấn trước Hội đồng:
              </p>
              <ol className="list-decimal pl-5 space-y-0.5 text-slate-700 dark:text-neutral-300">
                {questions.map((q, idx) => (
                  <li key={idx}>{q}</li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
