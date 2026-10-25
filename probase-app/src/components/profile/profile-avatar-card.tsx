'use client';

import { useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useRemoveAvatar, useUploadAvatar } from '@/lib/api/me';
import type { MyProfile } from '@/lib/api/types';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/shared/user-avatar';

const ROLE_LABELS: Record<MyProfile['role'], string> = {
  ADMIN: 'Quản trị viên',
  LECTURER: 'Giảng viên',
  STUDENT: 'Sinh viên',
};

const MAX_BYTES = 2 * 1024 * 1024;
const ACCEPTED = 'image/png,image/jpeg,image/webp';

export function ProfileAvatarCard({ profile }: { profile: MyProfile }) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [rejected, setRejected] = useState<string | null>(null);

  const upload = useUploadAvatar();
  const remove = useRemoveAvatar();
  const busy = upload.isPending || remove.isPending;
  const error = rejected ?? upload.error?.message ?? remove.error?.message;

  function choose(file: File | undefined) {
    if (!file) return;

    if (file.size > MAX_BYTES) {
      setRejected('Ảnh nặng quá 2MB. Chọn ảnh nhỏ hơn nhé.');
      return;
    }

    setRejected(null);
    upload.mutate(file);
  }

  return (
    <section className="space-y-4 rounded-xl border bg-card p-5">
      <div className="flex items-center gap-4">
        <div className="relative">
          <UserAvatar
            name={profile.fullName}
            email={profile.email}
            src={profile.avatarUrl}
            className="size-16 text-lg"
          />
          {busy && (
            <span className="absolute inset-0 flex items-center justify-center rounded-full bg-background/70">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </span>
          )}
        </div>

        <div className="min-w-0">
          <h2 className="font-heading truncate text-lg leading-tight font-semibold tracking-tight">
            {profile.fullName ?? ROLE_LABELS[profile.role]}
          </h2>
          <p className="truncate text-sm text-muted-foreground">
            {profile.email}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={fileInput}
          type="file"
          accept={ACCEPTED}
          className="sr-only"
          onChange={(event) => {
            choose(event.target.files?.[0]);
            event.target.value = '';
          }}
        />

        <Button
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={() => fileInput.current?.click()}
        >
          {profile.avatarUrl ? 'Đổi ảnh' : 'Tải ảnh lên'}
        </Button>

        {profile.avatarUrl && (
          <Button
            variant="ghost"
            size="sm"
            disabled={busy}
            onClick={() => {
              setRejected(null);
              remove.mutate(undefined);
            }}
            className="text-muted-foreground hover:text-destructive"
          >
            Xoá ảnh
          </Button>
        )}
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}
    </section>
  );
}
