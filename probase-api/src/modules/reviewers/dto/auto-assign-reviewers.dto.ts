import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const AutoAssignReviewersSchema = z.object({
  roundId: z.coerce.number().int().positive().optional(),
  majorId: z.coerce.number().int().positive().optional(),
  maxReviewsPerLecturer: z.coerce.number().int().min(1).max(20).optional(),
});

export class AutoAssignReviewersDto extends createZodDto(
  AutoAssignReviewersSchema,
) {}
