'use client';

import { use } from 'react';
import Link from 'next/link';
import { Loader2, Mail, Phone } from 'lucide-react';
import { useLecturer } from '@/lib/api/lecturers';
import { useActiveSemester } from '@/lib/api/master-data';
import { useTopics } from '@/lib/api/topics';
import { useSession } from '@/lib/auth/session';
import { topicHref } from '@/lib/nav';
import { SeatBadge } from '@/components/groups/seat-indicator';
import { UserAvatar } from '@/components/shared/user-avatar';

export default function LecturerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: lecturer, isPending, error } = useLecturer(Number(id));

  if (isPending) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !lecturer) {
    return (
      <p className="text-sm text-destructive">
        {error?.message ?? 'Không tìm thấy giảng viên.'}
      </p>
    );
  }

  const contactable = lecturer.email !== null || lecturer.phone !== null;

  return (
    <article className="mx-auto max-w-2xl space-y-6">
      <header className="flex items-center gap-4">
        <UserAvatar
          name={lecturer.fullName}
          src={lecturer.avatarUrl}
          className="size-16 text-lg"
        />
        <div className="min-w-0">
          <h1 className="font-heading text-2xl leading-tight font-semibold tracking-tight">
            {lecturer.academicTitle
              ? `${lecturer.academicTitle} ${lecturer.fullName}`
              : lecturer.fullName}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Giảng viên</p>
        </div>
      </header>

      {lecturer.researchInterests && (
        <Section title="Hướng nghiên cứu" body={lecturer.researchInterests} />
      )}
      {lecturer.bio && <Section title="Giới thiệu" body={lecturer.bio} />}

      {contactable ? (
        <section className="space-y-2">
          <h2 className="text-sm font-medium">Liên hệ</h2>
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
            {lecturer.email && (
              <a
                href={`mailto:${lecturer.email}`}
                className="inline-flex items-center gap-1.5 underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <Mail className="size-3.5 text-muted-foreground" />
                {lecturer.email}
              </a>
            )}
            {lecturer.phone && (
              <span className="inline-flex items-center gap-1.5">
                <Phone className="size-3.5 text-muted-foreground" />
                {lecturer.phone}
              </span>
            )}
          </div>
        </section>
      ) : (
        // Said plainly rather than left blank: a missing contact block reads as
        // a page that failed to load half of itself.
        <p className="text-sm text-muted-foreground">
          Thông tin liên hệ chỉ hiện với sinh viên đang được giảng viên này
          hướng dẫn.
        </p>
      )}

      <OpenTopics lecturerId={lecturer.id} />
    </article>
  );
}

function OpenTopics({ lecturerId }: { lecturerId: number }) {
  const role = useSession((state) => state.user?.role);
  const semester = useActiveSemester();
  const { data } = useTopics(
    {
      status: 'OPEN',
      semesterId: semester?.id,
      lecturerId,
      limit: 8,
    },
    { enabled: semester !== undefined },
  );

  const topics = data?.items ?? [];
  if (!role || topics.length === 0) return null;

  return (
    <section className="space-y-2">
      <h2 className="text-sm font-medium">Đề tài đang mở</h2>

      <ul className="divide-y rounded-lg border">
        {topics.map((topic) => (
          <li key={topic.id} className="flex items-center gap-3 px-3.5 py-3">
            <Link
              href={topicHref(role, topic.id)}
              className="min-w-0 flex-1 rounded-sm text-sm hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <span className="line-clamp-2">{topic.title}</span>
              <span className="mt-1 block text-xs text-muted-foreground">
                {topic.projectType.name} · tối đa {topic.maxStudents} SV
              </span>
            </Link>
            <SeatBadge topic={topic} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function Section({ title, body }: { title: string; body: string }) {
  return (
    <section className="space-y-1.5">
      <h2 className="text-sm font-medium">{title}</h2>
      <p className="text-sm leading-relaxed whitespace-pre-line break-words text-muted-foreground">
        {body}
      </p>
    </section>
  );
}
