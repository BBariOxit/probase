'use client';

import React from 'react';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { useTheme } from 'next-themes';
import { Loader2, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GoogleLoginButtonProps {
  onSuccess: (credential: string) => void;
  onError: (errorMsg: string) => void;
  isLoading?: boolean;
  className?: string;
}

export function GoogleLoginButton({
  onSuccess,
  onError,
  isLoading = false,
  className,
}: GoogleLoginButtonProps) {
  const { resolvedTheme } = useTheme();
  const hasClientId = Boolean(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);

  if (!hasClientId) {
    return (
      <div className="rounded-lg border border-dashed border-amber-500/40 bg-amber-500/10 p-3 text-center text-xs text-amber-600 dark:text-amber-400">
        Google Client ID chưa được cấu hình trong <code>.env</code>
      </div>
    );
  }

  const handleSuccess = (credentialResponse: CredentialResponse) => {
    if (credentialResponse.credential) {
      onSuccess(credentialResponse.credential);
    } else {
      onError('Không lấy được thông tin xác thực từ Google');
    }
  };

  const handleFailure = () => {
    onError('Đăng nhập Google bị gián đoạn hoặc cửa sổ đăng nhập đã bị đóng.');
  };

  return (
    <div className={cn('relative flex flex-col items-center gap-2', className)}>
      <div className="relative w-full flex justify-center min-h-[44px]">
        {isLoading ? (
          <div className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-border bg-muted/60 text-sm font-medium text-muted-foreground animate-pulse">
            <Loader2 className="size-4 animate-spin text-primary" />
            <span>Đang xác thực tài khoản DLU...</span>
          </div>
        ) : (
          <div className="w-full flex justify-center overflow-hidden rounded-lg shadow-sm transition-all hover:shadow-md">
            <GoogleLogin
              onSuccess={handleSuccess}
              onError={handleFailure}
              theme={resolvedTheme === 'dark' ? 'filled_black' : 'outline'}
              size="large"
              shape="rectangular"
              text="continue_with"
              width="340"
            />
          </div>
        )}
      </div>

      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/90">
        <ShieldCheck className="size-3.5 text-primary shrink-0" />
        <span>Chỉ áp dụng cho email sinh viên & giảng viên Đại học Đà Lạt</span>
      </div>
    </div>
  );
}
