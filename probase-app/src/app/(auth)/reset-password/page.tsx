'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react';
import { api, ApiError } from '@/lib/api/client';
import { passwordSchema } from '@/lib/auth/password';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { FormError } from '@/components/shared/form-error';
import { PasswordInput } from '@/components/shared/password-input';

const ResetPasswordSchema = z
  .object({
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, 'Vui lòng nhập lại mật khẩu mới'),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: 'Mật khẩu nhập lại không khớp',
    path: ['confirmPassword'],
  });

type ResetPasswordValues = z.infer<typeof ResetPasswordSchema>;

type LinkState = 'checking' | 'valid' | 'invalid';

function ResetPasswordForm() {
  const router = useRouter();
  const token = useSearchParams().get('token') ?? '';

  const [linkState, setLinkState] = useState<LinkState>(
    token ? 'checking' : 'invalid',
  );
  const [done, setDone] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordValues>({
    resolver: zodResolver(ResetPasswordSchema),
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });

  useEffect(() => {
    if (!token) return;

    let cancelled = false;
    void api<{ valid: boolean }>(
      `/auth/reset-password/${encodeURIComponent(token)}`,
      { anonymous: true },
    )
      .then((res) => {
        if (!cancelled) setLinkState(res.valid ? 'valid' : 'invalid');
      })
      .catch(() => {
        if (!cancelled) setLinkState('invalid');
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  async function onSubmit(values: ResetPasswordValues) {
    setFormError(null);
    try {
      await api('/auth/reset-password', {
        method: 'POST',
        body: { token, newPassword: values.newPassword },
        anonymous: true,
      });
      setDone(true);
    } catch (err) {
      setFormError(
        err instanceof ApiError ? err.message : 'Không kết nối được máy chủ',
      );
    }
  }

  if (linkState === 'checking') {
    return <div className="h-64 animate-pulse rounded-xl bg-muted/50" />;
  }

  if (linkState === 'invalid') {
    return (
      <Card className="px-6 py-8 border-none shadow-lg">
        <div className="mb-6 space-y-1.5 text-center">
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-primary">
            Liên kết không còn hiệu lực
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Liên kết đặt lại mật khẩu chỉ dùng được một lần và hết hạn sau 15
            phút. Hãy yêu cầu một liên kết mới.
          </p>
        </div>
        <Button
          onClick={() => router.push('/forgot-password')}
          className="w-full"
        >
          Gửi liên kết mới
        </Button>
        <div className="mt-5 flex justify-center">
          <BackToLogin />
        </div>
      </Card>
    );
  }

  if (done) {
    return (
      <Card className="px-6 py-8 border-none shadow-lg">
        <div className="mb-6 space-y-4 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10">
            <CheckCircle2 className="size-6 text-primary" />
          </div>
          <div className="space-y-1.5">
            <h1 className="font-heading text-2xl font-semibold tracking-tight text-primary">
              Đã đổi mật khẩu
            </h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Mọi phiên đăng nhập cũ đã bị đăng xuất. Dùng mật khẩu mới để đăng
              nhập lại.
            </p>
          </div>
        </div>
        <Button onClick={() => router.replace('/login')} className="w-full">
          Đăng nhập
        </Button>
      </Card>
    );
  }

  return (
    <Card className="px-6 py-8 border-none shadow-lg">
      <div className="mb-6 space-y-1.5 text-center">
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-primary">
          Đặt mật khẩu mới
        </h1>
        <p className="text-sm text-muted-foreground">
          Chọn mật khẩu mới cho tài khoản của bạn.
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

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="size-4 animate-spin" />}
          Đặt mật khẩu mới
        </Button>
      </form>

      <div className="mt-5 flex justify-center">
        <BackToLogin />
      </div>
    </Card>
  );
}

function BackToLogin() {
  return (
    <Link
      href="/login"
      className="inline-flex w-fit items-center gap-1.5 rounded-sm text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <ArrowLeft className="size-3.5" />
      Quay lại đăng nhập
    </Link>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={<div className="h-64 animate-pulse rounded-xl bg-muted/50" />}
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
