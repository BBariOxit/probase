'use client';

import { use } from 'react';
import { Loader2 } from 'lucide-react';
import { useTopic } from '@/lib/api/topics';
import { useRequireRole } from '@/lib/auth/use-require-role';
import { useBreadcrumbLabel } from '@/lib/breadcrumb-context';
import { TopicDetailView } from '@/components/topics/topic-detail-view';
import { TopicRegisterButton } from '@/components/topics/topic-register-button';

const dateFormat = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

export default function StudentTopicDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const allowed = useRequireRole('STUDENT');
  const { data: topic, isPending, error } = useTopic(Number(id));

  // Swap the raw ID in the breadcrumb for the topic title once it loads.
  useBreadcrumbLabel(id, topic?.title);

  if (!allowed) return null;

  if (isPending) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !topic) {
    return <p className="text-sm text-destructive">Không tìm thấy đề tài.</p>;
  }

  return (
    <div className="space-y-5">
      <TopicDetailView
        topic={topic}
        actions={
          <div className="space-y-2">
            {/*
              Above the button rather than below it. This is the reader who
              proposed the topic, and until they press register it is held for
              them only while the gate is open — which is the one thing they
              cannot see from anywhere else on the page.
            */}
            {topic.proposedByMe === true && topic.canRegister && (
              <p className="text-xs text-status-success">
                Đề tài này là từ đề xuất của bạn và đang được giữ cho bạn. Hãy
                đăng ký trước khi đợt đăng ký đóng.
              </p>
            )}

            <TopicRegisterButton topic={topic} />

            {/*
              Three different silences, and each calls for different words. The
              window not being open is about the calendar; a topic already taken
              is about somebody else being quicker; a full one is neither. Only
              the first is worth spelling out with dates — the badge on the list
              already said the other two.
            */}
            {!topic.isRegistrationOpen ? (
              <p className="text-xs text-muted-foreground">
                Ngoài thời hạn đăng ký ({' '}
                {dateFormat.format(new Date(topic.round.registrationStart))}
                {' – '}
                {dateFormat.format(new Date(topic.round.registrationEnd))} ).
              </p>
            ) : (
              !topic.canRegister &&
              !topic.canJoin && (
                <p className="text-xs text-muted-foreground">
                  {/*
                    Already having a group comes first, and not by accident:
                    whether this particular topic is full or taken is beside the
                    point for a reader who cannot take any topic at all.
                  */}
                  {/*
                    Their own group comes first. Every line below describes a
                    door closed by somebody else, and the reader standing behind
                    this particular one is the person who opened it.
                  */}
                  {topic.isMyGroup
                    ? 'Đây là đề tài nhóm bạn đang làm.'
                    : topic.alreadyInAGroup
                      ? 'Bạn đã có nhóm trong học kỳ này. Mỗi học kỳ chỉ tham gia được một nhóm.'
                      : topic.isFull
                        ? `Đề tài này đã đủ ${topic.occupiedSeats}/${topic.maxStudents} sinh viên.`
                        : topic.activeGroup
                          ? 'Đề tài này đã có nhóm nhận.'
                          : /*
                            Said before the cohort line because both can be true
                            and only one of them can change. A cohort may be
                            opened for a project type next week; a topic somebody
                            else proposed stays theirs until the gate shuts.
                          */
                            topic.proposedByMe === false
                            ? 'Đề tài này do một sinh viên khác đề xuất, nên chỉ bạn ấy đăng ký được.'
                            : topic.eligibleForMe === false
                              ? `${topic.projectType.name} không mở cho khóa của bạn trong học kỳ này.`
                              : 'Đề tài này chưa mở đăng ký.'}
                </p>
              )
            )}
          </div>
        }
      />
    </div>
  );
}
