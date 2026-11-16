import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { SystemPermission } from '../permissions.constants';

export const UpdateUserPermissionsSchema = z.object({
  permissions: z.array(z.nativeEnum(SystemPermission)),
});

export class UpdateUserPermissionsDto extends createZodDto(
  UpdateUserPermissionsSchema,
) {}

