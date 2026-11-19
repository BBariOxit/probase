import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { SystemPermission } from '../../permissions/permissions.constants';

export const UpdateLecturerRoleSchema = z.object({
  assignedRole: z.enum(['LECTURER', 'TTBM', 'GVCN']),
  majorId: z.number().int().positive().optional().nullable(),
  customPermissions: z.array(z.nativeEnum(SystemPermission)).optional(),
});

export class UpdateLecturerRoleDto extends createZodDto(
  UpdateLecturerRoleSchema,
) {}
