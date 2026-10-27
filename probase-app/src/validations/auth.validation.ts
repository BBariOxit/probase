import { z } from 'zod';
import { COMMON_PASSWORDS } from '@/constants/auth.constant';

export const passwordSchema = z
  .string()
  .min(8, 'Mật khẩu cần ít nhất 8 ký tự')
  .max(128, 'Mật khẩu tối đa 128 ký tự')
  .refine((value) => !COMMON_PASSWORDS.has(value.toLowerCase()), {
    message: 'Mật khẩu này quá phổ biến, hãy chọn mật khẩu khác',
  })
  .refine((value) => !/^(.)\1+$/.test(value), {
    message: 'Mật khẩu không thể chỉ gồm một ký tự lặp lại',
  });

export const LoginSchema = z.object({
  email: z
    .string()
    .min(1, 'Vui lòng nhập email')
    .pipe(z.email('Email không hợp lệ')),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
});

export type LoginValues = z.infer<typeof LoginSchema>;

export const ForgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'Vui lòng nhập email')
    .pipe(z.email('Email không hợp lệ')),
});

export type ForgotPasswordValues = z.infer<typeof ForgotPasswordSchema>;

export const ResetPasswordSchema = z
  .object({
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, 'Vui lòng nhập lại mật khẩu mới'),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: 'Mật khẩu nhập lại không khớp',
    path: ['confirmPassword'],
  });

export type ResetPasswordValues = z.infer<typeof ResetPasswordSchema>;

export const ChangePasswordSchema = z
  .object({
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, 'Vui lòng nhập lại mật khẩu mới'),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: 'Mật khẩu nhập lại không khớp',
    path: ['confirmPassword'],
  });

export type ChangePasswordValues = z.infer<typeof ChangePasswordSchema>;
