import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const UpdateWeeklyLogSchema = z.object({
  title: z.string().trim().max(255).optional(),
  completionPercentage: z.coerce.number().int().min(0).max(100).optional(),
  gitCommitUrl: z.string().trim().url().optional().or(z.literal('')),
  summaryNotes: z.string().trim().min(1).optional(),
  blockers: z.string().trim().optional(),
});

export class UpdateWeeklyLogDto extends createZodDto(UpdateWeeklyLogSchema) {}
