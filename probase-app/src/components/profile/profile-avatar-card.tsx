'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { Camera, ExternalLink, KeyRound, Loader2, Trash2 } from 'lucide-react';
import { useRemoveAvatar, useUploadAvatar } from '@/lib/api/me';
import type { MyProfile } from '@/lib/api/types';
import { sanitizeLecturerName } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/shared/user-avatar';

const ROLE_LABELS: Record<MyProfile['role'], string> = {
  ADMIN: 'Quản trị viên',
  LECTURER: 'Giảng viên',
  GVCN: 'GV Chủ nhiệm',
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

  const displayName = profile.lecturer
    ? sanitizeLecturerName(
        profile.lecturer.fullName,
        profile.lecturer.academicTitle,
      ).displayName
    : (profile.fullName ?? ROLE_LABELS[profile.role]);

  const code =
    profile.student?.studentCode ?? profile.lecturer?.lecturerCode ?? null;

  const departmentOrMajor =
    profile.lecturer?.major?.name ?? profile.student?.major?.name ?? null;

  function choose(file: File | undefined) {
    if (!file) return;

    if (file.size > MAX_BYTES) {
      setRejected('Ảnh nặng quá 2MB. Vui lòng chọn ảnh nhỏ hơn.');
      return;
    }

    setRejected(null);
    upload.mutate(file);
  }

  return (
    <section className="space-y-4 rounded-xl border bg-card p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <button
            type="button"
            disabled={busy}
            onClick={() => fileInput.current?.click()}
            aria-label={
              profile.avatarUrl ? 'Đổi ảnh đại diện' : 'Tải ảnh đại diện lên'
            }
            className="group relative shrink-0 cursor-pointer rounded-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed"
          >
            <UserAvatar
              name={profile.fullName}
              email={profile.email}
              src={profile.avatarUrl}
              className="size-16 text-lg sm:size-[4.5rem]"
            />
            {busy ? (
              <span className="absolute inset-0 flex items-center justify-center rounded-full bg-background/75">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </span>
            ) : (
              <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                <Camera className="size-4" />
              </span>
            )}
          </button>

          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-heading truncate text-lg leading-tight font-semibold tracking-tight sm:text-xl">
                {displayName}
              </h2>
              {code ? (
                <span className="inline-flex items-center rounded-md border border-primary/20 bg-primary/10 px-2 py-0.5 font-mono text-xs font-semibold text-primary">
                  {code}
                </span>
              ) : (
                <span className="inline-flex items-center rounded-md border border-border bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  {ROLE_LABELS[profile.role]}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-muted-foreground">
              <span className="truncate">{profile.email}</span>
              {departmentOrMajor && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="truncate">
                    {profile.lecturer
                      ? `Bộ môn ${departmentOrMajor}`
                      : departmentOrMajor}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {profile.lecturer && (
            <Button
              variant="outline"
              size="sm"
              render={<Link href={`/lecturers/${profile.lecturer.id}`} />}
              title="Xem trang sinh viên nhìn thấy"
            >
              <ExternalLink className="size-3.5" />
              Trang công khai
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            render={<Link href="/change-password" />}
          >
            <KeyRound className="size-3.5" />
            Đổi mật khẩu
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3.5">
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
            <Camera className="size-3.5" />
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
              <Trash2 className="size-3.5" />
              Xoá ảnh
            </Button>
          )}
        </div>

        <span className="text-xs text-muted-foreground">
          PNG, JPG, WebP · Tối đa 2MB
        </span>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}
    </section>
  );
}
