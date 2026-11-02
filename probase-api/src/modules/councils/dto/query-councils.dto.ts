import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const QueryCouncilsSchema = z.object({
  semesterId: z.coerce.number().int().positive().optional(),
  majorId: z.coerce.number().int().positive().optional(),
  search: z.string().trim().optional(),
  status: z.enum(['ALL', 'PREP', 'IN_PROGRESS', 'COMPLETED']).default('ALL'),
});

export class QueryCouncilsDto extends createZodDto(QueryCouncilsSchema) {}
