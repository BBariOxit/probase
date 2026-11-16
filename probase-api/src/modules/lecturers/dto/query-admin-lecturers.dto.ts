import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const QueryAdminLecturersSchema = z.object({
  q: z.string().trim().optional(),
  role: z.enum(['ALL', 'LECTURER', 'TTBM', 'GVCN', 'ADMIN']).optional(),
  majorId: z.coerce.number().int().positive().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export class QueryAdminLecturersDto extends createZodDto(
  QueryAdminLecturersSchema,
) {}
