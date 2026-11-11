import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const NullableColIndex = z.number().int().min(1).max(200).nullable();

export const EligibleColumnMappingSchema = z.object({
  studentCodeCol: NullableColIndex,
  fullNameCol: NullableColIndex,
  surnameCol: NullableColIndex,
  givenNameCol: NullableColIndex,
  classCol: NullableColIndex,
  emailCol: NullableColIndex,
  noteCol: NullableColIndex,
});

export const EligibleImportMappingRequestSchema = z.object({
  sessionId: z.string().uuid('sessionId không hợp lệ'),
  headerRowIndex: z.number().int().min(0).max(50).default(1),
  nameMode: z.enum(['full', 'split']).default('full'),
  mapping: EligibleColumnMappingSchema,
});

export const ReanalyzeEligibleImportSchema = z.object({
  sessionId: z.string().uuid('sessionId không hợp lệ'),
  headerRowIndex: z.number().int().min(0).max(50),
});

export class EligibleImportMappingRequestDto extends createZodDto(
  EligibleImportMappingRequestSchema,
) {}

export class ReanalyzeEligibleImportDto extends createZodDto(
  ReanalyzeEligibleImportSchema,
) {}
