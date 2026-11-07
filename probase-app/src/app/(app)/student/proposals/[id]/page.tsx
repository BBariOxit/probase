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
  const { id } = use(params);
  const allowed = useRequireRole('STUDENT');
  const router = useRouter();
  const proposalId = Number(id);
  const { data: proposal, isPending, error } = useProposal(proposalId);
  const [isEditing, setIsEditing] = useState(false);
  const update = useUpdateProposal();
  const submitProposal = useSubmitProposal();
  const uploadAttachment = useUploadProposalAttachment();
  const deleteAttachment = useDeleteProposalAttachment();

  useBreadcrumbLabel(id, proposal?.title);

  if (!allowed) return null;

  if (isPending) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !proposal) {
    return <p className="text-sm text-destructive">Không tìm thấy đề xuất.</p>;
  }

  const isDraft = proposal.status === 'DRAFT';
  const isPendingStatus = proposal.status === 'PENDING';
  const isEditable = isDraft || isPendingStatus;

  const lecturerName = proposal.requestedLecturer.academicTitle
    ? `${proposal.requestedLecturer.academicTitle} ${proposal.requestedLecturer.fullName}`
    : proposal.requestedLecturer.fullName;

  return (
    <div className="space-y-4 max-w-5xl">
      {/* Thanh điều hướng & nút sửa */}
      <div className="flex items-center justify-between gap-3">
        <Button
          variant="default"
          size="sm"
          render={<Link href="/student/proposals" />}
          className="gap-2 cursor-pointer shadow-xs font-semibold"
        >
          <ArrowLeft className="size-4" /> Quay lại danh sách đề xuất
        </Button>

        {isEditable && !isEditing && (
          <Button
            variant="default"
            size="sm"
            onClick={() => setIsEditing(true)}
            className="gap-1.5 cursor-pointer font-semibold shadow-xs bg-primary text-white hover:bg-primary/90"
          >
            <Pencil className="size-4" />
            <span>Sửa đề xuất</span>
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          {isDraft && (
            <div className="rounded-xl border border-muted-foreground/30 bg-muted/40 p-4 space-y-2">
              <h3 className="text-sm font-semibold flex items-center gap-1.5 text-foreground">
                <FileEdit className="size-4 text-muted-foreground" />
                Bản nháp đề xuất (Chỉ bạn nhìn thấy)
              </h3>
              <p className="text-xs text-muted-foreground">
                Đề xuất này chỉ được lưu trên trang của bạn và giảng viên chưa nhận được.
                Hãy kiểm tra kỹ thông tin, bổ sung tệp đính kèm rồi bấm &quot;Gửi cho giảng viên&quot; để nộp chính thức.
              </p>
            </div>
          )}

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

          {proposal.status === 'REJECTED' && (
            <div className="rounded-xl border border-status-danger/30 bg-status-danger-bg/40 p-4 space-y-1.5">
              <h3 className="text-sm font-semibold text-status-danger flex items-center gap-1.5">
                <XCircle className="size-4" />
                Đề xuất không được chấp nhận
              </h3>
              {proposal.lecturerFeedback && (
                <p className="text-sm text-foreground whitespace-pre-line">
                  Lý do: {proposal.lecturerFeedback}
                </p>
              )}
            </div>
          )}

          {/* Nếu đang chỉnh sửa: hiện ProposalForm; Nếu không: hiện trang chi tiết chuẩn */}
          {isEditing && isEditable ? (
            <div className="rounded-2xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#1e1e1e] p-6 shadow-xs">
              <div className="mb-4 pb-3 border-b border-border flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900 dark:text-neutral-100 flex items-center gap-2">
                  <Pencil className="size-4 text-primary" />
                  Chỉnh sửa nội dung đề xuất
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditing(false)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Hủy chỉnh sửa
                </Button>
              </div>

              <ProposalForm
                projectTypes={[proposal.projectType]}
                fixed={{
                  projectType: proposal.projectType.name,
                  lecturer: lecturerName,
                }}
                defaultValues={{
                  projectTypeId: proposal.projectType.id,
                  requestedLecturerId: proposal.requestedLecturer.id,
                  title: proposal.title,
                  description: proposal.description,
                  expectedOutcomes: proposal.expectedOutcomes,
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
                  });

                  if (isDraft) {
                    await submitProposal.mutateAsync(proposal.id);
                    toast.success('Đã gửi đề xuất cho giảng viên thành công.');
                    router.push('/student/proposals');
                  } else {
                    toast.success('Đã lưu cập nhật đề xuất.');
                    setIsEditing(false);
                  }
                }}
                onCancel={() => setIsEditing(false)}
              >
                <div className="pt-2">
                  <ProposalAttachments
                    attachments={proposal.attachments ?? []}
                    canManage
                    onUpload={(file) =>
                      uploadAttachment.mutateAsync({ id: proposal.id, file })
                    }
                    onDelete={(attachmentId) =>
                      deleteAttachment.mutateAsync({
                        proposalId: proposal.id,
                        attachmentId,
                      })
                    }
                  />
                </div>
              </ProposalForm>
            </div>
          ) : (
            <article className="rounded-2xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#1e1e1e] shadow-xs overflow-hidden">
              {/* Header chi tiết đề xuất */}
              <div className="p-6 sm:p-8 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs">
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
                </div>

                <h1 className="text-2xl sm:text-3xl font-bold font-heading text-slate-900 dark:text-neutral-50 tracking-tight leading-snug">
                  {proposal.title}
                </h1>

                <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5 font-medium">
                    <CalendarDays className="size-3.5" />
                    Ngày gửi: {dateFormat.format(new Date(proposal.createdAt))}
                  </span>
                </div>
              </div>

              {/* Nội dung chi tiết các phần */}
              <div className="p-6 sm:p-8 pt-0 space-y-6">
                <div className="rounded-xl border border-slate-100 dark:border-neutral-800/80 bg-slate-50/50 dark:bg-neutral-900/40 p-5 space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <FileText className="size-4 text-primary" />
                    Mô tả nội dung yêu cầu
                  </h3>
                  <div className="text-sm sm:text-base leading-relaxed text-slate-800 dark:text-neutral-200 whitespace-pre-line text-justify font-normal">
                    {proposal.description || 'Chưa có mô tả chi tiết.'}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-100 dark:border-neutral-800/80 bg-slate-50/50 dark:bg-neutral-900/40 p-5 space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <Target className="size-4 text-emerald-600 dark:text-emerald-400" />
                    Yêu cầu đầu ra & Mục tiêu
                  </h3>
                  <div className="text-sm sm:text-base leading-relaxed text-slate-800 dark:text-neutral-200 whitespace-pre-line text-justify font-normal">
                    {proposal.expectedOutcomes || 'Chưa có yêu cầu đầu ra cụ thể.'}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-100 dark:border-neutral-800/80 bg-slate-50/50 dark:bg-neutral-900/40 p-5 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <Layers className="size-4 text-amber-500" />
                    Tài liệu & Hình ảnh đính kèm ({proposal.attachments?.length ?? 0})
                  </h3>
                  <ProposalAttachments
                    attachments={proposal.attachments ?? []}
                    canManage={false}
                  />
                </div>
              </div>
            </article>
          )}
        </div>

        <div className="lg:col-span-1">
          {isDraft ? (
            <div className="rounded-xl border border-dashed p-5 text-center text-xs text-muted-foreground space-y-2">
              <Send className="size-5 mx-auto text-muted-foreground/60" />
              <p className="font-medium text-foreground">Trao đổi & Góp ý</p>
              <p>
                Khung trao đổi sẽ mở sau khi bạn nhấn &quot;Gửi cho giảng viên&quot;.
              </p>
            </div>
          ) : (
            <ProposalCommentThread proposal={proposal} />
          )}
        </div>
      </div>
    </div>
  );
}
