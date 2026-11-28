import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const BulkUserIdsSchema = z.object({
  userIds: z.array(z.coerce.number().int().positive()).min(1).max(200),
});

export class BulkUserIdsDto extends createZodDto(BulkUserIdsSchema) {}
