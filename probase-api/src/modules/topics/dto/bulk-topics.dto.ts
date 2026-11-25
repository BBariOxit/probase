import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const BulkTopicIdsSchema = z.object({
  topicIds: z.array(z.coerce.number().int().positive()).min(1).max(200),
});

export class BulkTopicIdsDto extends createZodDto(BulkTopicIdsSchema) {}

export const BulkDepartmentReviewSchema = z
  .object({
    topicIds: z.array(z.coerce.number().int().positive()).min(1).max(200),
    action: z.enum(['APPROVE', 'REQUEST_REVISION', 'REJECT']),
    feedback: z.string().trim().max(2000).optional(),
  })
  .refine(
    (data) =>
      data.action === 'APPROVE' ||
      (typeof data.feedback === 'string' && data.feedback.length > 0),
    {
      message:
        'Vui lòng nhập lý do/nhận xét khi yêu cầu sửa hoặc từ chối đề tài',
      path: ['feedback'],
    },
  );

export class BulkDepartmentReviewDto extends createZodDto(
  BulkDepartmentReviewSchema,
) {}
