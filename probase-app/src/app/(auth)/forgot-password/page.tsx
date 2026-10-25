'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Loader2, MailCheck } from 'lucide-react';
import { api, ApiError } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FormError } from '@/components/shared/form-error';

const ForgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'Vui lòng nhập email')
    .pipe(z.email('Email không hợp lệ')),
});

type ForgotPasswordValues = z.infer<typeof ForgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(ForgotPasswordSchema),
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });

  async function onSubmit(values: ForgotPasswordValues) {
    setFormError(null);
    try {
      await api('/auth/forgot-password', {
        method: 'POST',
        body: values,
        anonymous: true,
      });
      setSent(true);
    } catch (err) {
      setFormError(
        err instanceof ApiError ? err.message : 'Không kết nối được máy chủ',
      );
    }
  }

  if (sent) {
    return (
      <Card className="px-6 py-8 border-none shadow-lg">
        <div className="mb-6 space-y-4 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10">
            <MailCheck className="size-6 text-primary" />
          </div>
          <div className="space-y-1.5">
            <h1 className="font-heading text-2xl font-semibold tracking-tight text-primary">
              Kiểm tra hộp thư
            </h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Nếu email vừa nhập có tài khoản trong hệ thống, chúng tôi đã gửi
              liên kết đặt lại mật khẩu. Liên kết dùng được một lần và hết hạn
              sau 15 phút.
            </p>
          </div>
        </div>
        <div className="flex justify-center">
          <BackToLogin />
        </div>
      </Card>
    );
  }

  return (
    <Card className="px-6 py-8 border-none shadow-lg">
      <div className="mb-6 space-y-1.5 text-center">
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-primary">
          Quên mật khẩu
        </h1>
        <p className="text-sm text-muted-foreground">
          Nhập email để nhận liên kết đặt lại mật khẩu
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <FormError message={formError} />

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="username"
            autoFocus
            placeholder="sinhvien@probase.dev"
            aria-invalid={!!errors.email}
            {...register('email')}
          />
          {errors.email && (
            <p className="text-xs text-destructive">{errors.email.message}</p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="size-4 animate-spin" />}
          Gửi liên kết đặt lại
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
