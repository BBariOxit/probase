import { NotificationType } from '../../../generated/prisma/client';

export interface RoundNotificationParams {
  semesterName: string;
  academicYear?: string;
  projectTypeName?: string;
  startDate?: string;
  endDate?: string;
}

export const NotificationTemplates = {
  /**
   * 1. Thông báo mở đợt đăng ký đồ án / đề tài
   */
  roundOpened(params: RoundNotificationParams) {
    const scope = params.projectTypeName ? ` (${params.projectTypeName})` : '';
    const yearSuffix = params.academicYear
      ? ` năm học ${params.academicYear}`
      : '';
    const deadlineNote = params.endDate
      ? ` Hạn đăng ký đến hết ngày ${params.endDate}.`
      : '';
    return {
      title: 'Mở đăng ký đề tài',
      content: `${params.semesterName}${yearSuffix} đã chính thức mở đăng ký đề tài${scope}.${deadlineNote}\n\nSinh viên đủ điều kiện vui lòng nhanh tay theo dõi danh sách đề tài và đăng ký trước thời hạn quy định của Khoa.`,
    };
  },

  /**
   * 2. Thông báo gia hạn đợt đăng ký đồ án
   */
  roundExtended(params: {
    semesterName: string;
    projectTypeName: string;
    endDateFormatted: string;
  }) {
    return {
      title: 'Gia hạn đăng ký đề tài',
      content: `Khoa đã gia hạn đợt đăng ký ${params.projectTypeName} (${params.semesterName}) tới hết ngày ${params.endDateFormatted}.\n\nSinh viên chưa có nhóm vui lòng nhanh chóng chọn đề tài trước hạn chót.`,
    };
  },

  /**
   * 3. Nhắc nhở sắp kết thúc đợt đăng ký
   */
  registrationClosingSoon(params: {
    projectTypeName: string;
    endDateFormatted: string;
  }) {
    return {
      title: 'Sắp hết hạn đăng ký',
      content: `Đợt đăng ký ${params.projectTypeName} sắp kết thúc vào ngày ${params.endDateFormatted}.\n\nCác bạn sinh viên chưa hoàn tất đăng ký hãy kiểm tra và hoàn thành sớm.`,
    };
  },
};

export function buildRoundOpenedNotices(
  roundId: number,
  userIds: number[],
  params: RoundNotificationParams,
) {
  if (userIds.length === 0) return [];
  const tpl = NotificationTemplates.roundOpened(params);
  return userIds.map((userId) => ({
    userId,
    type: NotificationType.DEADLINE_REMINDER,
    title: tpl.title,
    content: tpl.content,
    targetId: roundId,
    dedupeKey: `ROUND_OPENED:round=${roundId}:user=${userId}`,
  }));
}
