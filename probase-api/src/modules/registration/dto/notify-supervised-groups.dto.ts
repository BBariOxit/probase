import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const NotifySupervisedGroupsSchema = z
  .object({
    groupIds: z
      .array(z.coerce.number().int().positive())
      .min(1, 'Vui lòng chọn ít nhất một nhóm hướng dẫn.')
      .max(50, 'Chỉ có thể gửi tối đa 50 nhóm mỗi lần.'),
    title: z
      .string()
      .trim()
      .min(3, 'Tiêu đề cần tối thiểu 3 ký tự.')
      .max(150, 'Tiêu đề tối đa 150 ký tự.'),
    content: z
      .string()
      .trim()
      .min(5, 'Nội dung cần tối thiểu 5 ký tự.')
      .max(3000, 'Nội dung tối đa 3000 ký tự.'),
    sendNotification: z.boolean().default(true),
    sendEmail: z.boolean().default(true),
  })
  .refine((data) => data.sendNotification || data.sendEmail, {
    message: 'Vui lòng chọn ít nhất một kênh gửi (Thông báo hoặc Email).',
    path: ['sendNotification'],
  });

export class NotifySupervisedGroupsDto extends createZodDto(
  NotifySupervisedGroupsSchema,
) {}

