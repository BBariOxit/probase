'use client';

import * as React from 'react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, X } from 'lucide-react';
import {
  type CustomAssignmentItem,
  type PermissionDefinition,
  type SystemRoleInfo,
  useGrantPermission,
  usePermissionMatrix,
  useRevokePermission,
  useUpdateRolePermissions,
} from '@/lib/api/permissions';
import { useAdminLecturers } from '@/lib/api/lecturers';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const DEFAULT_ROLES: SystemRoleInfo[] = [
  { code: 'ADMIN', label: 'Giáo vụ', isLocked: true },
  { code: 'TTBM', label: 'Tổ trưởng Bộ môn', isLocked: false },
  { code: 'GVCN', label: 'GV Chủ nhiệm', isLocked: false },
  { code: 'LECTURER', label: 'Giảng viên', isLocked: false },
];

interface PermissionRowProps {
  perm: PermissionDefinition;
  roles: SystemRoleInfo[];
  matrixState: Record<string, string[]>;
  customAssignments: CustomAssignmentItem[];
  allLecturers: Array<{
    userId: number;
    fullName: string;
    major?: { name: string } | null;
  }>;
  onToggleRole: (
    role: SystemRoleInfo,
    perm: PermissionDefinition,
    currentChecked: boolean,
  ) => void;
  onGrant: (userId: number, perm: PermissionDefinition) => Promise<void>;
  onRevoke: (userId: number, perm: PermissionDefinition) => Promise<void>;
}

