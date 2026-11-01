import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const SubmitTopicReviewSchema = z.object({
  groupId: z.coerce.number().int().positive('Mã nhóm không hợp lệ'),
  templateCode: z.enum(['M02', 'M04', 'M05']),
  evaluationCriteria: z.record(z.string(), z.any()).optional(),
  generalComment: z.string().min(1, 'Vui lòng nhập nhận xét chung cho đề tài.'),
  isDefenseAllowed: z.boolean(),
});

export class SubmitTopicReviewDto extends createZodDto(
  SubmitTopicReviewSchema,
) {}
