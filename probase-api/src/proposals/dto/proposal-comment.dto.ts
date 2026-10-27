import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const CreateProposalCommentSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, 'Nội dung nhận xét không được để trống')
    .max(2000, 'Nội dung nhận xét tối đa 2000 ký tự'),
});

export class CreateProposalCommentDto extends createZodDto(
  CreateProposalCommentSchema,
) {}
