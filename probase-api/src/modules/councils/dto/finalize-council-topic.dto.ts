import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const FinalizeCouncilTopicSchema = z.object({
  minuteNotes: z.string().trim().optional().nullable(),
  isLocked: z.boolean().default(true),
});

export class FinalizeCouncilTopicDto extends createZodDto(
  FinalizeCouncilTopicSchema,
) {}
