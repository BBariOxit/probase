import type { AppNotification, Role } from '@/lib/api/types';

const TOPIC_DEPARTMENT_REVIEW_TITLES = new Set([
  'Đề tài đã được Bộ môn phê duyệt',
  'Yêu cầu chỉnh sửa đề tài',
  'Đề tài bị từ chối',
  'Bộ môn hủy duyệt đề tài và yêu cầu chỉnh sửa',
  'Đề tài đã cập nhật sau khi duyệt',
]);

export function isTopicDepartmentReviewNotification(notice: {
  type: string;
  title?: string;
}): boolean {
  return (
    notice.type === 'SUBMISSION_FEEDBACK' &&
    Boolean(notice.title && TOPIC_DEPARTMENT_REVIEW_TITLES.has(notice.title))
  );
}

export function formatNotificationContent(notice: {
  type: string;
  title?: string;
  content: string;
}): string {
  if (!isTopicDepartmentReviewNotification(notice)) {
    return notice.content;
  }

  return notice.content.replace(/\.\s+(?:Lý do|Nhận xét):\s*/, '.\n\nNội dung: ');
}

export function notificationHref(
  notice: AppNotification,
  role: Role,
): string | null {
  if (role === 'LECTURER' || role === 'GVCN') {
    switch (notice.type) {
      // Carries the proposal's id, which the inbox screen does not need: what
      // they are opening it for is the queue, and the one they were told about
      // is at the top of it — pending first is the order the API returns.
      case 'PROPOSAL_SUBMITTED':
      case 'PROPOSAL_RESUBMITTED':
      case 'PROPOSAL_COMMENTED':
        return notice.targetId
          ? `/lecturer/proposals/${notice.targetId}`
          : '/lecturer/proposals';

      // The office put somebody on their topic. `targetId` is that topic, and
      // it is where the new roster is.
      // Somebody handed something in on one of their topics, or they are being
      // reminded of it. The queue is what they open it for.
      case 'OUTLINE_SUBMITTED':
        return '/lecturer/outlines';

      case 'SUBMISSION_FEEDBACK':
        if (isTopicDepartmentReviewNotification(notice)) {
          return notice.targetId
            ? `/lecturer/topics/${notice.targetId}`
            : '/lecturer';
        }
        return '/lecturer/groups';

      case 'PROGRESS_LOG_SUBMITTED':
      case 'PROGRESS_REPORT_SUBMITTED':
        return notice.targetId
          ? `/lecturer/groups/${notice.targetId}`
          : '/lecturer/groups';

      case 'TOPIC_STUDENT_ASSIGNED':
        return notice.targetId
          ? `/lecturer/topics/${notice.targetId}`
          : '/lecturer';

      case 'DEADLINE_REMINDER':
        return notice.targetId && notice.title === 'Đề tài đã được mở đăng ký'
          ? `/lecturer/topics/${notice.targetId}`
          : '/lecturer';

      default:
        return null;
    }
  }

  if (role !== 'STUDENT') return null;

  switch (notice.type) {
    case 'STUDENT_ELIGIBILITY_CONFIRMED':
      return '/student';

    case 'OUTLINE_APPROVED':
    case 'OUTLINE_REVISION_REQUESTED':
    case 'PROGRESS_LOG_FEEDBACK':
    case 'PROGRESS_REPORT_GRADED':
      return '/student/groups';

    // Proposal notifications (accepted, rejected, revision requested, commented)
    // all carry the proposal's id so the student lands on the proposal detail
    // page (and can see the lecturer's feedback or next stage).
    case 'PROPOSAL_ACCEPTED':
    case 'PROPOSAL_REJECTED':
    case 'PROPOSAL_REVISION_REQUESTED':
    case 'PROPOSAL_COMMENTED':
      return notice.targetId
        ? `/student/proposals/${notice.targetId}`
        : '/student/proposals';

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

    // The group is gone in both of these, so the student needs to find another
    // topic to register.
    case 'GROUP_MEMBER_REMOVED':
    case 'GROUP_DISBANDED':
      return '/student';

    /*
      Both say there is still time to choose, so both lead to the list of
      topics rather than to the round they name. The round is the subject of the
      sentence; the list is the thing to do about it.
    */
    case 'ROUND_EXTENDED':
    case 'REGISTRATION_CLOSING_SOON':
    case 'DEADLINE_REMINDER':
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

export function notificationCategory(
  type: string,
  title?: string,
): {
  label: string;
  color: string;
} {
  const neutral =
    'bg-slate-100 text-slate-600 dark:bg-neutral-800 dark:text-neutral-400 border-slate-200/80 dark:border-neutral-700/80';

  if (isTopicDepartmentReviewNotification({ type, title })) {
    return { label: 'Thẩm định đề tài', color: neutral };
  }

  switch (type) {
    case 'PROPOSAL_SUBMITTED':
    case 'PROPOSAL_REVISION_REQUESTED':
    case 'PROPOSAL_RESUBMITTED':
    case 'PROPOSAL_ACCEPTED':
    case 'PROPOSAL_REJECTED':
    case 'PROPOSAL_COMMENTED':
      return { label: 'Đề xuất đề tài', color: neutral };
    case 'GROUP_MEMBER_JOINED':
    case 'GROUP_MEMBER_REMOVED':
    case 'GROUP_DISBANDED':
    case 'GROUP_MEMBER_ASSIGNED':
      return { label: 'Nhóm sinh viên', color: neutral };
    case 'ROUND_EXTENDED':
    case 'REGISTRATION_CLOSING_SOON':
    case 'ROUND_FINALIZED':
      return { label: 'Đợt đăng ký', color: neutral };
    case 'DEADLINE_REMINDER':
      return {
        label:
          title === 'Mở đăng ký đề tài' || title === 'Đề tài đã được mở đăng ký'
            ? 'Đợt đăng ký'
            : 'Báo cáo & Nhắc nhở',
        color: neutral,
      };
    case 'SUBMISSION_FEEDBACK':
    case 'SUBMISSION_DUE_SOON':
      return { label: 'Báo cáo & Nhắc nhở', color: neutral };
    case 'OUTLINE_SUBMITTED':
    case 'OUTLINE_REVISION_REQUESTED':
    case 'OUTLINE_APPROVED':
      return { label: 'Đề cương M03', color: neutral };
    case 'GRADE_PUBLISHED':
      return { label: 'Điểm số', color: neutral };
    case 'TOPIC_STUDENT_ASSIGNED':
      return { label: 'Phân công đề tài', color: neutral };
    default:
      return { label: 'Thông báo', color: neutral };
  }
}