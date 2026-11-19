'use client';

import { useEffect, useState } from 'react';
import { Loader2, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { useUpdateMyProfile } from '@/lib/api/me';
import type { MyProfile, UpdateMyProfileInput } from '@/lib/api/types';
import { extractErrorMessage } from '@/lib/api/error';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface Draft {
  phone: string;
  bio: string;
  academicTitle: string;
  researchInterests: string;
}

const ACADEMIC_TITLE_PRESETS = ['ThS.', 'TS.', 'PGS.TS.', 'GS.TS.'] as const;
const MAX_RESEARCH_LEN = 1000;
const MAX_BIO_LEN = 2000;

function draftFrom(profile: MyProfile): Draft {
  const person = profile.student ?? profile.lecturer;

  return {
    phone: person?.phone ?? '',
    bio: person?.bio ?? '',
    academicTitle: profile.lecturer?.academicTitle ?? '',
    researchInterests: profile.lecturer?.researchInterests ?? '',
  };
}

export function ProfileDetailsForm({ profile }: { profile: MyProfile }) {
  const isLecturer = profile.lecturer !== null;
  const [draft, setDraft] = useState<Draft>(() => draftFrom(profile));
  const [saved, setSaved] = useState(false);

  const [seed, setSeed] = useState(profile);
  if (seed !== profile) {
    setSeed(profile);
    setDraft(draftFrom(profile));
  }

  const update = useUpdateMyProfile();

  const original = draftFrom(profile);
  const dirty = (Object.keys(draft) as (keyof Draft)[]).some(
    (key) => draft[key].trim() !== original[key].trim(),
  );

  useEffect(() => {
    if (!dirty) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [dirty]);

  function set(key: keyof Draft, value: string) {
    setSaved(false);
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function reset() {
    setSaved(false);
    setDraft(draftFrom(profile));
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();

    const input: UpdateMyProfileInput = {
      phone: draft.phone.trim() || null,
      bio: draft.bio.trim() || null,
      // Sent only by the role that owns them: the API refuses these from a
      // student rather than dropping them, and it is right to.
      ...(isLecturer && {
        academicTitle: draft.academicTitle.trim() || null,
        researchInterests: draft.researchInterests.trim() || null,
      }),
    };

    update.mutate(input, {
      onSuccess: () => {
        setSaved(true);
        toast.success('Đã cập nhật hồ sơ.');
      },
      onError: (err) => toast.error(extractErrorMessage(err)),
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div className="space-y-1">
        <h2 className="text-sm font-medium">Hồ sơ công khai & liên hệ</h2>
        <p className="text-xs text-muted-foreground">
          {isLecturer
            ? 'Thông tin dưới đây giúp sinh viên tìm hiểu hướng dẫn và liên hệ khi thực hiện đề tài.'
            : 'Thông tin giúp giảng viên hướng dẫn và thành viên trong nhóm liên hệ với bạn.'}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Số điện thoại"
          htmlFor="phone"
          hint={
            isLecturer
              ? 'Chỉ hiển thị với sinh viên thuộc nhóm bạn hướng dẫn.'
              : 'Hiển thị với giảng viên hướng dẫn và thành viên trong nhóm.'
          }
        >
          <Input
            id="phone"
            value={draft.phone}
            onChange={(event) => set('phone', event.target.value)}
            placeholder="09xx xxx xxx"
            inputMode="tel"
            maxLength={20}
          />
        </Field>

        {isLecturer && (
          <Field label="Học vị" htmlFor="academicTitle">
            <Input
              id="academicTitle"
              value={draft.academicTitle}
              onChange={(event) => set('academicTitle', event.target.value)}
              placeholder="TS., PGS.TS., ThS."
              maxLength={100}
            />
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              {ACADEMIC_TITLE_PRESETS.map((preset) => {
                const active = draft.academicTitle.trim() === preset;
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => set('academicTitle', preset)}
                    className={cn(
                      'cursor-pointer rounded-md border px-2 py-0.5 text-xs transition-colors',
                      active
                        ? 'border-primary/40 bg-primary/10 font-medium text-primary'
                        : 'border-border bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground',
                    )}
                  >
                    {preset}
                  </button>
                );
              })}
            </div>
          </Field>
        )}
      </div>

      {isLecturer && (
        <Field
          label="Hướng nghiên cứu"
          htmlFor="researchInterests"
          counter={`${draft.researchInterests.length}/${MAX_RESEARCH_LEN}`}
          hint="Ngăn cách các chủ đề bằng dấu phẩy hoặc xuống dòng."
        >
          <Textarea
            id="researchInterests"
            value={draft.researchInterests}
            onChange={(event) => set('researchInterests', event.target.value)}
            placeholder="Kỹ thuật phần mềm, kiểm thử tự động…"
            maxLength={MAX_RESEARCH_LEN}
            rows={2}
          />
        </Field>
      )}

      <Field
        label="Giới thiệu"
        htmlFor="bio"
        counter={`${draft.bio.length}/${MAX_BIO_LEN}`}
      >
        <Textarea
          id="bio"
          value={draft.bio}
          onChange={(event) => set('bio', event.target.value)}
          placeholder={
            isLecturer
              ? 'Vài dòng để sinh viên biết bạn hướng dẫn thế nào.'
              : 'Vài dòng về bạn, để nhóm và giảng viên biết bạn làm được gì.'
          }
          maxLength={MAX_BIO_LEN}
          rows={4}
        />
      </Field>

      <div className="flex flex-wrap items-center gap-2.5 pt-1">
        <Button type="submit" disabled={!dirty || update.isPending}>
          {update.isPending && <Loader2 className="animate-spin" />}
          Lưu thay đổi
        </Button>

        {dirty && !update.isPending && (
          <Button type="button" variant="ghost" onClick={reset}>
            <RotateCcw className="size-3.5" />
            Huỷ thay đổi
          </Button>
        )}

        {saved && !dirty && (
          <span className="text-xs text-muted-foreground">Đã lưu.</span>
        )}
      </div>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  counter,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  counter?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={htmlFor}>{label}</Label>
        {counter && (
          <span className="font-mono text-[11px] text-muted-foreground">
            {counter}
          </span>
        )}
      </div>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
