import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { TopicStatus } from '../../../../generated/prisma/client';

export const ExportTopicsModeSchema = z.enum(['SIGN_OFF', 'FILTERED']);

export const ExportTopicsSchema = z.object({
  mode: ExportTopicsModeSchema.default('FILTERED'),
  semesterId: z.coerce.number().int().positive().optional(),
  projectTypeId: z.coerce.number().int().positive().optional(),
  lecturerId: z.coerce.number().int().positive().optional(),
  majorId: z.coerce.number().int().positive().optional(),
  status: z.enum(TopicStatus).optional(),
  q: z.string().trim().min(1).max(255).optional(),
  topicIds: z
    .preprocess(
      (value) =>
        typeof value === 'string'
          ? value
              .split(',')
              .map((v) => v.trim())
              .filter(Boolean)
          : value,
      z.array(z.coerce.number().int().positive()).max(500),
    )
    .optional(),
});

export type ExportTopicsMode = z.infer<typeof ExportTopicsModeSchema>;

export class ExportTopicsDto extends createZodDto(ExportTopicsSchema) {}
