import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const FeedbackWeeklyLogSchema = z.object({
  lecturerComment: z.string().trim().max(3000).optional(),
  isAcknowledged: z.boolean().default(true),
});

export class FeedbackWeeklyLogDto extends createZodDto(
  FeedbackWeeklyLogSchema,
) {}
