'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useProposal, useUpdateProposal } from '@/lib/api/proposals';
import { useRequireRole } from '@/lib/auth/use-require-role';
import { useBreadcrumbLabel } from '@/lib/breadcrumb-context';
import { ProposalForm } from '@/components/proposals/proposal-form';

export default function EditProposalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const allowed = useRequireRole('STUDENT');
  const router = useRouter();
  const { data: proposal, isPending, error } = useProposal(Number(id));
  const update = useUpdateProposal();

  // Swap the raw ID for the proposal title in the breadcrumb.
  useBreadcrumbLabel(id, proposal?.title);

  if (!allowed) return null;

  return (
    <div className="space-y-5">
      {isPending ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : error || !proposal ? (
        <p className="text-sm text-destructive">Không tìm thấy đề xuất.</p>
      ) : proposal.status !== 'PENDING' ? (
        /*
          The API refuses this too, so the form would only lead to a message
          after the typing. Reached by a stale tab or a bookmarked link far more
          often than by anything else, which is why it explains rather than
          bounces: somebody arriving here has just been answered.
        */
        <p className="max-w-2xl rounded-xl border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          Đề xuất này đã được trả lời nên không sửa được nữa. Mở lại danh sách
          để xem câu trả lời của giảng viên.
        </p>
      ) : (
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
          submitLabel="Lưu thay đổi"
          onSubmit={async (values) => {
            // Only the three the API will take back; sending the other two
            // would be asking it to refuse a change nobody made.
            await update.mutateAsync({
              id: proposal.id,
              title: values.title,
              description: values.description,
              expectedOutcomes: values.expectedOutcomes,
            });
            toast.success('Đề xuất đã được lưu.');
            router.push('/student/proposals');
          }}
          onCancel={() => router.push('/student/proposals')}
        />
      )}
    </div>
  );
}
