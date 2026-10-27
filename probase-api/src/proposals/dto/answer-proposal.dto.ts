import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const AcceptProposalSchema = z.object({
  // The same ceiling as a lecturer's own topic, so the two paths cannot produce
  // topics the rest of the system treats differently.
  maxStudents: z.coerce
    .number('Vui lòng nhập số sinh viên tối đa')
    .int()
    .min(1)
    .max(10),
});

export class AcceptProposalDto extends createZodDto(AcceptProposalSchema) {}

export const RejectProposalSchema = z.object({
  feedback: z
    .string('Vui lòng cho sinh viên biết vì sao đề xuất chưa được nhận')
    .trim()
    .min(1, 'Vui lòng cho sinh viên biết vì sao đề xuất chưa được nhận')
    .max(2000),
});

export class RejectProposalDto extends createZodDto(RejectProposalSchema) {}

export const RequestChangesProposalSchema = z.object({
  feedback: z
    .string('Vui lòng nhập nhận xét/yêu cầu chỉnh sửa cho sinh viên')
    .trim()
    .min(5, 'Nhận xét phải có ít nhất 5 ký tự')
    .max(2000, 'Nhận xét tối đa 2000 ký tự'),
});

export class RequestChangesProposalDto extends createZodDto(
  RequestChangesProposalSchema,
) {}
