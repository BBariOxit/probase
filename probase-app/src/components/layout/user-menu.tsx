'use client';

import Link from 'next/link';
import { KeyRound, LogOut, UserRound } from 'lucide-react';
import type { SessionUser } from '@/lib/api/types';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { UserAvatar } from '@/components/shared/user-avatar';

export function UserMenu({
  user,
  onSignOut,
}: {
  user: SessionUser;
  onSignOut: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Tài khoản của bạn"
            className="rounded-full"
          />
        }
      >
        <UserAvatar
          name={user.fullName}
          email={user.email}
          src={user.avatarUrl}
          className="size-7"
        />
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="min-w-48 [&_[role=menuitem]]:justify-center"
      >
        <DropdownMenuItem render={<Link href="/profile" />}>
          <UserRound />
          Trang cá nhân
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/change-password" />}>
          <KeyRound />
          Đổi mật khẩu
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem variant="destructive" onClick={onSignOut}>
          <LogOut />
          Đăng xuất
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
