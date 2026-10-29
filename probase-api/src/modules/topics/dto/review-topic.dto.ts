import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const DepartmentReviewAction = {
  APPROVE: 'APPROVE',
  REQUEST_REVISION: 'REQUEST_REVISION',
  REJECT: 'REJECT',
} as const;

export const DepartmentReviewSchema = z
  .object({
    action: z.enum(['APPROVE', 'REQUEST_REVISION', 'REJECT']),
    feedback: z.string().trim().max(2000).optional(),
  })
  .refine(
    (data) =>
      data.action === 'APPROVE' ||
      (typeof data.feedback === 'string' && data.feedback.length > 0),
    {
      message:
        'Vui lòng nhập lý do/nhận xét khi yêu cầu sửa hoặc từ chối đề tài',
      path: ['feedback'],
    },
  );

export class DepartmentReviewDto extends createZodDto(DepartmentReviewSchema) {}

export const FacultyReviewAction = {
  APPROVE: 'APPROVE',
  REQUEST_REVISION: 'REQUEST_REVISION',
  REJECT: 'REJECT',
} as const;

export const FacultyReviewSchema = z
  .object({
    action: z.enum(['APPROVE', 'REQUEST_REVISION', 'REJECT']),
    feedback: z.string().trim().max(2000).optional(),
  })
  .refine(
    (data) =>
      data.action === 'APPROVE' ||
      (typeof data.feedback === 'string' && data.feedback.length > 0),
    {
      message:
        'Vui lòng nhập lý do/nhận xét khi yêu cầu sửa hoặc từ chối đề tài',
      path: ['feedback'],
    },
  );

export class FacultyReviewDto extends createZodDto(FacultyReviewSchema) {}
