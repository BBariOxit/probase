import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const GoogleLoginSchema = z
  .object({
    idToken: z.string().optional(),
    credential: z.string().optional(),
    accessToken: z.string().optional(),
  })
  .refine((data) => !!(data.idToken || data.credential || data.accessToken), {
    message: 'Google idToken, credential hoặc accessToken là bắt buộc',
  });

export class GoogleLoginDto extends createZodDto(GoogleLoginSchema) {}
