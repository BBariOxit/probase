import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const SubmitProgressReportSchema = z.object({
  stage: z.enum(['STAGE_1', 'STAGE_2'], {
    message: 'Giai đoạn báo cáo phải là STAGE_1 hoặc STAGE_2.',
  }),
  sourceCodeUrl: z.string().trim().optional(),
  reportFileUrl: z.string().trim().optional(),
  reportFileName: z.string().trim().optional(),
});

export class SubmitProgressReportDto extends createZodDto(
  SubmitProgressReportSchema,
) {}
