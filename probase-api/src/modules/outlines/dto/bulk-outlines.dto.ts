import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const BulkOutlineGroupIdsSchema = z.object({
  groupIds: z
    .array(z.number().int().positive())
    .min(1, 'Chọn ít nhất một nhóm.')
    .max(50, 'Tối đa 50 nhóm mỗi lần thao tác.'),
});

export class BulkOutlineGroupIdsDto extends createZodDto(
  BulkOutlineGroupIdsSchema,
) {}

