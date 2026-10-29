import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const CreateWeeklyLogSchema = z.object({
  weekNumber: z.coerce.number().int().min(1).max(25),
  title: z.string().trim().max(255).optional(),
  completionPercentage: z.coerce.number().int().min(0).max(100),
  gitCommitUrl: z.string().trim().url().optional().or(z.literal('')),
  summaryNotes: z
    .string()
    .trim()
    .min(1, { message: 'Vui lòng nhập tóm tắt công việc đã thực hiện.' }),
  blockers: z.string().trim().optional(),
});

export class CreateWeeklyLogDto extends createZodDto(CreateWeeklyLogSchema) {}
