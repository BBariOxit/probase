'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  useDeleteProposalAttachment,
  useProposal,
  useResubmitProposal,
  useUpdateProposal,
  useUploadProposalAttachment,
} from '@/lib/api/proposals';
import { useRequireRole } from '@/lib/auth/use-require-role';
import { useBreadcrumbLabel } from '@/lib/breadcrumb-context';
import { ProposalAttachments } from '@/components/proposals/proposal-attachments';
import { ProposalForm } from '@/components/proposals/proposal-form';

export default function EditProposalPage({
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
  const resubmit = useResubmitProposal();
  const uploadAttachment = useUploadProposalAttachment();
  const deleteAttachment = useDeleteProposalAttachment();

  // Swap the raw ID for the proposal title in the breadcrumb.
  useBreadcrumbLabel(id, proposal?.title);

  if (!allowed) return null;

  const isEditable =
    proposal?.status === 'PENDING' || proposal?.status === 'NEEDS_REVISION';
  const isNeedsRevision = proposal?.status === 'NEEDS_REVISION';

  return (
    <div className="space-y-5">
      {isPending ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : error || !proposal ? (
        <p className="text-sm text-destructive">Không tìm thấy đề xuất.</p>
      ) : !isEditable ? (
        /*
          The API refuses this too, so the form would only lead to a message
          after the typing. Reached by a stale tab or a bookmarked link far more
          often than by anything else, which is why it explains rather than
          bounces: somebody arriving here has just been answered.
        */
        <p className="max-w-2xl rounded-xl border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          Đề xuất này đã được chốt (nhận hoặc từ chối) nên không sửa được nữa.
          Mở lại danh sách để xem chi tiết.
        </p>
      ) : (
        <div className="max-w-2xl space-y-5">
          {isNeedsRevision && (
            <div className="rounded-xl border border-status-active/30 bg-status-active-bg/40 p-4 space-y-1.5">
              <h3 className="text-sm font-semibold text-status-active flex items-center gap-1.5">
                <span>⚠️</span> Nhận xét & Yêu cầu chỉnh sửa của Giảng viên
              </h3>
              <p className="text-sm whitespace-pre-line text-foreground">
                {proposal.lecturerFeedback}
              </p>
              <p className="pt-1 text-xs text-muted-foreground">
                Hãy chỉnh sửa lại thông tin đề tài hoặc bổ sung tệp đính kèm bên
                dưới, sau đó nhấn &quot;Gửi lại cho giảng viên&quot;.
              </p>
            </div>
          )}

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
            submitLabel={
              isNeedsRevision ? 'Gửi lại cho giảng viên' : 'Lưu thay đổi'
            }
            onSubmit={async (values) => {
              if (isNeedsRevision) {
                await resubmit.mutateAsync({
                  id: proposal.id,
                  title: values.title,
                  description: values.description,
                  expectedOutcomes: values.expectedOutcomes,
                });
                toast.success('Đề xuất đã được chỉnh sửa và gửi lại cho giảng viên.');
              } else {
                await update.mutateAsync({
                  id: proposal.id,
                  title: values.title,
                  description: values.description,
                  expectedOutcomes: values.expectedOutcomes,
                });
                toast.success('Đề xuất đã được lưu.');
              }
              router.push('/student/proposals');
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
        </div>
      )}
    </div>
  );
}
