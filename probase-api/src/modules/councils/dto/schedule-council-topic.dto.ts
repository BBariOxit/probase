import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const ScheduleCouncilTopicSchema = z.object({
  groupId: z.coerce.number().int().positive('Mã nhóm không hợp lệ'),
  timeSlot: z.string().trim().optional().nullable(),
  defenseOrder: z.coerce.number().int().min(1).default(1),
});

export class ScheduleCouncilTopicDto extends createZodDto(
  ScheduleCouncilTopicSchema,
) {}
