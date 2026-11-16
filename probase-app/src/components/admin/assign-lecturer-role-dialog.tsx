'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { useMajors } from '@/lib/api/majors';
import {
  type AdminLecturerItem,
  type AssignedLecturerRole,
  useUpdateLecturerRole,
} from '@/lib/api/lecturers';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface AssignLecturerRoleDialogProps {
  lecturer: AdminLecturerItem | null;
  onClose: () => void;
}

const ROLES: Array<{
  value: AssignedLecturerRole;
  label: string;
  description: string;
}> = [
  {
    value: 'LECTURER',
    label: 'Giảng viên',
    description: 'Ra đề tài, hướng dẫn và chấm điểm tiến độ nhóm sinh viên',
  },
  {
    value: 'TTBM',
    label: 'Tổ trưởng Bộ môn (TTBM)',
    description: 'Thẩm định và phê duyệt đề tài của giảng viên trong bộ môn',
  },
  {
    value: 'GVCN',
    label: 'Giáo viên chủ nhiệm (GVCN)',
    description: 'Mở đăng ký đề tài và phân bổ sinh viên vào nhóm sau chốt đợt',
  },
  {
    value: 'ADMIN',
    label: 'Giáo vụ (Quản trị)',
    description: 'Quản trị hệ thống, quản lý tài khoản và danh mục học kỳ',
  },
];

export function AssignLecturerRoleDialog({
  lecturer,
  onClose,
}: AssignLecturerRoleDialogProps) {
  const [selectedRole, setSelectedRole] = useState<AssignedLecturerRole>('LECTURER');
  const [selectedMajorId, setSelectedMajorId] = useState<string>('');

  const { data: majors } = useMajors();
  const updateMutation = useUpdateLecturerRole();

  useEffect(() => {
    if (lecturer) {
      setSelectedRole(lecturer.assignedRole);
      setSelectedMajorId(
        lecturer.major?.id ? String(lecturer.major.id) : majors?.[0]?.id ? String(majors[0].id) : '',
      );
    }
  }, [lecturer, majors]);

  if (!lecturer) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedRole === 'TTBM' && !selectedMajorId) {
      toast.error('Vui lòng chọn Bộ môn cho Tổ trưởng Bộ môn.');
      return;
    }

    try {
      await updateMutation.mutateAsync({
        userId: lecturer.userId,
        assignedRole: selectedRole,
        majorId: selectedMajorId ? Number(selectedMajorId) : null,
      });
      toast.success(`Đã cập nhật vai trò cho ${lecturer.fullName}.`);
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Không thể cập nhật vai trò.');
    }
  };

  return (
    <Dialog open={!!lecturer} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Phân quyền</DialogTitle>
          <DialogDescription className="sr-only">
            Thiết lập vai trò cho giảng viên
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Thông tin giảng viên */}
          <div className="rounded-lg bg-muted/50 p-3 text-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Giảng viên:</span>
              <span className="font-semibold text-foreground">
                {lecturer.academicTitle ? `${lecturer.academicTitle} ` : ''}
                {lecturer.fullName}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Mã GV:</span>
              <span className="font-mono text-foreground">{lecturer.lecturerCode}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Email:</span>
              <span className="text-foreground">{lecturer.email}</span>
            </div>
          </div>

          {/* Chọn vai trò */}
          <div className="space-y-2">
            <Label htmlFor="role-select" className="text-xs font-medium">
              Vai trò / Chức vụ
            </Label>
            <div className="space-y-2">
              {ROLES.map((r) => {
                const checked = selectedRole === r.value;
                return (
                  <label
                    key={r.value}
                    className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                      checked
                        ? 'border-primary/50 bg-primary/5 dark:bg-primary/10'
                        : 'border-border hover:bg-muted/30'
                    }`}
                  >
                    <input
                      type="radio"
                      name="lecturerRole"
                      value={r.value}
                      checked={checked}
                      onChange={() => setSelectedRole(r.value)}
                      className="mt-0.5 size-4 text-primary accent-primary"
                    />
                    <div className="space-y-0.5 text-xs">
                      <div className="font-medium text-foreground">{r.label}</div>
                      <div className="text-muted-foreground">{r.description}</div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Chọn Bộ môn nếu là TTBM hoặc muốn gắn bộ môn */}
          {(selectedRole === 'TTBM' || majors) && (
            <div className="space-y-1.5 pt-1">
              <Label className="text-xs font-medium">
                Bộ môn trực thuộc {selectedRole === 'TTBM' && <span className="text-destructive">*</span>}
              </Label>
              <Select value={selectedMajorId} onValueChange={setSelectedMajorId}>
                <SelectTrigger className="w-full text-xs h-9">
                  <SelectValue placeholder="Chọn bộ môn..." />
                </SelectTrigger>
                <SelectContent>
                  {majors?.map((m) => (
                    <SelectItem key={m.id} value={String(m.id)} className="text-xs">
                      {m.name} ({m.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedRole === 'TTBM' && (
                <p className="text-[11px] text-muted-foreground">
                  * Mỗi bộ môn chỉ có 1 Tổ trưởng Bộ môn. Bổ nhiệm mới sẽ thay thế TTBM hiện tại của bộ môn này.
                </p>
              )}
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={updateMutation.isPending}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending && (
                <Loader2 className="mr-2 size-3.5 animate-spin" />
              )}
              Lưu thay đổi
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

