import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const QueryEligibleStudentsSchema = z.object({
  class: z.string().trim().min(1).max(100).optional(),
  hasGroup: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => (value === undefined ? undefined : value === 'true')),
  q: z.string().trim().min(1).max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export class QueryEligibleStudentsDto extends createZodDto(
  QueryEligibleStudentsSchema,
) {}
