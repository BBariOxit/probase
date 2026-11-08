'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { ApiError } from '@/lib/api/client';
import { useCreateUser, useNextLecturerCode, type CreateUserInput } from '@/lib/api/users';
import { useMajors } from '@/lib/api/majors';
import type { Role } from '@/lib/api/types';
import { ACADEMIC_TITLE_OPTIONS } from '@/constants/academic-title.constant';
import {
  deriveClassPrefixFromStudentCode,
  deriveEmailFromStudentCode,
  normalizeFullName,
} from '@/lib/account-form.utils';
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

const ROLE_LABEL: Record<Role, string> = {
  ADMIN: 'Quản trị viên',
  LECTURER: 'Giảng viên',
  STUDENT: 'Sinh viên',
};

const inputStyle =
  'bg-slate-50 hover:bg-slate-100/70 focus:bg-white dark:bg-[#121212] dark:hover:bg-[#181818] dark:focus:bg-[#0c0c0c] border-slate-300 dark:border-neutral-700 shadow-2xs';

export function CreateUserDialog({ onClose }: { onClose: () => void }) {
  const create = useCreateUser();
  const { data: majors } = useMajors();

  const [role, setRole] = useState<Role>('STUDENT');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [code, setCode] = useState('');
  const [className, setClassName] = useState('');
  const [majorId, setMajorId] = useState<number | null>(null);
  const [academicTitle, setAcademicTitle] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Auto-fetch next lecturer code when role is LECTURER
  const { data: nextLecturerCodeData, refetch: refetchNextCode } = useNextLecturerCode(
    role === 'LECTURER',
  );

  // Track if user manually modified class name
  const isClassManuallyEdited = useRef(false);

  // When role changes to LECTURER, auto-fill next lecturer code
  useEffect(() => {
    if (role === 'LECTURER') {
      refetchNextCode().then((res) => {
        if (res.data?.nextCode) {
          setCode(res.data.nextCode);
        }
      });
      setEmail('');
    } else if (role === 'STUDENT') {
      setCode('');
      setEmail('');
      setClassName('');
      isClassManuallyEdited.current = false;
    } else {
      setCode('');
      setEmail('');
    }
  }, [role, refetchNextCode]);

  // Sync lecturer code whenever fetched data arrives
  useEffect(() => {
    if (role === 'LECTURER' && nextLecturerCodeData?.nextCode && !code) {
      setCode(nextLecturerCodeData.nextCode);
    }
  }, [role, nextLecturerCodeData, code]);

  // Handle student code change: auto-derive email and class prefix
  function handleStudentCodeChange(val: string) {
    setCode(val);
    setEmail(deriveEmailFromStudentCode(val));

    // Auto-suggest class prefix if user hasn't typed a custom class
    const prefix = deriveClassPrefixFromStudentCode(val);
    if (prefix && (!isClassManuallyEdited.current || className.startsWith('CTK'))) {
      const suffix = className.replace(/^CTK\d*/i, '');
      setClassName(`${prefix}${suffix}`);
    }
  }

  const needsProfile = role !== 'ADMIN';
  const ready =
    email.trim() !== '' &&
    (!needsProfile || (fullName.trim() !== '' && code.trim() !== ''));

  async function submit() {
    setError(null);
    try {
      const input: CreateUserInput =
        role === 'STUDENT'
          ? {
              role: 'STUDENT',
              email: email.trim(),
              studentCode: code.trim(),
              fullName: normalizeFullName(fullName),
              ...(className.trim() && { class: className.trim() }),
              ...(majorId !== null && { majorId }),
            }
          : role === 'LECTURER'
            ? {
                role: 'LECTURER',
                email: email.trim(),
                lecturerCode: code.trim(),
                fullName: normalizeFullName(fullName),
                ...(academicTitle.trim() && {
                  academicTitle: academicTitle.trim(),
                }),
              }
            : { role: 'ADMIN', email: email.trim() };

      await create.mutateAsync(input);
      onClose();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Không kết nối được máy chủ',
      );
    }
  }

  return (
    <Dialog open onOpenChange={(next) => !next && !create.isPending && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Thêm tài khoản mới</DialogTitle>
          <DialogDescription className="sr-only">
            Nhập thông tin để tạo tài khoản người dùng
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          <FormError message={error} />

          {/* ── ROW 1: Vai trò & Mã định danh (MSSV / Mã GV) ── */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="new-role">Vai trò</Label>
              <Select value={role} onValueChange={(val) => setRole(val as Role)}>
                <SelectTrigger id="new-role" className={`w-full ${inputStyle}`}>
                  <SelectValue>{(val) => ROLE_LABEL[val as Role]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="STUDENT">Sinh viên</SelectItem>
                  <SelectItem value="LECTURER">Giảng viên</SelectItem>
                  <SelectItem value="ADMIN">Quản trị viên</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {role === 'STUDENT' ? (
              <div className="space-y-2">
                <Label htmlFor="new-code">Mã sinh viên (MSSV)</Label>
                <Input
                  id="new-code"
                  placeholder="2212345"
                  maxLength={15}
                  value={code}
                  autoFocus
                  onChange={(e) => handleStudentCodeChange(e.target.value)}
                  className={inputStyle}
                />
              </div>
            ) : role === 'LECTURER' ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="new-code">Mã giảng viên</Label>
                  <span className="text-[11px] text-muted-foreground">Tự động tăng</span>
                </div>
                <Input
                  id="new-code"
                  placeholder="GV001"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className={inputStyle}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="new-email">Email</Label>
                <Input
                  id="new-email"
                  type="email"
                  autoFocus
                  placeholder="admin@dlu.edu.vn"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputStyle}
                />
              </div>
            )}
          </div>

          {/* ── ROW 2: Họ và tên & Email ── */}
          {needsProfile && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="new-name">Họ và tên</Label>
                <Input
                  id="new-name"
                  placeholder="Nguyễn Văn A"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  onBlur={() => setFullName((prev) => normalizeFullName(prev))}
                  className={inputStyle}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="new-email">Email</Label>
                  {role === 'STUDENT' && (
                    <span className="text-[11px] text-muted-foreground">Theo MSSV</span>
                  )}
                </div>
                <Input
                  id="new-email"
                  type="email"
                  placeholder={
                    role === 'STUDENT' ? '2212345@dlu.edu.vn' : 'gv001@dlu.edu.vn'
                  }
                  value={email}
                  readOnly={role === 'STUDENT'}
                  tabIndex={role === 'STUDENT' ? -1 : undefined}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`${inputStyle} ${role === 'STUDENT' ? 'bg-muted/60 cursor-not-allowed text-muted-foreground' : ''}`}
                />
              </div>
            </div>
          )}

          {/* ── ROW 3: Thông tin chuyên môn ── */}
          {role === 'STUDENT' && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="new-class">Lớp</Label>
                  <span className="text-[11px] text-muted-foreground">Gợi ý theo khóa</span>
                </div>
                <Input
                  id="new-class"
                  placeholder="CTK46"
                  value={className}
                  onChange={(e) => {
                    isClassManuallyEdited.current = true;
                    setClassName(e.target.value);
                  }}
                  className={inputStyle}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-major">Chuyên ngành</Label>
                <Select
                  value={majorId !== null ? String(majorId) : 'none'}
                  onValueChange={(val) =>
                    setMajorId(!val || val === 'none' ? null : Number(val))
                  }
                >
                  <SelectTrigger id="new-major" className={`w-full ${inputStyle}`}>
                    <SelectValue>
                      {(val) => {
                        if (val === 'none' || !val) return 'Chưa chọn';
                        return (
                          majors?.find((m) => String(m.id) === val)?.name ?? 'Chưa chọn'
                        );
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Chưa chọn</SelectItem>
                    {majors?.map((major) => (
                      <SelectItem key={major.id} value={String(major.id)}>
                        {major.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {role === 'LECTURER' && (
            <div className="space-y-2">
              <Label htmlFor="new-title">Học hàm, học vị</Label>
              <Select
                value={academicTitle || 'none'}
                onValueChange={(val) =>
                  setAcademicTitle(!val || val === 'none' ? '' : val)
                }
              >
                <SelectTrigger id="new-title" className={`w-full sm:w-64 ${inputStyle}`}>
                  <SelectValue>
                    {(val) => {
                      if (val === 'none' || !val) return 'Chưa có / Khác';
                      return (
                        ACADEMIC_TITLE_OPTIONS.find((opt) => opt.value === val)?.label ??
                        val
                      );
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {ACADEMIC_TITLE_OPTIONS.map((option) => (
                    <SelectItem key={option.value || 'none'} value={option.value || 'none'}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2 pt-2">
          <Button
            variant="outline"
            disabled={create.isPending}
            onClick={onClose}
            className="cursor-pointer"
          >
            Huỷ
          </Button>
          <Button
            disabled={!ready || create.isPending}
            onClick={submit}
            className="cursor-pointer font-semibold shadow-xs bg-primary text-white hover:bg-primary/90"
          >
            {create.isPending && <Loader2 className="animate-spin" />}
            Tạo tài khoản
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
