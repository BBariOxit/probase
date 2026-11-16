import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const UpdateLecturerRoleSchema = z.object({
  assignedRole: z.enum(['LECTURER', 'TTBM', 'GVCN', 'ADMIN']),
  majorId: z.number().int().positive().optional().nullable(),
});

export class UpdateLecturerRoleDto extends createZodDto(
  UpdateLecturerRoleSchema,
) {}

