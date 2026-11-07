import { z } from 'zod';

export const ProposalSchema = z.object({
  projectTypeId: z.number('Vui lòng chọn loại đồ án').int().positive(),
  requestedLecturerId: z
    .number('Vui lòng chọn giảng viên bạn muốn gửi đề xuất')
    .int()
    .positive(),
  title: z
    .string()
    .trim()
    .min(1, 'Vui lòng nhập tên đề tài')
    .max(200, 'Tên đề tài tối đa 200 ký tự'),
  description: z
    .string()
    .trim()
    .min(1, 'Vui lòng mô tả đề tài bạn muốn làm')
    .max(3000, 'Mô tả tối đa 3000 ký tự'),
  expectedOutcomes: z
    .string()
    .trim()
    .min(1, 'Vui lòng nêu bạn định làm ra được gì')
    .max(3000, 'Yêu cầu đầu ra tối đa 3000 ký tự'),
  maxStudents: z.coerce
    .number()
    .int()
    .min(1, 'Tối thiểu 1 sinh viên')
    .max(10, 'Tối đa 10 sinh viên')
    .default(1),
});

export type ProposalFormValues = z.infer<typeof ProposalSchema>;
