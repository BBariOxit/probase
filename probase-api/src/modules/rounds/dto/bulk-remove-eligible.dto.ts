import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const BulkRemoveEligibleSchema = z.object({
  studentIds: z.array(z.coerce.number().int().positive()).min(1).max(200),
});

export class BulkRemoveEligibleDto extends createZodDto(
  BulkRemoveEligibleSchema,
) {}

