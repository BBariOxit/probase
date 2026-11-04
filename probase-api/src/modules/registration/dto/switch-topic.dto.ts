import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const SwitchTopicSchema = z.object({
  newTopicId: z.coerce.number().int().positive(),
});

export class SwitchTopicDto extends createZodDto(SwitchTopicSchema) {}
