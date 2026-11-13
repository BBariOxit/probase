import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const QueryArchivesSchema = z.object({
  semesterId: z.coerce.number().int().positive().optional(),
  projectTypeId: z.coerce.number().int().positive().optional(),
  majorId: z.coerce.number().int().positive().optional(),
  status: z.string().trim().optional(),
  verified: z
    .enum(['true', 'false', 'all'])
    .optional()
    .transform((val) => (val === 'true' ? true : val === 'false' ? false : undefined)),
  q: z.string().trim().min(1).max(255).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export class QueryArchivesDto extends createZodDto(QueryArchivesSchema) {}
