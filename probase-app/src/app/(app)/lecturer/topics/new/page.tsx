'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useActiveSemester } from '@/lib/api/master-data';
import { useMyProfile } from '@/lib/api/me';
import { useCreateTopic, useSubmitDraftTopics } from '@/lib/api/topics';
import { useRequireRole } from '@/lib/auth/use-require-role';
import { PageHeading } from '@/components/layout/page-heading';
import { AttachmentUploader } from '@/components/shared/attachment-uploader';
import { TopicForm } from '@/components/topics/topic-form';

export default function NewTopicPage() {
  const allowed = useRequireRole('LECTURER');
  const router = useRouter();
  const activeSemester = useActiveSemester();
  const { data: profile } = useMyProfile({ enabled: allowed });
  const create = useCreateTopic();
  const submitDrafts = useSubmitDraftTopics();
  const [files, setFiles] = useState<File[]>([]);

  if (!allowed) return null;

  // The form is held back until the default is known, rather than mounting
  // with an empty select that fills itself in a moment later.
  if (!activeSemester) return null;

  const isHeadOfDepartment = profile?.lecturer?.isHeadOfDepartment ?? false;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHeading title="Tạo đề tài" />
      <TopicForm
        defaultValues={{ semesterId: activeSemester.id }}
        submitLabel={
          isHeadOfDepartment ? 'Lưu & duyệt đề tài' : 'Gửi duyệt Bộ môn'
        }
        draftLabel="Lưu bản nháp"
        onSaveDraft={async (values) => {
          await create.mutateAsync(values);
          toast.success('Đã lưu bản nháp đề tài thành công!');
          router.push('/lecturer');
        }}
        onSubmit={async (values) => {
          const created = await create.mutateAsync(values);
          try {
            const res = await submitDrafts.mutateAsync([created.id]);
            toast.success(res.message);
          } catch {
            toast.success('Đã lưu đề tài dưới dạng bản nháp!');
          }
          router.push('/lecturer');
        }}
        onCancel={() => router.push('/lecturer')}
      >
        <AttachmentUploader files={files} onChange={setFiles} />
      </TopicForm>
    </div>
  );
}
