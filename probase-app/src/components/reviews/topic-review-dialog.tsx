'use client';

import { useState } from 'react';
import {
  Award,
  CheckCircle2,
  ExternalLink,
  FileDown,
  FileText,
  HelpCircle,
  Loader2,
  Printer,
  ShieldAlert,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { sanitizeLecturerName } from '@/lib/utils';
import { useGroupReviews, useSubmitTopicReview } from '@/lib/api/reviews';
import type { EvaluationCriteria, TopicReviewItem } from '@/lib/api/types';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface TopicReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: number;
  groupName?: string | null;
  topicTitle: string;
  projectTypeName?: string;
  projectTypeCode?: string;
  role: 'SUPERVISOR' | 'REVIEWER';
  expectedTemplate: 'M02' | 'M04' | 'M05';
  supervisorName?: string;
  reviewerName?: string;
  members: Array<{
    id: number;
    fullName: string;
    studentCode: string;
    class?: string | null;
  }>;
  stage2Report?: {
    reportFileUrl?: string | null;
    sourceCodeUrl?: string | null;
    workloadPercentage?: number | null;
    isPassed?: boolean | null;
  } | null;
  latestSubmission?: {
    fileUrl?: string | null;
    fileName?: string | null;
    submissionUrl?: string | null;
  } | null;
  existingReview?: TopicReviewItem | null;
  onSuccess?: () => void;
}

