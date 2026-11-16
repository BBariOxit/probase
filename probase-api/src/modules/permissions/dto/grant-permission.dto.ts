import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { SystemPermission } from '../permissions.constants';

export const GrantPermissionSchema = z.object({
  userId: z.number().int().positive(),
  permission: z.nativeEnum(SystemPermission),
});

export class GrantPermissionDto extends createZodDto(GrantPermissionSchema) {}

