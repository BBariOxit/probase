import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export enum OutlineReviewAction {
  APPROVE = 'APPROVE',
  REQUEST_REVISION = 'REQUEST_REVISION',
}

export const ReviewOutlineSchema = z.object({
  action: z.enum(['APPROVE', 'REQUEST_REVISION']),
  feedback: z.string().trim().max(2000).optional(),
});

export class ReviewOutlineDto extends createZodDto(ReviewOutlineSchema) {}
