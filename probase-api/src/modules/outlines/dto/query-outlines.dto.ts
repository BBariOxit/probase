import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const QueryOutlinesSchema = z.object({
  semesterId: z.coerce.number().int().positive().optional(),
  status: z.string().trim().optional(),
  search: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export class QueryOutlinesDto extends createZodDto(QueryOutlinesSchema) {}
