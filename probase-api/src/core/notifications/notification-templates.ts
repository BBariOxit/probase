export interface RoundNotificationParams {
  semesterName: string;
  academicYear: string;
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
    return {
      title: 'Thông báo về việc mở đợt đăng ký đồ án',
      content: `${params.semesterName} năm học ${params.academicYear} đã chính thức mở đợt đăng ký đề tài${scope}.\n\nSinh viên đủ điều kiện vui lòng nhanh tay theo dõi danh sách đề tài và đăng ký trước thời hạn quy định của Khoa.`,
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
      title: 'Thông báo về việc gia hạn đợt đăng ký đồ án',
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
      title: 'Nhắc nhở: Sắp kết thúc đợt đăng ký đề tài',
      content: `Đợt đăng ký ${params.projectTypeName} sắp kết thúc vào ngày ${params.endDateFormatted}.\n\nCác bạn sinh viên chưa hoàn tất đăng ký hãy kiểm tra và hoàn thành sớm.`,
    };
  },
};
