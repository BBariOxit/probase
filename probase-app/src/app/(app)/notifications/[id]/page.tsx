'use client';

import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  ExternalLink,
  FileText,
  Inbox,
  Loader2,
  Users,
} from 'lucide-react';
import { useNotification } from '@/lib/api/notifications';
import { useSession } from '@/lib/auth/session';
import { isTopicDepartmentReviewNotification } from '@/lib/notifications';
import { Button } from '@/components/ui/button';

function getNotificationAction(
  notice: { type: string; targetId: number | null; title: string; content: string },
  role?: string,
) {
  const isLecturer = role === 'LECTURER';
  const isStudent = role === 'STUDENT';

  // 0. Kết quả thẩm định đề tài từ Tổ trưởng Bộ môn
  if (isTopicDepartmentReviewNotification(notice)) {
    return {
      label: 'Xem chi tiết đề tài',
      url: notice.targetId
        ? `/lecturer/topics/${notice.targetId}`
        : '/lecturer',
      icon: FileText,
    };
  }

  // 1. Đề xuất đề tài từ sinh viên
  if (
    notice.type === 'PROPOSAL_SUBMITTED' ||
    notice.type === 'PROPOSAL_RESUBMITTED' ||
    notice.type === 'PROPOSAL_COMMENTED' ||
    notice.title.toLowerCase().includes('đề xuất') ||
    notice.title.toLowerCase().includes('nhận xét')
  ) {
    if (isLecturer) {
      return {
        label: 'Xem chi tiết đề xuất đề tài',
        url: notice.targetId
          ? `/lecturer/proposals/${notice.targetId}`
          : '/lecturer/proposals',
        icon: FileText,
      };
    }
    return {
      label: 'Xem chi tiết đề xuất & nhận xét',
      url: notice.targetId
        ? `/student/proposals/${notice.targetId}`
        : '/student/proposals',
      icon: FileText,
    };
  }

  if (
    notice.type === 'PROPOSAL_ACCEPTED' ||
    notice.type === 'PROPOSAL_REVISION_REQUESTED' ||
    notice.type === 'PROPOSAL_REJECTED'
  ) {
    if (isStudent) {
      return {
        label: 'Xem chi tiết đề xuất đề tài',
        url: notice.targetId
          ? `/student/proposals/${notice.targetId}`
          : '/student/proposals',
        icon: FileText,
      };
    }
    return {
      label: 'Xem chi tiết đề xuất',
      url: notice.targetId
        ? `/lecturer/proposals/${notice.targetId}`
        : '/lecturer/proposals',
      icon: FileText,
    };
  }

  // 2. Đề cương M03
  if (
    notice.type === 'OUTLINE_SUBMITTED' ||
    notice.type === 'OUTLINE_APPROVED' ||
    notice.type === 'OUTLINE_REVISION_REQUESTED'
  ) {
    if (isLecturer) {
      return {
        label: 'Xem đề cương M03',
        url: notice.targetId
          ? `/lecturer/groups/${notice.targetId}`
          : '/lecturer/outlines',
        icon: FileText,
      };
    }
    return {
      label: 'Xem đề cương M03 của nhóm',
      url: '/student/groups',
      icon: FileText,
    };
  }

  // 3. Tiến độ & bài nộp
  if (
    notice.type === 'SUBMISSION_FEEDBACK' ||
    notice.type === 'PROGRESS_REPORT_GRADED' ||
    notice.type === 'SUBMISSION_DUE_SOON'
  ) {
    if (isLecturer) {
      return {
        label: 'Xem nhóm thực hiện',
        url: notice.targetId
          ? `/lecturer/groups/${notice.targetId}`
          : '/lecturer/groups',
        icon: FileText,
      };
    }
    return {
      label: 'Xem bài nộp và tiến độ',
      url: '/student/groups',
      icon: FileText,
    };
  }

  // 4. Nhóm đồ án
  if (
    notice.type === 'GROUP_MEMBER_JOINED' ||
    notice.type === 'GROUP_MEMBER_ASSIGNED' ||
    notice.type === 'TOPIC_STUDENT_ASSIGNED'
  ) {
    if (isLecturer) {
      return {
        label: 'Xem chi tiết nhóm',
        url: notice.targetId
          ? `/lecturer/groups/${notice.targetId}`
          : '/lecturer/groups',
        icon: Users,
      };
    }
    return {
      label: 'Xem nhóm đồ án của tôi',
      url: '/student/groups',
      icon: Users,
    };
  }

  // 5. Đợt đồ án
  if (
    notice.type === 'ROUND_EXTENDED' ||
    notice.type === 'REGISTRATION_CLOSING_SOON' ||
    notice.type === 'ROUND_FINALIZED'
  ) {
    return {
      label: 'Xem danh sách đề tài',
      url: isStudent ? '/student' : '/lecturer',
      icon: ExternalLink,
    };
  }

  return null;
}

