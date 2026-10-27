import { z } from 'zod';

export const TopicSchema = z.object({
  semesterId: z.number({ message: 'Vui lòng chọn học kỳ' }).int().positive(),
  projectTypeId: z.number({ message: 'Vui lòng chọn loại đồ án' }).int().positive(),
  majorId: z.number().int().positive().optional(),
  title: z
    .string()
    .trim()
    .min(1, 'Vui lòng nhập tên đề tài')
    .max(200, 'Tên đề tài tối đa 200 ký tự'),
  description: z
    .string()
    .trim()
    .min(1, 'Vui lòng mô tả đề tài')
    .max(3000, 'Mô tả tối đa 3000 ký tự'),
  objectives: z.string().trim().max(3000).optional(),
  expectedOutcomes: z
    .string()
    .trim()
    .min(1, 'Vui lòng nêu yêu cầu đầu ra')
    .max(3000, 'Yêu cầu đầu ra tối đa 3000 ký tự'),
  techStack: z.string().trim().max(255).optional(),
  maxStudents: z
    .number({ message: 'Vui lòng nhập số sinh viên' })
    .int()
    .min(1, 'Ít nhất 1 sinh viên')
    .max(10, 'Nhiều nhất 10 sinh viên'),
});

export type TopicFormValues = z.infer<typeof TopicSchema>;

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
      message: 'Vui lòng nhập lý do/nhận xét khi yêu cầu sửa hoặc từ chối đề tài',
      path: ['feedback'],
    },
  );

export type DepartmentReviewFormValues = z.infer<typeof DepartmentReviewSchema>;

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
      message: 'Vui lòng nhập nhận xét/lý do khi yêu cầu xem xét lại hoặc từ chối đề tài',
      path: ['feedback'],
    },
  );

export type FacultyReviewFormValues = z.infer<typeof FacultyReviewSchema>;
