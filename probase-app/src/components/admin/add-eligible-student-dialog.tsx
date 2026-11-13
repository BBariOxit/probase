'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api/client';
import { useAddEligibleStudent } from '@/lib/api/eligible-students';
import { useMajors } from '@/lib/api/majors';
import { useActiveSemester, useRoundsForSemester } from '@/lib/api/master-data';
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

const inputStyle =
  'bg-slate-100/90 hover:bg-slate-100 focus:bg-white dark:bg-[#141416] dark:hover:bg-[#19191d] dark:focus:bg-[#0d0d0f] border-slate-300 hover:border-slate-400 dark:border-neutral-700 dark:hover:border-neutral-600 focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary shadow-2xs transition-colors';

interface AddEligibleStudentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultRoundId?: number;
}

export function AddEligibleStudentDialog({
  open,
  onOpenChange,
  defaultRoundId,
}: AddEligibleStudentDialogProps) {
  const semester = useActiveSemester();
  const { data: rounds } = useRoundsForSemester(semester?.id);
  const { data: majors } = useMajors();
  const addStudent = useAddEligibleStudent();

  const [roundId, setRoundId] = useState<number | undefined>(defaultRoundId);
  const [studentCode, setStudentCode] = useState('');
  const [fullName, setFullName] = useState('');
  const [className, setClassName] = useState('');
  const [email, setEmail] = useState('');
  const [majorId, setMajorId] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const isClassManuallyEdited = useRef(false);
  const isEmailManuallyEdited = useRef(false);

  useEffect(() => {
    if (open) {
      const initialRound =
        defaultRoundId && defaultRoundId > 0
          ? defaultRoundId
          : rounds?.[0]?.id;
      setRoundId(initialRound);
      setStudentCode('');
      setFullName('');
      setClassName('');
      setEmail('');
      setMajorId(null);
      setNote('');
      setError(null);
      isClassManuallyEdited.current = false;
      isEmailManuallyEdited.current = false;
    }
  }, [open, defaultRoundId, rounds]);

  function handleStudentCodeChange(val: string) {
    const cleanCode = val.trim();
    setStudentCode(cleanCode);
    if (!isEmailManuallyEdited.current) {
      setEmail(deriveEmailFromStudentCode(cleanCode));
    }

    const prefix = deriveClassPrefixFromStudentCode(cleanCode);
    if (
      prefix &&
      (!isClassManuallyEdited.current || className.startsWith('CTK'))
    ) {
      const suffix = className.replace(/^CTK\d*/i, '');
      setClassName(`${prefix}${suffix}`);
    }
  }

  const isValid =
    Boolean(roundId) &&
    studentCode.length === 7 &&
    /^\d{7}$/.test(studentCode) &&
    fullName.trim().length >= 2;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid || !roundId) return;

    setError(null);
    try {
      const result = await addStudent.mutateAsync({
        roundId,
        studentCode,
        fullName: normalizeFullName(fullName),
        class: className.trim() || undefined,
        email: email.trim() || undefined,
        majorId: majorId ?? undefined,
        note: note.trim() || undefined,
      });

      toast.success(
        result.createdAccount
          ? `Đã tạo tài khoản và thêm sinh viên ${result.fullName} vào đợt`
          : `Đã thêm sinh viên ${result.fullName} vào đợt`,
      );
      onOpenChange(false);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Không thể thêm sinh viên. Vui lòng thử lại.',
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold flex items-center gap-2">
            <UserPlus className="size-5 text-primary" />
            Thêm sinh viên vào đợt
          </DialogTitle>
          <DialogDescription className="sr-only">
            Nhập thông tin sinh viên để thêm vào danh sách đủ điều kiện của đợt
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <FormError message={error} />

          {/* Chọn đợt */}
          <div className="space-y-2">
            <Label htmlFor="add-round">Đợt đăng ký</Label>
            <Select
              value={roundId ? String(roundId) : undefined}
              onValueChange={(val) => setRoundId(Number(val))}
            >
              <SelectTrigger id="add-round" className={`w-full ${inputStyle}`}>
                <SelectValue placeholder="Chọn đợt đăng ký">
                  {(val) => {
                    if (!val) return 'Chọn đợt đăng ký';
                    const round = rounds?.find(
                      (r) => String(r.id) === String(val),
                    );
                    return round ? round.projectType.name : 'Chọn đợt đăng ký';
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {(rounds ?? []).map((r) => (
                  <SelectItem key={r.id} value={String(r.id)}>
                    {r.projectType.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Hàng 1: MSSV & Lớp */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="add-student-code">Mã sinh viên (MSSV)</Label>
              <Input
                id="add-student-code"
                placeholder="2212345"
                maxLength={7}
                autoFocus
                value={studentCode}
                onChange={(e) => handleStudentCodeChange(e.target.value)}
                className={inputStyle}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="add-class">Lớp</Label>
              <Input
                id="add-class"
                placeholder="CTK46PM"
                value={className}
                onChange={(e) => {
                  isClassManuallyEdited.current = true;
                  setClassName(e.target.value);
                }}
                className={inputStyle}
              />
            </div>
          </div>

          {/* Hàng 2: Họ và tên & Chuyên ngành */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="add-name">Họ và tên</Label>
              <Input
                id="add-name"
                placeholder="Nguyễn Văn A"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                onBlur={() => setFullName((prev) => normalizeFullName(prev))}
                className={inputStyle}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="add-major">Chuyên ngành</Label>
              <Select
                value={majorId ? String(majorId) : 'none'}
                onValueChange={(val) =>
                  setMajorId(!val || val === 'none' ? null : Number(val))
                }
              >
                <SelectTrigger id="add-major" className={`w-full ${inputStyle}`}>
                  <SelectValue>
                    {(val) => {
                      if (!val || val === 'none') return 'Không';
                      return (
                        majors?.find((m) => String(m.id) === String(val))?.name ??
                        'Không'
                      );
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Không</SelectItem>
                  {(majors ?? []).map((m) => (
                    <SelectItem key={m.id} value={String(m.id)}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Hàng 3: Email & Ghi chú */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="add-email">Email</Label>
              <Input
                id="add-email"
                type="email"
                placeholder="2212345@dlu.edu.vn"
                value={email}
                onChange={(e) => {
                  isEmailManuallyEdited.current = true;
                  setEmail(e.target.value);
                }}
                className={inputStyle}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="add-note">Ghi chú</Label>
              <Input
                id="add-note"
                placeholder="Bổ sung sau phúc khảo, học vượt..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={500}
                className={inputStyle}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={addStudent.isPending}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={!isValid || addStudent.isPending}
              className="gap-2 font-semibold shadow-xs"
            >
              {addStudent.isPending && (
                <Loader2 className="size-4 animate-spin" />
              )}
              Thêm sinh viên
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
