import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const PlaceStudentSchema = z.object({
  studentId: z.coerce.number('Vui lòng chọn sinh viên').int().positive(),
  topicId: z.coerce.number('Vui lòng chọn đề tài').int().positive(),
});

export class PlaceStudentDto extends createZodDto(PlaceStudentSchema) {}

export const BatchPlaceSchema = z.object({
  placements: z
    .array(PlaceStudentSchema)
    .min(1, 'Vui lòng chọn ít nhất 1 sinh viên để xếp')
    .max(200, 'Chỉ xếp tối đa 200 sinh viên mỗi lượt'),
});

export class BatchPlaceDto extends createZodDto(BatchPlaceSchema) {}

export const BatchUnplaceSchema = z.object({
  studentIds: z
    .array(z.coerce.number('Mã sinh viên không hợp lệ').int().positive())
    .min(1, 'Vui lòng chọn ít nhất 1 sinh viên để bỏ xếp')
    .max(200, 'Chỉ bỏ xếp tối đa 200 sinh viên mỗi lượt'),
});

export class BatchUnplaceDto extends createZodDto(BatchUnplaceSchema) {}

export const AutoAllocateStrategySchema = z
  .enum(['FILL_EXISTING', 'BALANCE_LECTURER'])
  .default('FILL_EXISTING');

export type AutoAllocateStrategy = z.infer<typeof AutoAllocateStrategySchema>;

export const AutoPreviewSchema = z.object({
  strategy: AutoAllocateStrategySchema,
  allowCrossMajor: z.coerce.boolean().default(false),
  studentIds: z
    .array(z.coerce.number().int().positive())
    .max(200)
    .optional(),
  topicIds: z.array(z.coerce.number().int().positive()).max(200).optional(),
});

export class AutoPreviewDto extends createZodDto(AutoPreviewSchema) {}

export const FinalizeRoundSchema = z
  .object({
    acknowledgeUnplaced: z.coerce.boolean().default(false),
    reason: z.string().trim().max(500).optional(),
  })
  .refine(
    (input) => !input.acknowledgeUnplaced || (input.reason?.length ?? 0) > 0,
    {
      path: ['reason'],
      message:
        'Vui lòng ghi lý do chốt đợt khi vẫn còn sinh viên chưa được xếp',
    },
  );

export class FinalizeRoundDto extends createZodDto(FinalizeRoundSchema) {}
