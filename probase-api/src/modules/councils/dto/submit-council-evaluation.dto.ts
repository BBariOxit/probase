import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const SubmitCouncilEvaluationSchema = z.object({
  score: z.coerce
    .number()
    .min(0, 'Điểm tối thiểu là 0')
    .max(10, 'Điểm tối đa là 10'),
  feedback: z.string().trim().optional().nullable(),
});

export class SubmitCouncilEvaluationDto extends createZodDto(
  SubmitCouncilEvaluationSchema,
) {}
