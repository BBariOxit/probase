'use client';

import { useState } from 'react';
import { Info, Loader2 } from 'lucide-react';
import { ApiError } from '@/lib/api/client';
import { useMajors } from '@/lib/api/majors';
import {
  useUpsertLecturerProfile,
  useUpsertStudentProfile,
  useUser,
} from '@/lib/api/users';
import type {
  LecturerProfileDetail,
  StudentProfileDetail,
  UserAccount,
} from '@/lib/api/types';
import { FormError } from '@/components/shared/form-error';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

const NO_MAJOR = 0;

export function UserProfileDialog({
  user,
  onClose,
}: {
  user: UserAccount;
  onClose: () => void;
}) {
  const { data, isPending } = useUser(user.id);

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Sửa hồ sơ</DialogTitle>
          <DialogDescription>{user.email}</DialogDescription>
        </DialogHeader>

        {isPending || !data ? (
          <div className="flex justify-center py-12">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : data.role === 'STUDENT' ? (
          <StudentForm
            userId={user.id}
            profile={data.studentProfile}
            onClose={onClose}
          />
        ) : data.role === 'LECTURER' ? (
          <LecturerForm
            userId={user.id}
            profile={data.lecturerProfile}
            onClose={onClose}
          />
        ) : (
          <p className="py-4 text-sm text-muted-foreground">
            Tài khoản quản trị không gắn với hồ sơ sinh viên hay giảng viên nào,
            nên ở đây không có gì để sửa.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}

function StudentForm({
  userId,
  profile,
  onClose,
}: {
  userId: number;
  profile: StudentProfileDetail | null;
  onClose: () => void;
}) {
  const save = useUpsertStudentProfile();
  const { data: majors } = useMajors();

  const [studentCode, setStudentCode] = useState(profile?.studentCode ?? '');
  const [fullName, setFullName] = useState(profile?.fullName ?? '');
  const [className, setClassName] = useState(profile?.class ?? '');
  const [majorId, setMajorId] = useState(profile?.majorId ?? NO_MAJOR);
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [note, setNote] = useState(profile?.note ?? '');
  const [error, setError] = useState<string | null>(null);

  const validCode = /^\d{7}$/.test(studentCode.trim());
  const ready = validCode && fullName.trim() !== '';

  async function submit() {
    setError(null);
    try {
      await save.mutateAsync({
        id: userId,
        studentCode: studentCode.trim(),
        fullName: fullName.trim(),
        class: className.trim() || null,
        majorId: majorId === NO_MAJOR ? null : majorId,
        phone: phone.trim() || null,
        // Sent as it stands rather than omitted, because a PUT that leaves it
        // out would clear a note somebody wrote about this student.
        bio: profile?.bio ?? null,
        note: note.trim() || null,
      });
      onClose();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Không kết nối được máy chủ',
      );
    }
  }

  return (
    <>
      <div className="space-y-4">
        <FormError message={error} />

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Họ và tên" id="p-name">
            <Input
              id="p-name"
              autoFocus
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
            />
          </Field>

          <Field
            label="Mã sinh viên"
            id="p-code"
            error={
              studentCode !== '' && !validCode
                ? 'Mã sinh viên phải gồm 7 chữ số.'
                : undefined
            }
          >
            <Input
              id="p-code"
              value={studentCode}
              aria-invalid={studentCode !== '' && !validCode}
              onChange={(event) => setStudentCode(event.target.value)}
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Lớp" id="p-class">
            <Input
              id="p-class"
              placeholder="CTK46"
              value={className}
              onChange={(event) => setClassName(event.target.value)}
            />
          </Field>

          <Field label="Chuyên ngành" id="p-major">
            <Select
              value={majorId}
              onValueChange={(value) => setMajorId(value as number)}
            >
              <SelectTrigger id="p-major" className="w-full">
                <SelectValue>
                  {(value) =>
                    value === NO_MAJOR
                      ? 'Chưa chọn'
                      : (majors?.find((major) => major.id === value)?.name ??
                        'Chưa chọn')
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_MAJOR}>Chưa chọn</SelectItem>
                {majors?.map((major) => (
                  <SelectItem key={major.id} value={major.id}>
                    {major.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

        <Field label="Số điện thoại" id="p-phone">
          <Input
            id="p-phone"
            className="w-48"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
          />
        </Field>

        <Field label="Ghi chú của khoa" id="p-note">
          <Textarea
            id="p-note"
            rows={2}
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </Field>
      </div>

      <Footer
        pending={save.isPending}
        ready={ready}
        onClose={onClose}
        onSave={submit}
      />
    </>
  );
}

function LecturerForm({
  userId,
  profile,
  onClose,
}: {
  userId: number;
  profile: LecturerProfileDetail | null;
  onClose: () => void;
}) {
  const save = useUpsertLecturerProfile();

  const [lecturerCode, setLecturerCode] = useState(profile?.lecturerCode ?? '');
  const [fullName, setFullName] = useState(profile?.fullName ?? '');
  const [academicTitle, setAcademicTitle] = useState(
    profile?.academicTitle ?? '',
  );
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [interests, setInterests] = useState(profile?.researchInterests ?? '');
  const [quota, setQuota] = useState(
    profile?.maxMentoringQuota === null ||
      profile?.maxMentoringQuota === undefined
      ? ''
      : String(profile.maxMentoringQuota),
  );
  const [error, setError] = useState<string | null>(null);

  const quotaNumber = Number(quota);
  // Empty means no ceiling. Zero is refused by the API, so it is refused here
  // too rather than being sent and coming back as a validation error.
  const validQuota =
    quota.trim() === '' ||
    (Number.isInteger(quotaNumber) && quotaNumber >= 1 && quotaNumber <= 99);
  const ready =
    lecturerCode.trim() !== '' && fullName.trim() !== '' && validQuota;

  async function submit() {
    setError(null);
    try {
      await save.mutateAsync({
        id: userId,
        lecturerCode: lecturerCode.trim(),
        fullName: fullName.trim(),
        academicTitle: academicTitle.trim() || null,
        phone: phone.trim() || null,
        bio: profile?.bio ?? null,
        researchInterests: interests.trim() || null,
        maxMentoringQuota: quota.trim() === '' ? null : quotaNumber,
      });
      onClose();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Không kết nối được máy chủ',
      );
    }
  }

  return (
    <>
      <div className="space-y-4">
        <FormError message={error} />

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Họ và tên" id="p-name">
            <Input
              id="p-name"
              autoFocus
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
            />
          </Field>

          <Field label="Mã giảng viên" id="p-code">
            <Input
              id="p-code"
              value={lecturerCode}
              onChange={(event) => setLecturerCode(event.target.value)}
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Học hàm, học vị" id="p-title">
            <Input
              id="p-title"
              placeholder="TS."
              value={academicTitle}
              onChange={(event) => setAcademicTitle(event.target.value)}
            />
          </Field>

          <Field
            label="Hạn mức hướng dẫn"
            id="p-quota"
            error={
              !validQuota
                ? 'Nhập một số từ 1 đến 99, hoặc để trống.'
                : undefined
            }
          >
            <Input
              id="p-quota"
              type="number"
              min={1}
              max={99}
              className="w-28"
              value={quota}
              aria-invalid={!validQuota}
              onChange={(event) => setQuota(event.target.value)}
            />
          </Field>
        </div>

        <Field label="Số điện thoại" id="p-phone">
          <Input
            id="p-phone"
            className="w-48"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
          />
        </Field>

        <Field label="Hướng nghiên cứu" id="p-interests">
          <Textarea
            id="p-interests"
            rows={2}
            value={interests}
            onChange={(event) => setInterests(event.target.value)}
          />
        </Field>
      </div>

      <Footer
        pending={save.isPending}
        ready={ready}
        onClose={onClose}
        onSave={submit}
      />
    </>
  );
}

function Field({
  label,
  id,
  hint,
  error,
  children,
}: {
  label: string;
  id: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {hint && <p className="-mt-1 text-xs text-muted-foreground">{hint}</p>}
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function Footer({
  pending,
  ready,
  onClose,
  onSave,
}: {
  pending: boolean;
  ready: boolean;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <DialogFooter>
      <Button variant="outline" disabled={pending} onClick={onClose}>
        Huỷ
      </Button>
      <Button disabled={!ready || pending} onClick={onSave}>
        {pending && <Loader2 className="animate-spin" />}
        Lưu hồ sơ
      </Button>
    </DialogFooter>
  );
}
