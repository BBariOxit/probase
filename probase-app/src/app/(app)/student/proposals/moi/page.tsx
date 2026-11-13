'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  useActiveSemester,
  useMyEligibleProjectTypes,
} from '@/lib/api/master-data';
import {
  useCreateProposal,
  useProposals,
  useUploadProposalAttachment,
} from '@/lib/api/proposals';
import { useMyGroup } from '@/lib/api/registration';
import { useRequireRole } from '@/lib/auth/use-require-role';
import { AttachmentUploader } from '@/components/shared/attachment-uploader';
import { ProposalForm } from '@/components/proposals/proposal-form';
import { Button } from '@/components/ui/button';

export default function NewProposalPage() {
  const allowed = useRequireRole('STUDENT');
  const router = useRouter();
  const semester = useActiveSemester();
  const { data: projectTypes, isPending: projectTypesPending } =
    useMyEligibleProjectTypes(semester?.id);
  const { data: proposalsData, isPending: proposalsPending } = useProposals({
    page: 1,
    limit: 20,
  });
  const { data: group, isPending: groupPending } = useMyGroup();
  const create = useCreateProposal();
  const uploadAttachment = useUploadProposalAttachment();
  const [files, setFiles] = useState<File[]>([]);

  if (!allowed) return null;

  const isPending = projectTypesPending || proposalsPending || groupPending;
  const proposals = proposalsData?.items ?? [];
  const pending = proposals.find(
    (one) =>
      one.status === 'PENDING' ||
      one.status === 'NEEDS_REVISION' ||
      one.status === 'DRAFT',
  );
  const accepted = proposals.find((one) => one.status === 'ACCEPTED');

  const blockedReason = group
    ? 'Bạn đã có đề tài trong học kỳ này. Muốn đề xuất đề tài khác thì rời nhóm trước.'
    : accepted
      ? 'Bạn đã có đề tài đề xuất được duyệt trong học kỳ này.'
      : pending
        ? pending.status === 'DRAFT'
          ? 'Bạn đang có một bản nháp đề xuất. Hãy hoàn thiện và gửi hoặc xóa bản nháp trước khi tạo đề xuất mới.'
          : 'Bạn đang có một đề xuất đang chờ duyệt. Rút lại đề xuất đó nếu muốn gửi cái khác.'
        : null;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Button
        variant="ghost"
        size="sm"
        className="-ml-2 text-muted-foreground"
        render={<Link href="/student/proposals" />}
      >
        <ArrowLeft />
        Đề xuất của tôi
      </Button>

      {isPending || projectTypes === undefined ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : blockedReason ? (
        <p className="max-w-2xl rounded-xl border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          {blockedReason}
        </p>
      ) : projectTypes.length === 0 ? (
        // Not an error and not an empty list either: the faculty has opened no
        // round this intake belongs to, and no form on this page could fix it.
        <p className="max-w-2xl rounded-xl border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          Học kỳ này khoa chưa mở loại đồ án nào cho khóa của bạn, nên chưa gửi
          đề xuất được. Nếu bạn nghĩ đây là sai sót, liên hệ giáo vụ khoa.
        </p>
      ) : (
        <ProposalForm
          projectTypes={projectTypes}
          submitLabel="Gửi cho giảng viên"
          draftLabel="Lưu bản nháp"
          onSaveDraft={async (values) => {
            const created = await create.mutateAsync({ ...values, isDraft: true });
            if (files.length > 0) {
              for (const file of files) {
                try {
                  await uploadAttachment.mutateAsync({
                    id: created.id,
                    file,
                  });
                } catch {
                  toast.error(`Không thể tải lên tệp: ${file.name}`);
                }
              }
            }
            toast.success('Đã lưu bản nháp đề xuất.');
            router.push('/student/proposals');
          }}
          onSubmit={async (values) => {
            const created = await create.mutateAsync({ ...values, isDraft: false });
            if (files.length > 0) {
              for (const file of files) {
                try {
                  await uploadAttachment.mutateAsync({
                    id: created.id,
                    file,
                  });
                } catch {
                  toast.error(`Không thể tải lên tệp: ${file.name}`);
                }
              }
            }
            toast.success('Đề xuất đã được gửi cho giảng viên.');
            router.push('/student/proposals');
          }}
          onCancel={() => router.push('/student/proposals')}
        >
          <AttachmentUploader files={files} onChange={setFiles} />
        </ProposalForm>
      )}
    </div>
  );
}
