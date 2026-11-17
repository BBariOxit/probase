'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useActiveSemester } from '@/lib/api/master-data';
import { useMyProfile } from '@/lib/api/me';
import { useCreateTopic, useSubmitDraftTopics } from '@/lib/api/topics';
import { useRequireRole } from '@/lib/auth/use-require-role';
import { PageHeading } from '@/components/layout/page-heading';
import { AttachmentUploader } from '@/components/shared/attachment-uploader';
import { TopicForm } from '@/components/topics/topic-form';
import { Button } from '@/components/ui/button';

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
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex items-center justify-between">
        <Button
          variant="default"
          size="sm"
          render={<Link href="/lecturer" />}
          className="gap-2 cursor-pointer shadow-xs font-semibold"
        >
          <ArrowLeft className="size-4" />
          <span>Quay lại danh sách đề tài</span>
        </Button>
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#1e1e1e] p-6 sm:p-8 shadow-xs space-y-6">
        <PageHeading
          title="Tạo đề tài"
          description="Điền thông tin đề tài cho học kỳ hiện tại để gửi Bộ môn thẩm định hoặc lưu bản nháp."
        />
        <TopicForm
          defaultValues={{ semesterId: activeSemester.id }}
          semesterInfo={activeSemester}
          lockSemester
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
    </div>
  );
}
