import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const CreateCouncilSchema = z.object({
  name: z.string().trim().min(3, 'Tên hội đồng tối thiểu 3 ký tự'),
  semesterId: z.coerce.number().int().positive('Học kỳ không hợp lệ'),
  majorId: z.coerce.number().int().positive().optional().nullable(),
  location: z.string().trim().min(1, 'Vui lòng nhập phòng / địa điểm bảo vệ'),
  defenseDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Ngày bảo vệ không hợp lệ',
  }),
});

export class CreateCouncilDto extends createZodDto(CreateCouncilSchema) {}