function PermissionRow({
  perm,
  roles,
  matrixState,
  customAssignments,
  allLecturers,
  onToggleRole,
  onGrant,
  onRevoke,
}: PermissionRowProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Danh sách giảng viên được cấp riêng cho quyền này
  const assigned = customAssignments.filter((ca) => ca.permission === perm.code);
  const assignedUserIds = new Set(assigned.map((a) => a.userId));

  // Giảng viên chưa có quyền riêng này (loại trừ các tài khoản đã được cấp)
  const availableLecturers = allLecturers.filter(
    (l) => !assignedUserIds.has(l.userId),
  );

  const handleGrantClick = async () => {
    if (!selectedUserId) {
      toast.error('Vui lòng chọn một giảng viên');
      return;
    }

    try {
      setIsSubmitting(true);
      await onGrant(Number(selectedUserId), perm);
      setSelectedUserId('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 py-4.5 sm:flex-row sm:items-start sm:justify-between">
      {/* Cột trái: Thông tin quyền, vai trò mặc định, và nhân sự được cấp riêng */}
      <div className="space-y-3 flex-1 min-w-0 pr-4">
        <div>
          <h3 className="font-semibold text-foreground text-sm tracking-tight">
            {perm.name}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            {perm.description}
          </p>
        </div>

        {/* Vai trò mặc định */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-1">
          <span className="text-[11px] font-medium text-muted-foreground">
            Vai trò mặc định:
          </span>
          {roles.map((r) => {
            const isChecked = r.isLocked
              ? true
              : (matrixState[r.code] || []).includes(perm.code);

            return (
              <label
                key={r.code}
                className={cn(
                  'inline-flex items-center gap-1.5 text-xs select-none transition-colors',
                  r.isLocked
                    ? 'opacity-60 cursor-not-allowed text-muted-foreground'
                    : 'cursor-pointer hover:text-foreground text-slate-700 dark:text-neutral-300',
                )}
              >
                <Checkbox
                  id={`role-${r.code}-${perm.code}`}
                  checked={isChecked}
                  disabled={r.isLocked}
                  onCheckedChange={() => onToggleRole(r, perm, isChecked)}
                />
                <span>{r.label}</span>
              </label>
            );
          })}
        </div>

        {/* Giảng viên ngoại lệ được cấp quyền riêng */}
        <div className="space-y-1.5 pt-1">
          <span className="text-[11px] font-medium text-muted-foreground">
            Giảng viên được cấp riêng:
          </span>
          {assigned.length === 0 ? (
            <p className="text-xs text-muted-foreground/60 italic">
              Chưa có giảng viên nào được cấp riêng quyền này.
            </p>
          ) : (
            <div className="flex flex-wrap items-center gap-1.5">
              {assigned.map((ca) => (
                <span
                  key={ca.userId}
                  className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 dark:border-neutral-700 bg-slate-100/90 dark:bg-neutral-800/90 px-2 py-0.5 text-xs text-foreground font-medium"
                >
                  <span>{ca.fullName}</span>
                  {ca.majorName && (
                    <span className="text-[10px] text-muted-foreground">
                      ({ca.majorName})
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => onRevoke(ca.userId, perm)}
                    className="hover:text-destructive text-muted-foreground cursor-pointer transition-colors p-0.5 -mr-0.5 rounded"
                    aria-label={`Thu hồi quyền từ ${ca.fullName}`}
                    title="Thu hồi quyền"
                  >
                    <X className="size-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Cột phải: Dropdown chọn giảng viên + Nút Cấp quyền (chuẩn phong cách Danger Zone/Transfer) */}
      {perm.code !== 'LECTURER_ROLE_ASSIGN' ? (
        <div className="flex items-center gap-2 shrink-0 pt-1 sm:pt-0">
          <Select
            value={selectedUserId}
            onValueChange={(val) => setSelectedUserId((val as string) ?? '')}
          >
            <SelectTrigger className="w-52 h-8.5 text-xs">
              <SelectValue>
                {(val) => {
                  if (!val) return 'Chọn giảng viên…';
                  const found = allLecturers.find(
                    (l) => String(l.userId) === String(val),
                  );
                  return found ? found.fullName : 'Chọn giảng viên…';
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {availableLecturers.length === 0 ? (
                <div className="p-2 text-center text-xs text-muted-foreground">
                  Tất cả giảng viên đã có quyền
                </div>
              ) : (
                availableLecturers.map((l) => (
                  <SelectItem
                    key={l.userId}
                    value={String(l.userId)}
                    className="text-xs"
                  >
                    {l.fullName} {l.major?.name ? `(${l.major.name})` : ''}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>

          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleGrantClick}
            disabled={!selectedUserId || isSubmitting}
            className="h-8.5 px-3 text-xs font-medium cursor-pointer"
          >
            {isSubmitting ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              'Cấp quyền'
            )}
          </Button>
        </div>
      ) : (
        <div className="text-[11px] text-muted-foreground italic shrink-0 pt-1">
          Chỉ dành riêng cho Giáo vụ Khoa
        </div>
      )}
    </div>
  );
}

export function RolePermissionMatrix() {
  const { data, isPending } = usePermissionMatrix();
  const updateRoleMutation = useUpdateRolePermissions();
  const grantMutation = useGrantPermission();
  const revokeMutation = useRevokePermission();

  // Lấy toàn bộ danh sách giảng viên để phục vụ dropdown chọn
  const { data: rosterData } = useAdminLecturers({ limit: 100 });
  const allLecturers = rosterData?.items ?? [];

  const [matrixState, setMatrixState] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (data?.matrix) {
      setMatrixState(data.matrix);
    }
  }, [data]);

  const roles =
    data?.roles && data.roles.length > 0 ? data.roles : DEFAULT_ROLES;
  const permissions = data?.permissions ?? [];
  const customAssignments = data?.customAssignments ?? [];

  const handleToggleRole = (
    role: SystemRoleInfo,
    perm: PermissionDefinition,
    currentChecked: boolean,
  ) => {
    if (role.isLocked) return;

    const currentPerms = matrixState[role.code] || [];
    const nextPerms = currentChecked
      ? currentPerms.filter((p) => p !== perm.code)
      : [...currentPerms, perm.code];

    setMatrixState((prev) => ({
      ...prev,
      [role.code]: nextPerms,
    }));

    updateRoleMutation.mutate(
      { role: role.code, permissions: nextPerms },
      {
        onSuccess: () => {
          toast.success(
            currentChecked
              ? `Đã thu hồi quyền "${perm.name}" từ vai trò ${role.label}.`
              : `Đã cấp quyền "${perm.name}" cho vai trò ${role.label}.`,
          );
        },
        onError: (err: any) => {
          toast.error(err?.message || 'Không thể lưu quyền hạn vai trò.');
          setMatrixState((prev) => ({
            ...prev,
            [role.code]: currentPerms,
          }));
        },
      },
    );
  };

  const handleGrant = async (userId: number, perm: PermissionDefinition) => {
    const lecturer = allLecturers.find((l) => l.userId === userId);
    const lecturerName = lecturer?.fullName ?? `Giảng viên ID ${userId}`;

    try {
      await grantMutation.mutateAsync({ userId, permission: perm.code });
      toast.success(`Đã cấp quyền "${perm.name}" cho ${lecturerName}.`);
    } catch (err: any) {
      toast.error(err?.message || 'Không thể cấp quyền cho giảng viên.');
    }
  };

  const handleRevoke = async (userId: number, perm: PermissionDefinition) => {
    const lecturer = allLecturers.find((l) => l.userId === userId);
    const lecturerName = lecturer?.fullName ?? `Giảng viên ID ${userId}`;

    try {
      await revokeMutation.mutateAsync({ userId, permission: perm.code });
      toast.success(`Đã thu hồi quyền "${perm.name}" từ ${lecturerName}.`);
    } catch (err: any) {
      toast.error(err?.message || 'Không thể thu hồi quyền từ giảng viên.');
    }
  };

  if (isPending) {
    return (
      <div className="space-y-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-slate-300 dark:border-neutral-800 bg-white dark:bg-[#1e1e1e] p-5 space-y-4"
          >
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ))}
      </div>
    );
  }

  // Gom nhóm quyền theo category (như Đợt đăng ký & Phân bổ, Quản lý đề tài, Quản trị hệ thống)
  const categories = Array.from(new Set(permissions.map((p) => p.category)));

  return (
    <div className="space-y-6">
      {categories.map((category) => {
        const categoryPerms = permissions.filter(
          (p) => p.category === category,
        );

        return (
          <div
            key={category}
            className="rounded-xl border border-slate-300 dark:border-neutral-800 bg-white dark:bg-[#1e1e1e] shadow-2xs overflow-hidden"
          >
            {/* Header của Khối nhóm nghiệp vụ */}
            <div className="border-b border-border/60 bg-slate-50/80 dark:bg-neutral-800/40 px-5 py-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground select-none">
                {category}
              </h2>
            </div>

            {/* Danh sách các quyền hạn trong khối */}
            <div className="divide-y divide-border/60 px-5">
              {categoryPerms.map((perm) => (
                <PermissionRow
                  key={perm.code}
                  perm={perm}
                  roles={roles}
                  matrixState={matrixState}
                  customAssignments={customAssignments}
                  allLecturers={allLecturers}
                  onToggleRole={handleToggleRole}
                  onGrant={handleGrant}
                  onRevoke={handleRevoke}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
