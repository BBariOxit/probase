import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const CloneTopicSchema = z.object({
  title: z.string().trim().min(1).max(255).optional(),
  projectTypeId: z.coerce.number().int().positive().optional(),
  semesterId: z.coerce.number().int().positive().optional(),
  majorId: z.coerce.number().int().positive().nullable().optional(),
  maxStudents: z.coerce.number().int().min(1).max(10).optional(),
});

export class CloneTopicDto extends createZodDto(CloneTopicSchema) {}

