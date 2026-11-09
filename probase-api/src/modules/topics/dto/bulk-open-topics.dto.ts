import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const BulkOpenTopicsSchema = z.object({
  semesterId: z.coerce.number().int().positive().optional(),
});

export class BulkOpenTopicsDto extends createZodDto(BulkOpenTopicsSchema) {}
