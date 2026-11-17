import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const UpdateLecturerQuotaSchema = z.object({
  targetQuota: z.coerce.number().int().min(0).max(50).nullable().optional(),
  isExempt: z.boolean().optional(),
  exemptReason: z.string().trim().max(255).nullable().optional(),
});

export class UpdateLecturerQuotaDto extends createZodDto(
  UpdateLecturerQuotaSchema,
) {}

