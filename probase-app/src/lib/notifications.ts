import type { AppNotification, Role } from '@/lib/api/types';

export function notificationHref(
  notice: AppNotification,
  role: Role,
): string | null {
  if (role === 'LECTURER') {
    switch (notice.type) {
      // Carries the proposal's id, which the inbox screen does not need: what
      // they are opening it for is the queue, and the one they were told about
      // is at the top of it — pending first is the order the API returns.
      case 'PROPOSAL_SUBMITTED':
        return '/lecturer/proposals';

      // The office put somebody on their topic. `targetId` is that topic, and
      // it is where the new roster is.
      // Somebody handed something in on one of their topics, or they are being
      // reminded of it. The queue is what they open it for.
      case 'SUBMISSION_FEEDBACK':
        return '/lecturer/reports';

      case 'TOPIC_STUDENT_ASSIGNED':
        return notice.targetId
          ? `/lecturer/topics/${notice.targetId}`
          : '/lecturer';

      default:
        return null;
    }
  }

  if (role !== 'STUDENT') return null;

  switch (notice.type) {
    /*
      Both land on the outbox rather than on the thing they name, and for
      different reasons that happen to agree.

      A rejection's `targetId` is the proposal, and the proposal screen is where
      the lecturer's reason is — there is nowhere better to go. An acceptance's
      `targetId` is the *topic* that was just written, and that topic is PENDING
      until the faculty office signs it off: `/student/topics/:id` answers 404 for
      a student until then, so following it would take the good news to an error
      page. The outbox names the topic and says which of the two it is waiting on.
    */
    case 'PROPOSAL_ACCEPTED':
    case 'PROPOSAL_REJECTED':
      return '/student/proposals';

    case 'GROUP_MEMBER_JOINED':
    // The office placed the reader, or placed somebody beside them. Either way
    // the group screen is what changed, and `targetId` is that group.
    case 'GROUP_MEMBER_ASSIGNED':
      return '/student/groups';

    /*
      The group screen again, and for the reader who ended up with nothing as
      much as for the one who did. Its empty state is written for exactly this
      moment — a settled round with no group reads "học kỳ này bạn không được
      phân đề tài, liên hệ giáo vụ khoa nếu đây là sai sót" — so both halves of
      the audience land somewhere that answers them.
    */
    case 'ROUND_FINALIZED':
      return '/student/groups';

    /*
      The supervisor answered a version of something the group handed in.
      `targetId` is the group, which the submissions screen is already scoped to —
      it shows that group's whole history, newest first, so the version just
      answered is at the top of it.
    */
    case 'SUBMISSION_FEEDBACK':
    // Same screen for the reminder: what it asks for is a submission, and the
    // deadline it names is at the top of that page.
    case 'SUBMISSION_DUE_SOON':
      return '/student/submissions';

    // The group is gone in both of these, so the topic is what is left to look
    // at — and `targetId` is the topic for exactly that reason.
    case 'GROUP_MEMBER_REMOVED':
    case 'GROUP_DISBANDED':
      return notice.targetId
        ? `/student/topics/${notice.targetId}`
        : '/student';

    /*
      Both say there is still time to choose, so both lead to the list of
      topics rather than to the round they name. The round is the subject of the
      sentence; the list is the thing to do about it.
    */
    case 'ROUND_EXTENDED':
    case 'REGISTRATION_CLOSING_SOON':
      return '/student';

    default:
      return null;
  }
}

const RELATIVE = new Intl.RelativeTimeFormat('vi-VN', { numeric: 'auto' });

const STEPS: {
  limit: number;
  divisor: number;
  unit: Intl.RelativeTimeFormatUnit;
}[] = [
  { limit: 60, divisor: 1, unit: 'second' },
  { limit: 3600, divisor: 60, unit: 'minute' },
  { limit: 86_400, divisor: 3600, unit: 'hour' },
  { limit: 604_800, divisor: 86_400, unit: 'day' },
];

export function timeAgo(iso: string): string {
  const seconds = (Date.now() - new Date(iso).getTime()) / 1000;

  if (seconds < 45) return 'vừa xong';

  for (const step of STEPS) {
    if (seconds < step.limit) {
      return RELATIVE.format(-Math.round(seconds / step.divisor), step.unit);
    }
  }

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(iso));
}
