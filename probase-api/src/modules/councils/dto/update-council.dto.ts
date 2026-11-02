import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const UpdateCouncilSchema = z.object({
  name: z.string().trim().min(3).optional(),
  majorId: z.coerce.number().int().positive().optional().nullable(),
  location: z.string().trim().min(1).optional(),
  defenseDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), {
      message: 'Ngày bảo vệ không hợp lệ',
    })
    .optional(),
  status: z.enum(['PREP', 'IN_PROGRESS', 'COMPLETED']).optional(),
});

export class UpdateCouncilDto extends createZodDto(UpdateCouncilSchema) {}
