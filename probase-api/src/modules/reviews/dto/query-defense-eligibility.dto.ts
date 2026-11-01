import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const QueryDefenseEligibilitySchema = z.object({
  roundId: z.coerce.number().int().positive().optional(),
  semesterId: z.coerce.number().int().positive().optional(),
  majorId: z.coerce.number().int().positive().optional(),
  search: z.string().trim().optional(),
  status: z.enum(['ALL', 'ELIGIBLE', 'NOT_ELIGIBLE', 'PENDING']).default('ALL'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export class QueryDefenseEligibilityDto extends createZodDto(
  QueryDefenseEligibilitySchema,
) {}
