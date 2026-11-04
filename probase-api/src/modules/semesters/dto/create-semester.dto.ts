import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const CreateSemesterSchema = z
  .object({
    academicYear: z
      .string({ error: 'Vui lòng chọn năm học' })
      .min(1, 'Vui lòng chọn năm học'),
    term: z
      .string({ error: 'Vui lòng chọn học kỳ' })
      .min(1, 'Vui lòng chọn học kỳ'),
    name: z.string().max(100, 'Tên học kỳ tối đa 100 ký tự').optional(),
    code: z.string().optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    gradeSubmissionDeadline: z.coerce.date().optional().nullable(),
  })
  .refine(
    (data) =>
      !data.startDate || !data.endDate || data.endDate > data.startDate,
    {
      message: 'Ngày kết thúc phải sau ngày bắt đầu',
      path: ['endDate'],
    },
  )
  .refine(
    (data) =>
      !data.startDate ||
      !data.gradeSubmissionDeadline ||
      data.gradeSubmissionDeadline >= data.startDate,
    {
      message: 'Hạn nhập điểm phải sau hoặc bằng ngày bắt đầu',
      path: ['gradeSubmissionDeadline'],
    },
  );

export class CreateSemesterDto extends createZodDto(CreateSemesterSchema) {}
