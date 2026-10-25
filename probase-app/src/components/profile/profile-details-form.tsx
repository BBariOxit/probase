'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useUpdateMyProfile } from '@/lib/api/me';
import type { MyProfile, UpdateMyProfileInput } from '@/lib/api/types';
import { extractErrorMessage } from '@/lib/api/error';
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

  function set(key: keyof Draft, value: string) {
    setSaved(false);
    setDraft((current) => ({ ...current, [key]: value }));
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
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Số điện thoại" htmlFor="phone">
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
          </Field>
        )}
      </div>

      {isLecturer && (
        <Field label="Hướng nghiên cứu" htmlFor="researchInterests">
          <Textarea
            id="researchInterests"
            value={draft.researchInterests}
            onChange={(event) => set('researchInterests', event.target.value)}
            placeholder="Kỹ thuật phần mềm, kiểm thử tự động…"
            maxLength={1000}
            rows={2}
          />
        </Field>
      )}

      <Field label="Giới thiệu" htmlFor="bio">
        <Textarea
          id="bio"
          value={draft.bio}
          onChange={(event) => set('bio', event.target.value)}
          placeholder={
            isLecturer
              ? 'Vài dòng để sinh viên biết bạn hướng dẫn thế nào.'
              : 'Vài dòng về bạn, để nhóm và giảng viên biết bạn làm được gì.'
          }
          maxLength={2000}
          rows={4}
        />
      </Field>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={!dirty || update.isPending}>
          {update.isPending && <Loader2 className="animate-spin" />}
          Lưu thay đổi
        </Button>

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
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}
