'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { Brand } from '@/components/layout/brand';
import { api, ApiError } from '@/lib/api/client';
import type { LoginResponse, Role } from '@/lib/api/types';
import { safeNextPath } from '@/lib/auth/next-path';
import { homePathFor, useSession } from '@/lib/auth/session';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FormError } from '@/components/shared/form-error';
import { PasswordInput } from '@/components/shared/password-input';

const LoginSchema = z.object({
  email: z
    .string()
    .min(1, 'Vui lòng nhập email')
    .pipe(z.email('Email không hợp lệ')),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
});

type LoginValues = z.infer<typeof LoginSchema>;

export default function LoginPage() {
  return (
    <Suspense fallback={<Card className="h-72 px-6 py-7" />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status, user, signIn } = useSession();
  const [formError, setFormError] = useState<string | null>(null);

  const next = safeNextPath(searchParams.get('next'));

  function destinationFor(signedIn: {
    mustChangePassword: boolean;
    role: Role;
  }) {
    if (signedIn.mustChangePassword) return '/change-password';
    return next ?? homePathFor(signedIn.role);
  }

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(LoginSchema),
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });

  useEffect(() => {
    if (status === 'authenticated' && user)
      router.replace(destinationFor(user));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, user, router, next]);

  async function onSubmit(values: LoginValues) {
    setFormError(null);
    try {
      const result = await api<LoginResponse>('/auth/login', {
        method: 'POST',
        body: values,
        anonymous: true,
      });

      signIn(result, result.user);
      router.replace(destinationFor(result.user));
    } catch (err) {
      setFormError(
        err instanceof ApiError && err.status === 401
          ? 'Email hoặc mật khẩu không đúng'
          : err instanceof ApiError
            ? err.message
            : 'Không kết nối được máy chủ',
      );
    }
  }

  return (
    <Card className="px-6 py-8 border-none shadow-lg">
      <div className="mb-6 flex justify-center">
        <Brand className="text-4xl" />
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-5"
        autoComplete="off"
        noValidate
      >
        <FormError message={formError} />

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="new-password"
            autoFocus
            placeholder="sinhvien@probase.dev"
            aria-invalid={!!errors.email}
            {...register('email')}
          />
          {errors.email && (
            <p className="text-xs text-destructive">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <Label htmlFor="password">Mật khẩu</Label>
            <Link
              href="/forgot-password"
              className="rounded-sm text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              Quên mật khẩu?
            </Link>
          </div>
          <PasswordInput
            id="password"
            autoComplete="new-password"
            aria-invalid={!!errors.password}
            {...register('password')}
          />
          {errors.password && (
            <p className="text-xs text-destructive">
              {errors.password.message}
            </p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="size-4 animate-spin" />}
          Đăng nhập
        </Button>
      </form>
    </Card>
  );
}
