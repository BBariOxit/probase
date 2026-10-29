import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const QueryLecturerProgressSchema = z.object({
  semesterId: z.coerce.number().int().optional(),
  roundId: z.coerce.number().int().optional(),
});

export class QueryLecturerProgressDto extends createZodDto(
  QueryLecturerProgressSchema,
) {}
