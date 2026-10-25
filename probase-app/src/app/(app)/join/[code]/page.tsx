'use client';

import { use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { GraduationCap, Layers, Loader2, Users } from 'lucide-react';
import { useJoinByCode, useJoinPreview } from '@/lib/api/registration';
import { useRequireRole } from '@/lib/auth/use-require-role';
import { Button } from '@/components/ui/button';
import { SeatDots } from '@/components/groups/seat-indicator';

export default function JoinByCodePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);
  const router = useRouter();
  const allowed = useRequireRole('STUDENT');
  const { data, isPending, error } = useJoinPreview(code);
  const join = useJoinByCode();

  if (!allowed) return null;

  if (isPending) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <h1 className="font-heading text-lg font-semibold tracking-tight">
          Link này không còn dùng được
        </h1>
        <p className="text-sm text-muted-foreground">
          Nhóm có thể đã giải tán, hoặc link bị sai. Hỏi lại bạn đã gửi cho bạn,
          hoặc tự chọn một đề tài khác.
        </p>
        <Button render={<Link href="/student" />}>Xem danh sách đề tài</Button>
      </Card>
    );
  }

  const { group, topic } = data;
  const leader = group.members.find((member) => member.isLeader);

  return (
    <Card>
      <header className="space-y-2">
        <p className="text-sm text-muted-foreground">
          {leader
            ? `${leader.fullName} mời bạn vào nhóm`
            : 'Bạn được mời vào nhóm'}
        </p>
        <h1 className="font-heading text-xl leading-tight font-semibold tracking-tight">
          {topic.title}
        </h1>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <GraduationCap className="size-3.5 shrink-0" />
            {topic.lecturer.academicTitle
              ? `${topic.lecturer.academicTitle} ${topic.lecturer.fullName}`
              : topic.lecturer.fullName}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Layers className="size-3.5 shrink-0" />
            {topic.projectType.name}
          </span>
        </div>
      </header>

      <div className="flex items-center gap-3 rounded-lg border px-3 py-2.5">
        <Users className="size-4 shrink-0 text-muted-foreground" />
        <p className="min-w-0 flex-1 truncate text-sm">
          {group.members.map((member) => member.fullName).join(', ')}
        </p>
        <SeatDots
          occupied={group.occupiedSeats}
          capacity={group.capacity}
          className="shrink-0"
        />
        <span className="shrink-0 text-sm text-muted-foreground">
          {group.occupiedSeats}/{group.capacity}
        </span>
      </div>

      {data.alreadyMember ? (
        <>
          <p className="text-sm text-muted-foreground">
            Bạn đã ở trong nhóm này rồi.
          </p>
          <Button className="w-full" render={<Link href="/student/groups" />}>
            Xem nhóm của tôi
          </Button>
        </>
      ) : data.canJoin ? (
        <div className="w-full space-y-3 pt-2">
          <Button
            className="w-full"
            onClick={() =>
              join.mutate(code, {
                onSuccess: () => router.push('/student/groups'),
              })
            }
            disabled={join.isPending}
          >
            {join.isPending && <Loader2 className="size-4 animate-spin" />}
            Tham gia nhóm
          </Button>
          {join.error && (
            <p className="text-sm text-destructive">{join.error.message}</p>
          )}
        </div>
      ) : (
        <div className="w-full space-y-3 pt-2">
          <p className="text-sm text-destructive">{data.blockedReason}</p>
          <Button
            className="w-full"
            variant="outline"
            render={<Link href="/student" />}
          >
            Xem danh sách đề tài
          </Button>
        </div>
      )}
    </Card>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center py-8 pb-32">
      <div className="mx-auto flex w-full max-w-sm flex-col items-stretch gap-5 rounded-xl border bg-card p-6 shadow-sm">
        {children}
      </div>
    </div>
  );
}
