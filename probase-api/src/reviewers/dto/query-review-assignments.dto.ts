import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const QueryReviewAssignmentsSchema = z.object({
  roundId: z.coerce.number().int().positive().optional(),
  majorId: z.coerce.number().int().positive().optional(),
  status: z.enum(['ALL', 'ASSIGNED', 'UNASSIGNED']).optional(),
  q: z.string().trim().optional(),
});

export class QueryReviewAssignmentsDto extends createZodDto(
  QueryReviewAssignmentsSchema,
) {}
