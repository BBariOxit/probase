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

const CONFIGURABLE_ROLES: Array<{
  code: 'TTBM' | 'GVCN' | 'LECTURER';
  label: string;
}> = [
  { code: 'TTBM', label: 'Tổ trưởng Bộ môn' },
  { code: 'GVCN', label: 'GV Chủ nhiệm' },
  { code: 'LECTURER', label: 'Giảng viên' },
];

interface PermissionRowProps {
  perm: PermissionDefinition;
  matrixState: Record<string, string[]>;
  customAssignments: CustomAssignmentItem[];
  allLecturers: Array<{
    userId: number;
    fullName: string;
    major?: { name: string } | null;
  }>;
  onToggleRole: (
    roleCode: string,
    roleLabel: string,
    perm: PermissionDefinition,
    currentChecked: boolean,
  ) => void;
  onGrant: (userId: number, perm: PermissionDefinition) => Promise<void>;
  onRevoke: (userId: number, perm: PermissionDefinition) => Promise<void>;
}

function PermissionRow({
  perm,
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

  // Giảng viên chưa có quyền riêng này
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
    <div className="flex flex-col gap-3.5 py-4 sm:flex-row sm:items-start sm:justify-between">
      {/* Cột trái: Tên quyền, mô tả ngắn, vai trò được áp dụng, và nhân sự cấp thêm (nếu có) */}
      <div className="space-y-2 flex-1 min-w-0 pr-4">
        <div>
          <h3 className="font-semibold text-foreground text-sm tracking-tight">
            {perm.name}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            {perm.description}
          </p>
        </div>

        {/* Cấu hình vai trò & nhân sự cấp thêm trên một hàng súc tích */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-0.5">
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-muted-foreground font-medium select-none">
              Vai trò:
            </span>
            {CONFIGURABLE_ROLES.map((r) => {
              const isChecked = (matrixState[r.code] || []).includes(perm.code);
              return (
                <label
                  key={r.code}
                  className="inline-flex items-center gap-1.5 text-xs text-foreground cursor-pointer select-none transition-colors hover:text-foreground/80"
                >
                  <Checkbox
                    id={`role-${r.code}-${perm.code}`}
                    checked={isChecked}
                    onCheckedChange={() =>
                      onToggleRole(r.code, r.label, perm, isChecked)
                    }
                  />
                  <span>{r.label}</span>
                </label>
              );
            })}
          </div>

          {/* Chỉ hiển thị khi CÓ giảng viên được cấp thêm */}
          {assigned.length > 0 && (
            <div className="flex items-center gap-2 pl-3 border-l border-border/60">
              <span className="text-[11px] text-muted-foreground font-medium select-none">
                Cấp thêm:
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                {assigned.map((ca) => (
                  <span
                    key={ca.userId}
                    className="inline-flex items-center gap-1 rounded-md border border-slate-200 dark:border-neutral-700 bg-slate-100 dark:bg-neutral-800 px-2 py-0.5 text-xs text-foreground font-medium"
                  >
                    <span>{ca.fullName}</span>
                    {ca.majorName && (
                      <span className="text-[10px] text-muted-foreground font-normal">
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
            </div>
          )}
        </div>
      </div>

      {/* Cột phải: Chọn giảng viên + Nút Cấp quyền */}
      <div className="flex items-center gap-2 shrink-0 pt-0.5 sm:pt-0">
        <Select
          value={selectedUserId}
          onValueChange={(val) => setSelectedUserId((val as string) ?? '')}
        >
          <SelectTrigger className="w-48 h-8 text-xs">
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
          className="h-8 px-3 text-xs font-medium cursor-pointer"
        >
          {isSubmitting ? (
            <Loader2 className="size-3 animate-spin" />
          ) : (
            'Cấp quyền'
          )}
        </Button>
      </div>
    </div>
  );
}

export function RolePermissionMatrix() {
  const { data, isPending } = usePermissionMatrix();
  const updateRoleMutation = useUpdateRolePermissions();
  const grantMutation = useGrantPermission();
  const revokeMutation = useRevokePermission();

  // Danh sách giảng viên để phục vụ dropdown chọn
  const { data: rosterData } = useAdminLecturers({ limit: 100 });
  const allLecturers = rosterData?.items ?? [];

  const [matrixState, setMatrixState] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (data?.matrix) {
      setMatrixState(data.matrix);
    }
  }, [data]);

  // Chỉ hiển thị các quyền nghiệp vụ có thể cấu hình và phân quyền
  const permissions = (data?.permissions ?? []).filter(
    (p) => p.code !== 'LECTURER_ROLE_ASSIGN',
  );
  const customAssignments = data?.customAssignments ?? [];

  const handleToggleRole = (
    roleCode: string,
    roleLabel: string,
    perm: PermissionDefinition,
    currentChecked: boolean,
  ) => {
    const currentPerms = matrixState[roleCode] || [];
    const nextPerms = currentChecked
      ? currentPerms.filter((p) => p !== perm.code)
      : [...currentPerms, perm.code];

    setMatrixState((prev) => ({
      ...prev,
      [roleCode]: nextPerms,
    }));

    updateRoleMutation.mutate(
      { role: roleCode, permissions: nextPerms },
      {
        onSuccess: () => {
          toast.success(
            currentChecked
              ? `Đã thu hồi quyền "${perm.name}" từ ${roleLabel}.`
              : `Đã cấp quyền "${perm.name}" cho ${roleLabel}.`,
          );
        },
        onError: (err: any) => {
          toast.error(err?.message || 'Không thể lưu quyền hạn vai trò.');
          setMatrixState((prev) => ({
            ...prev,
            [roleCode]: currentPerms,
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
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ))}
      </div>
    );
  }

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
            <div className="border-b border-border/60 bg-slate-50/60 dark:bg-neutral-800/30 px-5 py-3">
              <h2 className="text-xs font-semibold tracking-normal text-muted-foreground select-none">
                {category}
              </h2>
            </div>

            {/* Danh sách các quyền hạn trong khối */}
            <div className="divide-y divide-border/60 px-5">
              {categoryPerms.map((perm) => (
                <PermissionRow
                  key={perm.code}
                  perm={perm}
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
