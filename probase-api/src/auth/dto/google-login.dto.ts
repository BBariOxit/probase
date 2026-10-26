import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const GoogleLoginSchema = z
  .object({
    idToken: z.string().optional(),
    credential: z.string().optional(),
  })
  .refine((data) => !!(data.idToken || data.credential), {
    message: 'Google idToken hoặc credential là bắt buộc',
  });

export class GoogleLoginDto extends createZodDto(GoogleLoginSchema) {}
