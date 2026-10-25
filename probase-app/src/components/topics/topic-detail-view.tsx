import Link from 'next/link';
import { GraduationCap, Layers, Users } from 'lucide-react';
import type { TopicDetail } from '@/lib/api/types';
import { TopicStatusBadge } from '@/components/topics/topic-status-badge';
import { TextSection } from '@/components/shared/text-section';

function Meta({
  icon: Icon,
  children,
}: {
  icon: typeof Users;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Icon className="size-3.5 shrink-0 text-muted-foreground/70" />
      {children}
    </span>
  );
}

export function TopicDetailView({
  topic,
  actions,
}: {
  topic: TopicDetail;
  actions?: React.ReactNode;
}) {
  return (
    <article className="max-w-2xl space-y-6">
      <header className="space-y-2.5">
        <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            {topic.title}
          </h1>
          <TopicStatusBadge status={topic.status} className="mt-1.5" />
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <Meta icon={GraduationCap}>
            <Link
              href={`/lecturers/${topic.lecturer.id}`}
              className="rounded-sm hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              {topic.lecturer.academicTitle
                ? `${topic.lecturer.academicTitle} ${topic.lecturer.fullName}`
                : topic.lecturer.fullName}
            </Link>
          </Meta>
          <Meta icon={Layers}>{topic.projectType.name}</Meta>
          <Meta icon={Users}>{topic.maxStudents} sinh viên</Meta>
        </div>
      </header>

      <div className="space-y-6 pt-2">
        <TextSection title="Mô tả" body={topic.description} titleAs="h2" />
        <TextSection
          title="Yêu cầu đầu ra"
          body={topic.expectedOutcomes}
          titleAs="h2"
        />
      </div>

      {actions && <div className="flex items-center gap-2 pt-1">{actions}</div>}
    </article>
  );
}
