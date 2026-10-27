'use client';

import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useActiveSemester } from '@/lib/api/master-data';
import { useCreateTopic } from '@/lib/api/topics';
import { useRequireRole } from '@/lib/auth/use-require-role';
import { PageHeading } from '@/components/layout/page-heading';
import { TopicForm } from '@/components/topics/topic-form';

export default function NewTopicPage() {
  const allowed = useRequireRole('LECTURER');
  const router = useRouter();
  const activeSemester = useActiveSemester();
  const create = useCreateTopic();

  if (!allowed) return null;

  // The form is held back until the default is known, rather than mounting
  // with an empty select that fills itself in a moment later.
  if (!activeSemester) return null;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHeading
        title="Tạo đề tài"
        description="Đề tài sẽ được lưu dưới dạng Bản nháp. Bạn có thể kiểm tra và bấm Gửi duyệt cho Tổ trưởng Bộ môn khi sẵn sàng."
      />
      <TopicForm
        defaultValues={{ semesterId: activeSemester.id }}
        submitLabel="Lưu đề tài"
        onSubmit={async (values) => {
          await create.mutateAsync(values);
          toast.success('Đã lưu đề tài vào danh sách bản nháp!');
        }}
        onCancel={() => router.push('/lecturer')}
      />
    </div>
  );
}
