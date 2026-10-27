'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { api, ApiError } from '@/lib/api/client';
import { passwordSchema } from '@/lib/auth/password';
import { useSession } from '@/lib/auth/session';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { FormError } from '@/components/shared/form-error';
import { PasswordInput } from '@/components/shared/password-input';

const ChangePasswordSchema = z
  .object({
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, 'Vui lòng nhập lại mật khẩu mới'),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: 'Mật khẩu nhập lại không khớp',
    path: ['confirmPassword'],
  });

type ChangePasswordValues = z.infer<typeof ChangePasswordSchema>;

export default function ChangePasswordPage() {
  const router = useRouter();
  const { status, user, setAccessToken, patchUser } = useSession();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordValues>({
    resolver: zodResolver(ChangePasswordSchema),
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/login');
  }, [status, router]);

  async function onSubmit(values: ChangePasswordValues) {
    setFormError(null);
    try {
      const result = await api<{ accessToken: string }>(
        '/auth/change-password',
        {
          method: 'PATCH',
          body: {
            newPassword: values.newPassword,
          },
        },
      );

      setAccessToken(result.accessToken);
      patchUser({ mustChangePassword: false });

      if (user) router.replace('/profile');
    } catch (err) {
      setFormError(
        err instanceof ApiError ? err.message : 'Không kết nối được máy chủ',
      );
    }
  }

  if (status === 'loading' || !user) {
    return <div className="h-72 animate-pulse rounded-xl bg-muted/50" />;
  }

  return (
    <Card className="px-6 py-8 border-none shadow-lg">
      <div className="mb-6 space-y-1.5 text-center">
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-primary">
          Đổi mật khẩu
        </h1>
        <p className="text-sm text-muted-foreground">
          Cập nhật mật khẩu bảo vệ tài khoản của bạn.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <FormError message={formError} />

        <div className="space-y-2">
          <Label htmlFor="newPassword">Mật khẩu mới</Label>
          <PasswordInput
            id="newPassword"
            autoComplete="new-password"
            autoFocus
            aria-invalid={!!errors.newPassword}
            {...register('newPassword')}
          />
          {errors.newPassword && (
            <p className="text-xs text-destructive">
              {errors.newPassword.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Nhập lại mật khẩu mới</Label>
          <PasswordInput
            id="confirmPassword"
            autoComplete="new-password"
            aria-invalid={!!errors.confirmPassword}
            {...register('confirmPassword')}
          />
          {errors.confirmPassword && (
            <p className="text-xs text-destructive">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => router.replace('/profile')}
          >
            Huỷ
          </Button>
          <Button
            type="submit"
            className="flex-1"
            disabled={isSubmitting}
          >
            {isSubmitting && <Loader2 className="size-4 animate-spin" />}
            Cập nhật mật khẩu
          </Button>
        </div>
      </form>
    </Card>
  );
}
