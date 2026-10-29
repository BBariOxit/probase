import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const GradeProgressReportSchema = z.object({
  grade: z.coerce
    .number()
    .min(0, { message: 'Điểm tối thiểu là 0.' })
    .max(10, { message: 'Điểm tối đa là 10.' }),
  feedback: z.string().trim().max(3000).optional(),
  workloadPercentage: z.coerce.number().min(0).max(100).optional(),
  isPassed: z.boolean().optional(),
});

export class GradeProgressReportDto extends createZodDto(
  GradeProgressReportSchema,
) {}
