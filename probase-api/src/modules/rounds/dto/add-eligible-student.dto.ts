import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { checkClassCode } from '../../users/class-code.util';
import { cohortFromStudentCode } from '../../users/student-code.util';

const trimmed = (max: number) =>
  z
    .string()
    .max(max)
    .transform((val) => val.trim());

const requiredTrimmed = (max: number, message: string) =>
  trimmed(max).pipe(z.string().min(1, message));

export const AddEligibleStudentSchema = z
  .object({
    studentCode: trimmed(50).pipe(
      z
        .string()
        .regex(
          /^\d{7}$/,
          'Mã sinh viên phải gồm đúng 7 chữ số (ví dụ: 2212345)',
        ),
    ),
    fullName: requiredTrimmed(150, 'Vui lòng nhập họ và tên'),
    class: trimmed(50).optional().nullable(),
    email: z
      .string()
      .email('Email không hợp lệ')
      .max(255)
      .transform((val) => val.trim().toLowerCase())
      .optional()
      .nullable(),
    majorId: z.number().int().positive().optional().nullable(),
    note: trimmed(500).optional().nullable(),
  })
  .refine(
    (input) => {
      if (!input.class) return true;
      return (
        checkClassCode(input.class, input.studentCode).status !==
        'contradiction'
      );
    },
    {
      path: ['class'],
      message:
        'Mã lớp và mã sinh viên không khớp năm khóa — sửa lại giá trị nào bị sai',
    },
  )
  .transform((input) => {
    const studentCode = input.studentCode;
    const email = input.email || `${studentCode}@dlu.edu.vn`;
    const cohort = cohortFromStudentCode(studentCode)!;
    return {
      ...input,
      email,
      cohort,
    };
  });

export class AddEligibleStudentDto extends createZodDto(
  AddEligibleStudentSchema,
) {}
