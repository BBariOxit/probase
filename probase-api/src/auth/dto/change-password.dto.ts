import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { passwordSchema } from '../../common/password.schema';

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().optional(),
  newPassword: passwordSchema,
});

export class ChangePasswordDto extends createZodDto(ChangePasswordSchema) {}