export function TopicReviewDialog({
  open,
  onOpenChange,
  groupId,
  groupName,
  topicTitle,
  projectTypeName,
  role,
  expectedTemplate,
  supervisorName,
  reviewerName,
  members,
  stage2Report,
  latestSubmission,
  existingReview,
  onSuccess,
}: TopicReviewDialogProps) {
  const isSupervisor = role === 'SUPERVISOR';
  const { data: groupReviewsData } = useGroupReviews(open ? groupId : null);
  const activeReview =
    existingReview ||
    (isSupervisor
      ? groupReviewsData?.supervisorReview
      : groupReviewsData?.reviewerReview);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto sm:max-w-4xl">
        {open && (
          <TopicReviewDialogBody
            key={`${groupId}-${expectedTemplate}-${activeReview?.id ?? 'new'}-${activeReview?.signedAt ?? ''}`}
            onOpenChange={onOpenChange}
            groupId={groupId}
            groupName={groupName}
            topicTitle={topicTitle}
            projectTypeName={projectTypeName}
            role={role}
            expectedTemplate={expectedTemplate}
            supervisorName={supervisorName}
            reviewerName={reviewerName}
            members={members}
            stage2Report={stage2Report}
            latestSubmission={latestSubmission}
            existingReview={existingReview}
            activeReview={activeReview}
            onSuccess={onSuccess}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function TopicReviewDialogBody({
  onOpenChange,
  groupId,
  groupName,
  topicTitle,
  projectTypeName,
  role,
  expectedTemplate,
  supervisorName,
  reviewerName,
  members,
  stage2Report,
  latestSubmission,
  existingReview,
  activeReview,
  onSuccess,
}: Omit<TopicReviewDialogProps, 'open' | 'projectTypeCode'> & {
  activeReview?: TopicReviewItem | null;
}) {
  const isSupervisor = role === 'SUPERVISOR';
  const templateTitle =
    expectedTemplate === 'M04'
      ? 'Mẫu M04 – Nhận xét của Cán bộ Hướng dẫn (KLTN)'
      : expectedTemplate === 'M02'
        ? 'Mẫu M02 – Nhận xét của Cán bộ Hướng dẫn (Đồ án)'
        : 'Mẫu M05 – Nhận xét của Cán bộ Phản biện';

  const criteriaDefaults = activeReview?.evaluationCriteria;

  // Criteria fields based on template
  const [attitude, setAttitude] = useState<string>(
    () =>
      criteriaDefaults?.attitude ||
      'Tích cực, chủ động, tuân thủ đúng tiến độ.',
  );
  const [workload, setWorkload] = useState<string>(
    () =>
      criteriaDefaults?.workload ||
      'Hoàn thành đầy đủ khối lượng công việc theo đề cương chi tiết.',
  );
  const [productQuality, setProductQuality] = useState<string>(
    () =>
      criteriaDefaults?.productQuality ||
      'Sản phẩm chạy ổn định, đáp ứng tốt các yêu cầu chức năng đề ra.',
  );
  const [reportQuality, setReportQuality] = useState<string>(
    () =>
      criteriaDefaults?.reportQuality ||
      'Bố cục quyển báo cáo rõ ràng, văn phong khoa học, đúng quy cách.',
  );
  const [scientificValue, setScientificValue] = useState<string>(
    () =>
      criteriaDefaults?.scientificValue ||
      'Đề tài có tính thực tiễn cao, giải quyết được bài toán đặt ra.',
  );
  const [methodology, setMethodology] = useState<string>(
    () =>
      criteriaDefaults?.methodology ||
      'Phương pháp nghiên cứu hợp lý, áp dụng công nghệ phù hợp.',
  );

  // Defense questions (for Reviewer M05)
  const [questions, setQuestions] = useState<string[]>(() =>
    criteriaDefaults?.defenseQuestions?.length
      ? criteriaDefaults.defenseQuestions
      : [
          'Giải pháp kỹ thuật cốt lõi của đề tài có ưu thế gì so với các hệ thống tương tự hiện có?',
          'Nhóm đã tiến hành kiểm thử hiệu năng và bảo mật hệ thống như thế nào?',
        ],
  );

  const [generalComment, setGeneralComment] = useState<string>(
    () =>
      activeReview?.generalComment ||
      'Nhóm sinh viên đã nỗ lực hoàn thành đề tài, sản phẩm đạt yêu cầu chất lượng chuyên môn.',
  );
  const [isDefenseAllowed, setIsDefenseAllowed] = useState<boolean>(
    () => activeReview?.isDefenseAllowed ?? true,
  );

  const [viewMode, setViewMode] = useState<'EDIT' | 'PREVIEW'>('EDIT');

  const submitMutation = useSubmitTopicReview();

  const handleQuestionChange = (index: number, val: string) => {
    const updated = [...questions];
    updated[index] = val;
    setQuestions(updated);
  };

  const handleAddQuestion = () => {
    if (questions.length < 5) {
      setQuestions([...questions, '']);
    }
  };

  const handleRemoveQuestion = (index: number) => {
    if (questions.length > 1) {
      setQuestions(questions.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async () => {
    const criteria: EvaluationCriteria = isSupervisor
      ? {
          attitude,
          workload,
          productQuality,
          reportQuality,
        }
      : {
          scientificValue,
          methodology,
          productQuality,
          reportQuality,
          defenseQuestions: questions.filter((q) => q.trim().length > 0),
        };

    try {
      await submitMutation.mutateAsync({
        groupId,
        templateCode: expectedTemplate,
        evaluationCriteria: criteria,
        generalComment,
        isDefenseAllowed,
      });
      onSuccess?.();
      onOpenChange(false);
    } catch {
      // Error handled by react-query mutation
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <DialogHeader className="border-b pb-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Badge variant={isSupervisor ? 'default' : 'secondary'}>
              {isSupervisor ? 'GV Hướng dẫn' : 'GV Phản biện'}
            </Badge>
            <Badge variant="outline" className="font-semibold text-primary">
              {expectedTemplate}
            </Badge>
            {projectTypeName && (
              <span className="text-xs text-muted-foreground">
                ({projectTypeName})
              </span>
            )}
          </div>

          {/* Toggle view mode */}
          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              variant={viewMode === 'EDIT' ? 'default' : 'outline'}
              className="h-8 text-xs"
              onClick={() => setViewMode('EDIT')}
            >
              Nhập nhận xét
            </Button>
            <Button
              size="sm"
              variant={viewMode === 'PREVIEW' ? 'default' : 'outline'}
              className="h-8 text-xs gap-1"
              onClick={() => setViewMode('PREVIEW')}
            >
              <FileText className="size-3.5" />
              Xem biểu mẫu DLU
            </Button>
            {viewMode === 'PREVIEW' && (
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs gap-1"
                onClick={handlePrint}
              >
                <Printer className="size-3.5" />
                In
              </Button>
            )}
          </div>
        </div>

        <DialogTitle className="mt-2 text-xl font-bold font-heading">
          {templateTitle}
        </DialogTitle>
        <DialogDescription className="text-xs">
          Đề tài: <strong className="text-foreground">{topicTitle}</strong>
          {groupName ? ` — ${groupName}` : ''}
        </DialogDescription>
      </DialogHeader>

      {viewMode === 'EDIT' ? (
        <div className="space-y-6 py-2">
          {/* Dossier & Deliverables Bar */}
          <div className="rounded-xl border bg-muted/30 p-3.5 text-xs space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold text-muted-foreground flex items-center gap-1.5">
                <Users className="size-3.5" />
                Thành viên nhóm:
              </span>
              <span className="font-medium text-foreground">
                {members
                  .map((m) => `${m.fullName} (${m.studentCode})`)
                  .join(', ')}
              </span>
            </div>

            {/* Links to deliverables */}
            <div className="flex flex-wrap items-center gap-3 pt-1 border-t text-[11px]">
              {latestSubmission?.fileUrl && (
                <a
                  href={latestSubmission.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline font-medium"
                >
                  <FileDown className="size-3" />
                  Quyển báo cáo ({latestSubmission.fileName || 'PDF'})
                </a>
              )}
              {stage2Report?.reportFileUrl && !latestSubmission?.fileUrl && (
                <a
                  href={stage2Report.reportFileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline font-medium"
                >
                  <FileDown className="size-3" />
                  Báo cáo TĐ2 (.pdf)
                </a>
              )}
              {(latestSubmission?.submissionUrl ||
                stage2Report?.sourceCodeUrl) && (
                <a
                  href={
                    latestSubmission?.submissionUrl ||
                    stage2Report?.sourceCodeUrl ||
                    '#'
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-blue-600 hover:underline font-medium"
                >
                  <ExternalLink className="size-3" />
                  Kho mã nguồn (Git)
                </a>
              )}
              {stage2Report && (
                <span className="ml-auto inline-flex items-center gap-1 text-muted-foreground">
                  Tiến độ 2:{' '}
                  <strong
                    className={
                      stage2Report.isPassed
                        ? 'text-emerald-600'
                        : 'text-destructive'
                    }
                  >
                    {stage2Report.workloadPercentage ?? 0}% khối lượng (
                    {stage2Report.isPassed ? 'Đạt' : 'Chưa đạt'})
                  </strong>
                </span>
              )}
            </div>
          </div>

          {/* Barem Evaluation Criteria */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold flex items-center gap-1.5">
              <Award className="size-4 text-primary" />
              Tiêu chí Đánh giá theo Barem chuẩn Khoa CNTT – ĐH Đà Lạt
            </h3>

            {isSupervisor ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">
                    1. Tinh thần, thái độ làm việc & tính chủ động:
                  </Label>
                  <Input
                    value={attitude}
                    onChange={(e) => setAttitude(e.target.value)}
                    placeholder="Ý thức chấp hành, tính tự giác..."
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">
                    2. Khối lượng công việc hoàn thành so với đề cương M03:
                  </Label>
                  <Input
                    value={workload}
                    onChange={(e) => setWorkload(e.target.value)}
                    placeholder="Mức độ đạt được so với mục tiêu..."
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">
                    3. Chất lượng sản phẩm thực nghiệm / phần mềm:
                  </Label>
                  <Input
                    value={productQuality}
                    onChange={(e) => setProductQuality(e.target.value)}
                    placeholder="Tính đúng đắn, chạy demo, code sạch..."
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">
                    4. Bố cục, quy cách và văn phong quyển báo cáo:
                  </Label>
                  <Input
                    value={reportQuality}
                    onChange={(e) => setReportQuality(e.target.value)}
                    placeholder="Đúng quy cách, định dạng luận văn..."
                    className="text-xs"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">
                      1. Tính cấp thiết và ý nghĩa thực tiễn của đề tài:
                    </Label>
                    <Input
                      value={scientificValue}
                      onChange={(e) => setScientificValue(e.target.value)}
                      placeholder="Tính mới, giá trị ứng dụng..."
                      className="text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">
                      2. Phương pháp nghiên cứu & Giải pháp kỹ thuật:
                    </Label>
                    <Input
                      value={methodology}
                      onChange={(e) => setMethodology(e.target.value)}
                      placeholder="Tính hợp lý, tiếp cận công nghệ..."
                      className="text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">
                      3. Đánh giá chất lượng sản phẩm & mã nguồn:
                    </Label>
                    <Input
                      value={productQuality}
                      onChange={(e) => setProductQuality(e.target.value)}
                      placeholder="Kiến trúc hệ thống, độ tin cậy..."
                      className="text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">
                      4. Hình thức và kết cấu quyển báo cáo:
                    </Label>
                    <Input
                      value={reportQuality}
                      onChange={(e) => setReportQuality(e.target.value)}
                      placeholder="Trình bày mạch lạc, tài liệu tham khảo..."
                      className="text-xs"
                    />
                  </div>
                </div>

                {/* Defense Questions */}
                <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
                      <HelpCircle className="size-3.5" />
                      Các câu hỏi chất vấn trước Hội đồng (GVPB đặt cho SV):
                    </Label>
                    {questions.length < 4 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 text-[11px] text-blue-600 hover:text-blue-700"
                        onClick={handleAddQuestion}
                      >
                        + Thêm câu hỏi
                      </Button>
                    )}
                  </div>

                  {questions.map((q, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-xs font-bold text-muted-foreground min-w-[20px]">
                        {idx + 1}.
                      </span>
                      <Input
                        value={q}
                        onChange={(e) =>
                          handleQuestionChange(idx, e.target.value)
                        }
                        placeholder={`Câu hỏi chất vấn số ${idx + 1}...`}
                        className="text-xs bg-background"
                      />
                      {questions.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-destructive hover:bg-destructive/10"
                          onClick={() => handleRemoveQuestion(idx)}
                        >
                          ×
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* General Comment */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">
              Nhận xét tổng quan (Ưu điểm, Hạn chế, Đánh giá):
            </Label>
            <Textarea
              rows={4}
              value={generalComment}
              onChange={(e) => setGeneralComment(e.target.value)}
              placeholder="Nhập nhận xét chi tiết của Thầy/Cô về toàn bộ quá trình thực hiện và kết quả đồ án..."
              className="text-xs leading-relaxed"
            />
          </div>

          {/* Defense Gate Toggle */}
          <div className="rounded-xl border-2 p-4 transition-colors">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  {isDefenseAllowed ? (
                    <ShieldCheck className="size-4 text-emerald-600" />
                  ) : (
                    <ShieldAlert className="size-4 text-destructive" />
                  )}
                  Kết luận thẩm định bảo vệ
                </span>
                <p className="text-sm font-semibold">
                  {isDefenseAllowed ? (
                    <span className="text-emerald-600 dark:text-emerald-400">
                      Đồng ý cho phép sinh viên bảo vệ
                    </span>
                  ) : (
                    <span className="text-destructive">
                      Không đồng ý cho phép bảo vệ
                    </span>
                  )}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Yêu cầu sự đồng thuận của cả GVHD và GVPB để sinh viên được ra
                  hội đồng.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={isDefenseAllowed ? 'default' : 'outline'}
                  className={
                    isDefenseAllowed
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : ''
                  }
                  onClick={() => setIsDefenseAllowed(true)}
                >
                  Cho phép bảo vệ
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={!isDefenseAllowed ? 'destructive' : 'outline'}
                  onClick={() => setIsDefenseAllowed(false)}
                >
                  Không cho bảo vệ
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* PREVIEW OFFICIAL DLU ACADEMIC FORM */
        <div className="my-2 max-h-[60vh] overflow-y-auto rounded-xl border bg-card p-6 shadow-sm print:m-0 print:border-none print:p-0 print:shadow-none text-xs leading-relaxed font-serif">
          {/* Academic Header */}
          <div className="grid grid-cols-2 text-center pb-4 border-b">
            <div>
              <p className="text-[11px] uppercase tracking-wide">
                TRƯỜNG ĐẠI HỌC ĐÀ LẠT
              </p>
              <p className="text-xs font-bold uppercase">
                KHOA CÔNG NGHỆ THÔNG TIN
              </p>
            </div>
            <div>
              <p className="text-[11px] font-bold">
                CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
              </p>
              <p className="text-[10px] italic">Độc lập – Tự do – Hạnh phúc</p>
            </div>
          </div>

          <div className="my-4 text-center">
            <h2 className="text-base font-bold uppercase tracking-tight">
              {expectedTemplate === 'M04'
                ? 'PHIẾU NHẬN XÉT CỦA CÁN BỘ HƯỚNG DẪN'
                : expectedTemplate === 'M02'
                  ? 'PHIẾU NHẬN XÉT CỦA CÁN BỘ HƯỚNG DẪN ĐỒ ÁN'
                  : 'PHIẾU NHẬN XÉT CỦA CÁN BỘ PHẢN BIỆN'}
            </h2>
            <p className="text-[11px] italic text-muted-foreground">
              (Ban hành kèm theo Quy định Quản lý Đồ án - Khoa CNTT Trường ĐH Đà
              Lạt)
            </p>
          </div>

          {/* Topic & Student Details */}
          <div className="space-y-1.5 my-4">
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
                Cán bộ {isSupervisor ? 'hướng dẫn' : 'phản biện'}:
              </strong>{' '}
              {isSupervisor
                ? supervisorName
                  ? sanitizeLecturerName(supervisorName).displayName
                  : '—'
                : reviewerName
                  ? sanitizeLecturerName(reviewerName).displayName
                  : '—'}
            </p>
          </div>

          {/* Criteria */}
          <div className="my-4 space-y-2">
            <p className="font-bold uppercase text-[11px]">
              I. ĐÁNH GIÁ THEO CÁC TIÊU CHÍ:
            </p>
            {isSupervisor ? (
              <div className="space-y-1.5 pl-3">
                <p>1. Tinh thần, thái độ làm việc: {attitude}</p>
                <p>2. Khối lượng hoàn thành: {workload}</p>
                <p>3. Chất lượng sản phẩm/phần mềm: {productQuality}</p>
                <p>4. Bố cục và quy cách quyển báo cáo: {reportQuality}</p>
              </div>
            ) : (
              <div className="space-y-1.5 pl-3">
                <p>1. Tính cấp thiết & ý nghĩa thực tiễn: {scientificValue}</p>
                <p>2. Phương pháp & giải pháp kỹ thuật: {methodology}</p>
                <p>3. Chất lượng sản phẩm & mã nguồn: {productQuality}</p>
                <p>4. Bố cục quyển báo cáo: {reportQuality}</p>
                <div className="pt-2">
                  <p className="font-semibold">
                    Câu hỏi chất vấn trước Hội đồng:
                  </p>
                  <ol className="list-decimal pl-5 space-y-0.5 italic">
                    {questions
                      .filter((q) => q.trim())
                      .map((q, idx) => (
                        <li key={idx}>{q}</li>
                      ))}
                  </ol>
                </div>
              </div>
            )}
          </div>

          {/* General Comment */}
          <div className="my-4 space-y-1">
            <p className="font-bold uppercase text-[11px]">
              II. NHẬN XÉT CHUNG:
            </p>
            <p className="pl-3 whitespace-pre-wrap">{generalComment}</p>
          </div>

          {/* Conclusion */}
          <div className="my-4 space-y-1 border-t pt-3">
            <p className="font-bold uppercase text-[11px]">III. KẾT LUẬN:</p>
            <p className="pl-3 font-semibold">
              Đề tài:{' '}
              {isDefenseAllowed ? 'ĐƯỢC PHÉP BẢO VỆ' : 'KHÔNG ĐƯỢC PHÉP BẢO VỆ'}{' '}
              TRƯỚC HỘI ĐỒNG.
            </p>
          </div>

          {/* Signature Box */}
          <div className="grid grid-cols-2 text-center pt-6 mt-6 border-t">
            <div></div>
            <div className="space-y-1">
              <p className="italic text-[11px]">
                Đà Lạt, ngày {new Date().getDate()} tháng{' '}
                {new Date().getMonth() + 1} năm {new Date().getFullYear()}
              </p>
              <p className="font-bold uppercase">
                CÁN BỘ {isSupervisor ? 'HƯỚNG DẪN' : 'PHẢN BIỆN'}
              </p>
              <p className="text-[10px] text-muted-foreground italic">
                (Đã ký điện tử và xác thực trên hệ thống ProBase)
              </p>
              <div className="pt-8 font-bold">
                {isSupervisor
                  ? supervisorName
                    ? sanitizeLecturerName(supervisorName).displayName
                    : '—'
                  : reviewerName
                    ? sanitizeLecturerName(reviewerName).displayName
                    : '—'}
              </div>
            </div>
          </div>
        </div>
      )}

      <DialogFooter className="border-t pt-4 flex flex-row items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          onClick={() => onOpenChange(false)}
          disabled={submitMutation.isPending}
        >
          Đóng
        </Button>

        <Button
          type="button"
          onClick={handleSubmit}
          disabled={submitMutation.isPending}
          className="gap-1.5"
        >
          {submitMutation.isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Đang lưu...
            </>
          ) : (
            <>
              <CheckCircle2 className="size-4" />
              {existingReview
                ? 'Cập nhật Phiếu nhận xét'
                : 'Lưu & Ký Phiếu nhận xét'}
            </>
          )}
        </Button>
      </DialogFooter>
    </>
  );
}
