'use client';

import { use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import {
  useDeleteProposalAttachment,
  useProposal,
  useUpdateProposal,
  useUploadProposalAttachment,
} from '@/lib/api/proposals';
import { useRequireRole } from '@/lib/auth/use-require-role';
import { useBreadcrumbLabel } from '@/lib/breadcrumb-context';
import { ProposalAttachments } from '@/components/proposals/proposal-attachments';
import { ProposalCommentThread } from '@/components/proposals/proposal-comment-thread';
import { ProposalForm } from '@/components/proposals/proposal-form';
import { Button } from '@/components/ui/button';

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
  const update = useUpdateProposal();
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

  const isPendingStatus = proposal.status === 'PENDING';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-5xl">
      <div className="lg:col-span-2 space-y-5">
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

        {isPendingStatus ? (
          <ProposalForm
            projectTypes={[proposal.projectType]}
            fixed={{
              projectType: proposal.projectType.name,
              lecturer: proposal.requestedLecturer.academicTitle
                ? `${proposal.requestedLecturer.academicTitle} ${proposal.requestedLecturer.fullName}`
                : proposal.requestedLecturer.fullName,
            }}
            defaultValues={{
              projectTypeId: proposal.projectType.id,
              requestedLecturerId: proposal.requestedLecturer.id,
              title: proposal.title,
              description: proposal.description,
              expectedOutcomes: proposal.expectedOutcomes,
            }}
            submitLabel="Lưu cập nhật đề xuất"
            onSubmit={async (values) => {
              await update.mutateAsync({
                id: proposal.id,
                title: values.title,
                description: values.description,
                expectedOutcomes: values.expectedOutcomes,
              });
              toast.success('Đã lưu cập nhật đề xuất và thông báo cho GVHD.');
            }}
            onCancel={() => router.push('/student/proposals')}
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
        ) : (
          <div className="space-y-4 rounded-xl border bg-card p-5">
            <h2 className="text-lg font-semibold">{proposal.title}</h2>
            <div className="space-y-1">
              <h4 className="text-xs font-medium text-muted-foreground">Mô tả</h4>
              <p className="text-sm whitespace-pre-line">{proposal.description}</p>
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-medium text-muted-foreground">Yêu cầu đầu ra</h4>
              <p className="text-sm whitespace-pre-line">{proposal.expectedOutcomes}</p>
            </div>
            <ProposalAttachments attachments={proposal.attachments ?? []} />
          </div>
        )}
      </div>

      <div className="lg:col-span-1">
        <ProposalCommentThread proposal={proposal} />
      </div>
    </div>
  );
}
