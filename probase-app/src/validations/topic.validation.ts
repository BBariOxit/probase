import { z } from 'zod';

export const TopicSchema = z.object({
  semesterId: z.number('Vui lòng chọn học kỳ').int().positive(),
  projectTypeId: z.number('Vui lòng chọn loại đồ án').int().positive(),
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
  expectedOutcomes: z
    .string()
    .trim()
    .min(1, 'Vui lòng nêu yêu cầu đầu ra')
    .max(3000, 'Yêu cầu đầu ra tối đa 3000 ký tự'),
  maxStudents: z
    .number({ message: 'Vui lòng nhập số sinh viên' })
    .int()
    .min(1, 'Ít nhất 1 sinh viên')
    .max(10, 'Nhiều nhất 10 sinh viên'),
});

export type TopicFormValues = z.infer<typeof TopicSchema>;
