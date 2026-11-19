import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const InviteMemberSchema = z.object({
  studentCode: z
    .string()
    .trim()
    .min(1, 'Vui lòng nhập mã số sinh viên')
    .max(50),
});

export class InviteMemberDto extends createZodDto(InviteMemberSchema) {}
