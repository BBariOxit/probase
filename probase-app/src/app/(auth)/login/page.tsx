'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Brand } from '@/components/layout/brand';
import { GoogleLoginButton } from '@/components/auth/google-login-button';
import { api, ApiError } from '@/lib/api/client';
import type { LoginResponse, Role } from '@/lib/api/types';
import { useGoogleSso } from '@/lib/auth/google-auth';
import { safeNextPath } from '@/lib/auth/next-path';
import { homePathFor, useSession } from '@/lib/auth/session';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
    <Suspense fallback={<Card className="h-80 px-6 py-7" />}>
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
    handleGoogleCredential,
    isLoading: isGoogleLoading,
    setError: setGoogleError,
  } = useGoogleSso({
    nextParam: searchParams.get('next'),
    onError: (err) => setFormError(err),
  });

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
    if (status === 'authenticated' && user) {
      router.replace(destinationFor(user));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, user, router, next]);

  async function onSubmit(values: LoginValues) {
    setFormError(null);
    setGoogleError(null);
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
          ? 'Email hoặc mật khẩu không chính xác'
          : err instanceof ApiError
            ? err.message
            : 'Không thể kết nối đến máy chủ',
      );
    }
  }

  return (
    <Card className="px-6 py-8 border-none shadow-xl bg-card/95 backdrop-blur-sm">
      <div className="mb-6 flex justify-center">
        <Brand className="text-4xl tracking-tight" />
      </div>

      {formError && (
        <div className="mb-5 rounded-lg border border-destructive/20 bg-destructive/10 p-3.5 text-sm text-destructive dark:border-destructive/30">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="size-4 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-medium text-xs sm:text-sm leading-relaxed">
                {formError}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Form đăng nhập email/mật khẩu truyền thống */}
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-4"
        autoComplete="off"
        noValidate
      >
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-xs font-medium">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            autoComplete="new-password"
            placeholder="sinhvien@st.dlu.edu.vn"
            aria-invalid={!!errors.email}
            {...register('email')}
          />
          {errors.email && (
            <p className="text-xs text-destructive">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between">
            <Label htmlFor="password" className="text-xs font-medium">
              Mật khẩu
            </Label>
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

        <Button
          type="submit"
          className="w-full h-10 mt-2 font-medium"
          disabled={isSubmitting || isGoogleLoading}
        >
          {isSubmitting && <Loader2 className="size-4 animate-spin mr-1.5" />}
          Đăng nhập
        </Button>
      </form>

      <div className="relative my-4 flex items-center justify-center">
        <div className="w-full border-t border-border/70" />
        <span className="absolute bg-card px-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
          hoặc
        </span>
      </div>

      <div>
        <GoogleLoginButton
          disabled={isSubmitting}
          isLoading={isGoogleLoading}
          onSuccess={(token) => {
            setFormError(null);
            handleGoogleCredential(token);
          }}
          onError={(err) => setFormError(err)}
        />
      </div>
    </Card>
  );
}
