import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const SubmitTopicsSchema = z.object({
  topicIds: z.array(z.coerce.number().int().positive()).optional(),
});

export class SubmitTopicsDto extends createZodDto(SubmitTopicsSchema) {}
