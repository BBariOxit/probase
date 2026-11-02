import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { CouncilMemberRole } from '../../../../generated/prisma/client';

export const AddCouncilMemberSchema = z.object({
  lecturerId: z.coerce.number().int().positive('Mã giảng viên không hợp lệ'),
  councilRole: z.nativeEnum(CouncilMemberRole, {
    message: 'Vai trò trong hội đồng không hợp lệ (PRESIDENT, SECRETARY, MEMBER)',
  }),
});

export class AddCouncilMemberDto extends createZodDto(AddCouncilMemberSchema) {}
