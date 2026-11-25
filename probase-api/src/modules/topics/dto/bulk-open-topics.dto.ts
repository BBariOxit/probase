import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const BulkOpenTopicsSchema = z.object({
  semesterId: z.coerce.number().int().positive().optional(),
  topicIds: z.array(z.coerce.number().int().positive()).min(1).max(200).optional(),
});

export class BulkOpenTopicsDto extends createZodDto(BulkOpenTopicsSchema) {}
