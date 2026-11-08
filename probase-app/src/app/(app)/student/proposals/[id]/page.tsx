'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  FileEdit,
  FileText,
  Layers,
  Loader2,
  Pencil,
  Send,
  Target,
  Users,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  useDeleteProposalAttachment,
  useProposal,
  useSubmitProposal,
  useUpdateProposal,
  useUploadProposalAttachment,
} from '@/lib/api/proposals';
import { useRequireRole } from '@/lib/auth/use-require-role';
import { useBreadcrumbLabel } from '@/lib/breadcrumb-context';
import { ProposalAttachments } from '@/components/proposals/proposal-attachments';
import { ProposalCommentThread } from '@/components/proposals/proposal-comment-thread';
import { ProposalForm } from '@/components/proposals/proposal-form';
import { ProposalStatusBadge } from '@/components/proposals/proposal-card';
import { Button } from '@/components/ui/button';

const dateFormat = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

export default function StudentProposalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const allowed = useRequireRole('STUDENT');
  const router = useRouter();
  const { id } = use(params);
  const proposalId = Number(id);

  const { data: proposal, isPending, error } = useProposal(proposalId);
  const update = useUpdateProposal();
  const submitProposal = useSubmitProposal();
  const uploadAttachment = useUploadProposalAttachment();
  const deleteAttachment = useDeleteProposalAttachment();

  const [isEditing, setIsEditing] = useState(false);

  useBreadcrumbLabel(id, proposal?.title);

  if (!allowed) return null;

  if (isPending) {
    return (
      <div className="mx-auto max-w-4xl space-y-4">
        <Button
          variant="default"
          size="sm"
          render={<Link href="/student/proposals" />}
          className="gap-2 cursor-pointer shadow-xs font-semibold"
        >
          <ArrowLeft className="size-4" /> Quay lại danh sách đề xuất
        </Button>
        <div className="flex justify-center py-16">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (error || !proposal) {
    return (
      <div className="mx-auto max-w-4xl space-y-4">
        <Button
          variant="default"
          size="sm"
          render={<Link href="/student/proposals" />}
          className="gap-2 cursor-pointer shadow-xs font-semibold"
        >
          <ArrowLeft className="size-4" /> Quay lại danh sách đề xuất
        </Button>
        <p className="text-sm text-destructive font-medium">
          Không tìm thấy đề xuất hoặc bạn không có quyền xem đề xuất này.
        </p>
      </div>
    );
  }

  const isDraft = proposal.status === 'DRAFT';
  const isPendingStatus =
    proposal.status === 'PENDING' || proposal.status === 'NEEDS_REVISION';
  const isEditable = isDraft || isPendingStatus;

  const lecturerName = proposal.requestedLecturer.academicTitle
    ? `${proposal.requestedLecturer.academicTitle} ${proposal.requestedLecturer.fullName}`
    : proposal.requestedLecturer.fullName;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Thanh điều hướng */}
      <div>
        <Button
          variant="default"
          size="sm"
          render={<Link href="/student/proposals" />}
          className="gap-2 cursor-pointer shadow-xs font-semibold"
        >
          <ArrowLeft className="size-4" /> Quay lại danh sách đề xuất
        </Button>
      </div>

      {/* Thông báo trạng thái bản nháp */}
      {isDraft && !isEditing && (
        <div className="rounded-xl border border-muted-foreground/30 bg-muted/40 p-4 space-y-2">
          <h3 className="text-sm font-semibold flex items-center gap-1.5 text-foreground">
            <FileEdit className="size-4 text-muted-foreground" />
            Bản nháp đề xuất (Chỉ bạn nhìn thấy)
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Đề xuất này chỉ được lưu trên trang của bạn và giảng viên chưa nhận được.
            Hãy kiểm tra kỹ thông tin, bổ sung tệp đính kèm rồi bấm &quot;Gửi cho giảng viên&quot; để nộp chính thức.
          </p>
        </div>
      )}

      {/* Thông báo khi được nhận */}
      {proposal.status === 'ACCEPTED' && (
        <div className="rounded-xl border border-status-success/30 bg-status-success-bg/40 p-4 space-y-2">
          <h3 className="text-sm font-semibold text-status-success flex items-center gap-1.5">
            <CheckCircle2 className="size-4" />
            Đề xuất đã được Giảng viên nhận hướng dẫn
          </h3>
          <p className="text-sm text-foreground">
            Đề tài đã được tạo từ đề xuất này. Sau khi khoa phê duyệt, bạn có thể đăng ký giữ chỗ.
          </p>
          {proposal.convertedTopic && (
            <Button
              size="sm"
              className="gap-1.5 mt-1"
              render={<Link href={`/student/topics/${proposal.convertedTopic.id}`} />}
            >
              Xem đề tài & Đăng ký
              <ArrowRight className="size-3.5" />
            </Button>
          )}
        </div>
      )}

      {/* Thông báo khi bị từ chối */}
      {proposal.status === 'REJECTED' && (
        <div className="rounded-xl border border-status-danger/30 bg-status-danger-bg/40 p-4 space-y-1.5">
          <h3 className="text-sm font-semibold text-status-danger flex items-center gap-1.5">
            <XCircle className="size-4" />
            Đề xuất không được chấp nhận
          </h3>
          {proposal.lecturerFeedback && (
            <p className="text-sm text-foreground whitespace-pre-line break-words [overflow-wrap:anywhere]">
              Lý do: {proposal.lecturerFeedback}
            </p>
          )}
        </div>
      )}

      {/* Thẻ chi tiết đề xuất / Form sửa trực tiếp */}
      <article className="rounded-2xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#1e1e1e] shadow-xs overflow-hidden min-w-0 max-w-full break-words">
        {/* Header thẻ đề xuất: chứa thông tin loại đồ án, giảng viên & nút sửa ở góc phải trên cùng */}
        <div className="p-6 sm:p-8 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <ProposalStatusBadge status={proposal.status} />
              <span className="text-muted-foreground">•</span>
              <span className="font-medium text-muted-foreground">
                {proposal.projectType.name}
              </span>
              <span className="text-muted-foreground">•</span>
              <span className="font-medium text-muted-foreground">
                Gửi tới: {lecturerName}
              </span>
            </div>

            {/* Nút sửa đề xuất và nút gửi nằm ở góc phải trên cùng của form */}
            <div className="flex items-center gap-2">
              {isDraft && !isEditing && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={async () => {
                    await submitProposal.mutateAsync(proposal.id);
                    toast.success('Đã gửi đề xuất cho giảng viên thành công.');
                    router.push('/student/proposals');
                  }}
                  disabled={submitProposal.isPending}
                  className="gap-1.5 cursor-pointer font-semibold shadow-xs bg-primary text-white hover:bg-primary/90"
                >
                  {submitProposal.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Send className="size-4" />
                  )}
                  <span>Gửi cho giảng viên</span>
                </Button>
              )}

              {isEditable && !isEditing && (
                <Button
                  variant={isDraft ? 'outline' : 'default'}
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="gap-1.5 cursor-pointer font-semibold shadow-xs"
                >
                  <Pencil className="size-4" />
                  <span>Sửa đề xuất</span>
                </Button>
              )}
            </div>
          </div>

          {!isEditing ? (
            <>
              <div className="space-y-1.5 min-w-0">
                <h1 className="text-2xl sm:text-3xl font-bold font-heading text-slate-900 dark:text-neutral-50 tracking-tight leading-snug break-words [overflow-wrap:anywhere]">
                  {proposal.title}
                </h1>
              </div>

              <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5 font-medium">
                  <CalendarDays className="size-3.5" />
                  Ngày gửi: {dateFormat.format(new Date(proposal.createdAt))}
                </span>
                <span className="inline-flex items-center gap-1.5 font-medium">
                  <Users className="size-3.5" />
                  Sinh viên dự kiến: {proposal.maxStudents ?? 1} SV
                </span>
              </div>
            </>
          ) : (
            <div className="pt-1">
              <h2 className="text-lg font-bold font-heading text-foreground flex items-center gap-2">
                <Pencil className="size-4 text-primary" />
                Chỉnh sửa nội dung đề xuất
              </h2>
            </div>
          )}
        </div>

        {/* Nội dung chi tiết hoặc Form chỉnh sửa trực tiếp */}
        <div className="p-6 sm:p-8 pt-0 space-y-6">
          {!isEditing ? (
            <>
              <div className="rounded-xl border border-slate-100 dark:border-neutral-800/80 bg-slate-50/50 dark:bg-neutral-900/40 p-5 space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <FileText className="size-4 text-primary shrink-0" />
                  Mô tả nội dung yêu cầu
                </h3>
                <div className="text-sm sm:text-base leading-relaxed text-slate-800 dark:text-neutral-200 whitespace-pre-line text-justify font-normal break-words [overflow-wrap:anywhere]">
                  {proposal.description || 'Chưa có mô tả chi tiết.'}
                </div>
              </div>

              <div className="rounded-xl border border-slate-100 dark:border-neutral-800/80 bg-slate-50/50 dark:bg-neutral-900/40 p-5 space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Target className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  Yêu cầu đầu ra & Mục tiêu
                </h3>
                <div className="text-sm sm:text-base leading-relaxed text-slate-800 dark:text-neutral-200 whitespace-pre-line text-justify font-normal break-words [overflow-wrap:anywhere]">
                  {proposal.expectedOutcomes || 'Chưa có yêu cầu đầu ra cụ thể.'}
                </div>
              </div>

              <div className="rounded-xl border border-slate-100 dark:border-neutral-800/80 bg-slate-50/50 dark:bg-neutral-900/40 p-5 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Layers className="size-4 text-amber-500 shrink-0" />
                  Tài liệu & Hình ảnh đính kèm ({proposal.attachments?.length ?? 0})
                </h3>
                <ProposalAttachments
                  attachments={proposal.attachments ?? []}
                  canManage={isEditable}
                  onUpload={isEditable ? (file) => uploadAttachment.mutateAsync({ id: proposal.id, file }) : undefined}
                  onDelete={isEditable ? (attachmentId) => deleteAttachment.mutateAsync({ proposalId: proposal.id, attachmentId }) : undefined}
                />
              </div>
            </>
          ) : (
            <ProposalForm
              projectTypes={[proposal.projectType]}
              hideFixed
              className="max-w-none"
              defaultValues={{
                projectTypeId: proposal.projectType.id,
                requestedLecturerId: proposal.requestedLecturer.id,
                title: proposal.title,
                description: proposal.description,
                expectedOutcomes: proposal.expectedOutcomes,
                maxStudents: proposal.maxStudents ?? 1,
              }}
              submitLabel={isDraft ? 'Gửi cho giảng viên' : 'Lưu cập nhật'}
              draftLabel={isDraft ? 'Lưu bản nháp' : undefined}
              onSaveDraft={
                isDraft
                  ? async (values) => {
                      await update.mutateAsync({
                        id: proposal.id,
                        title: values.title,
                        description: values.description,
                        expectedOutcomes: values.expectedOutcomes,
                        maxStudents: values.maxStudents,
                      });
                      toast.success('Đã lưu bản nháp đề xuất.');
                      setIsEditing(false);
                    }
                  : undefined
              }
              onSubmit={async (values) => {
                await update.mutateAsync({
                  id: proposal.id,
                  title: values.title,
                  description: values.description,
                  expectedOutcomes: values.expectedOutcomes,
                  maxStudents: values.maxStudents,
                });

                if (isDraft) {
                  await submitProposal.mutateAsync(proposal.id);
                  toast.success('Đã gửi đề xuất cho giảng viên thành công.');
                } else {
                  toast.success('Đã lưu cập nhật đề xuất.');
                }
                setIsEditing(false);
              }}
              onCancel={() => setIsEditing(false)}
            />
          )}
        </div>
      </article>

      {/* Phần trao đổi & góp ý ở cuối trang */}
      <section className="space-y-3">
        {isDraft ? (
          <div className="rounded-xl border border-dashed p-6 text-center text-xs text-muted-foreground space-y-2 bg-card">
            <Send className="size-5 mx-auto text-muted-foreground/60" />
            <p className="font-semibold text-foreground text-sm">Trao đổi & Góp ý</p>
            <p>
              Khung trao đổi sẽ mở sau khi bạn nhấn &quot;Gửi cho giảng viên&quot;.
            </p>
          </div>
        ) : (
          <ProposalCommentThread proposal={proposal} />
        )}
      </section>
    </div>
  );
}
