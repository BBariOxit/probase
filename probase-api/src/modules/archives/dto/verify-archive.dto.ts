import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const VerifyArchiveSchema = z.object({
  isVerified: z.boolean(),
});

export class VerifyArchiveDto extends createZodDto(VerifyArchiveSchema) {}
