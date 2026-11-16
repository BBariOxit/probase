import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { SystemPermission } from '../permissions.constants';

export const UpdateRolePermissionsSchema = z.object({
  permissions: z.array(z.nativeEnum(SystemPermission)),
});

export class UpdateRolePermissionsDto extends createZodDto(
  UpdateRolePermissionsSchema,
) {}

