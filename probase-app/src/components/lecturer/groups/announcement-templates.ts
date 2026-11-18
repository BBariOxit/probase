export interface AnnouncementTemplate {
  id: string;
  label: string;
  title: string;
  content: string;
}

export const ANNOUNCEMENT_TEMPLATES: AnnouncementTemplate[] = [
  {
    id: 'meeting',
    label: 'Lịch gặp hướng dẫn',
    title: 'Lịch gặp hướng dẫn đồ án tuần này',
    content: [
      'Nhóm sắp xếp thời gian gặp trao đổi tiến độ thực hiện đề tài:',
      '- Thời gian: ... giờ ..., thứ ..., ngày .../../2026',
      '- Hình thức / Địa điểm: Phòng ... (hoặc Google Meet: ...)',
      '- Nội dung chuẩn bị: Báo cáo phần đã làm và các vướng mắc cần giải đáp.',
      '',
      'Các thành viên có mặt đầy đủ và đúng giờ.',
    ].join('\n'),
  },
  {
    id: 'm03',
    label: 'Nhắc đề cương M03',
    title: 'Nhắc hoàn thiện và nộp Đề cương chi tiết (M03)',
    content: [
      'Nhóm khẩn trương hoàn thiện nội dung Đề cương chi tiết theo mẫu M03 và gửi lại để kiểm tra trước khi ký duyệt:',
      '- Hạn gửi bản kiểm tra: .../.../2026',
      '- Lưu ý: Kiểm tra kỹ mục tiêu, phạm vi thực hiện và phân công công việc giữa các thành viên.',
    ].join('\n'),
  },
  {
    id: 'progress',
    label: 'Nhắc tiến độ',
    title: 'Nhắc cập nhật tiến độ thực hiện đề tài',
    content: [
      'Nhóm tổng hợp lại các đầu việc đã hoàn thành trong tuần vừa qua và gửi báo cáo ngắn qua email hoặc mang theo trong buổi trao đổi sắp tới:',
      '- Phần đã hoàn thành:',
      '- Kế hoạch tuần tiếp theo:',
      '- Vướng mắc (nếu có):',
    ].join('\n'),
  },
  {
    id: 'custom',
    label: 'Tự soạn',
    title: '',
    content: '',
  },
];

