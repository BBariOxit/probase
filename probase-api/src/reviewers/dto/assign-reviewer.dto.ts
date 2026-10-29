import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const AssignReviewerSchema = z.object({
  groupId: z.coerce.number().int().positive('Mã nhóm không hợp lệ'),
  reviewerId: z.coerce.number().int().positive('Vui lòng chọn Giảng viên phản biện'),
});

export class AssignReviewerDto extends createZodDto(AssignReviewerSchema) {}