export default function NotificationDetailPage() {
  const router = useRouter();
  const user = useSession((s) => s.user);
  const params = useParams<{ id: string }>();
  const notificationId = Number(params?.id);

  const { data: notice, isPending, error } = useNotification(notificationId);
  const action = notice ? getNotificationAction(notice, user?.role) : null;

  if (isPending) {
    return (
      <div className="mx-auto max-w-4xl space-y-4">
        <Button
          variant="default" size="sm" onClick={() => router.push('/notifications')} className="gap-2 cursor-pointer shadow-xs font-semibold"
        >
          <ArrowLeft className="size-4" /> Quay lại danh sách thông báo
        </Button>
        <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-xs">
          <Loader2 className="mx-auto size-7 animate-spin text-primary" />
          <p className="mt-3 text-sm text-muted-foreground font-medium">
            Đang tải chi tiết thông báo...
          </p>
        </div>
      </div>
    );
  }

  if (error || !notice) {
    return (
      <div className="mx-auto max-w-4xl space-y-4">
        <Button
          variant="default" size="sm" onClick={() => router.push('/notifications')} className="gap-2 cursor-pointer shadow-xs font-semibold"
        >
          <ArrowLeft className="size-4" /> Quay lại danh sách thông báo
        </Button>
        <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-xs space-y-3">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <Inbox className="size-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-neutral-100">
            Không tìm thấy thông báo
          </h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Thông báo này có thể đã bị xóa hoặc bạn không có quyền truy cập.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/notifications')}
            className="mt-2"
          >
            Quay lại hộp thư
          </Button>
        </div>
      </div>
    );
  }

  const formattedDate = new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'full',
    timeStyle: 'short',
  }).format(new Date(notice.createdAt));

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="default" size="sm" onClick={() => router.push('/notifications')} className="gap-2 cursor-pointer shadow-xs font-semibold"
        >
          <ArrowLeft className="size-4" />
          <span>Quay lại danh sách thông báo</span>
        </Button>
      </div>

      {/* Main Notification Card */}
      <article className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
        <div className="p-6 sm:p-8 space-y-3">
          {/* Thời gian ở góc trái */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="size-3.5" />
            <span>{formattedDate}</span>
          </div>

          {/* Tên thông báo to, đậm */}
          <h1 className="text-2xl sm:text-3xl font-bold font-heading text-slate-900 dark:text-neutral-50 tracking-tight leading-snug">
            {notice.title}
          </h1>

          {/* 1 cái gạch ngang */}
          <hr className="border-border my-4" />

          {/* Dưới gạch ngang là nội dung thông báo */}
          <div className="text-base leading-relaxed text-slate-800 dark:text-neutral-200 whitespace-pre-line font-normal py-2 selection:bg-primary/20 break-words [overflow-wrap:anywhere]">
            {notice.content}
          </div>

          {/* Nút hành động trực tiếp nếu thông báo có liên kết */}
          {action && (
            <div className="pt-3">
              <Button
                variant="default"
                size="default"
                onClick={() => router.push(action.url)}
                className="gap-2 cursor-pointer font-semibold shadow-xs"
              >
                <action.icon className="size-4" />
                <span>{action.label}</span>
                <ArrowRight className="size-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Footer gọn gàng */}
        <div className="bg-slate-50/70 dark:bg-neutral-900/50 px-6 py-3.5 border-t border-border text-xs text-muted-foreground">
          <span>Đây là thông báo tự động.</span>
        </div>
      </article>
    </div>
  );
}
