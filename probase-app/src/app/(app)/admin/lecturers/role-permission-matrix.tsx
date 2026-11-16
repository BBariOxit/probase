'use client';

import * as React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Plus, ShieldCheck, X } from 'lucide-react';
import {
  type CustomAssignmentItem,
  type PermissionDefinition,
  usePermissionMatrix,
  useRevokePermission,
  useUpdateRolePermissions,
  useUpdateUserPermissions,
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { UserAvatar } from '@/components/shared/user-avatar';
import { Skeleton } from '@/components/ui/skeleton';

const CONFIGURABLE_ROLES: Array<{
  code: 'TTBM' | 'GVCN' | 'LECTURER';
  label: string;
}> = [
  { code: 'TTBM', label: 'Tổ trưởng Bộ môn' },
  { code: 'GVCN', label: 'GV Chủ nhiệm' },
  { code: 'LECTURER', label: 'Giảng viên' },
];

export function RolePermissionMatrix() {
  const { data, isPending } = usePermissionMatrix();
  const updateRoleMutation = useUpdateRolePermissions();
  const updateUserPermsMutation = useUpdateUserPermissions();
  const revokeMutation = useRevokePermission();

  // Danh sách giảng viên để phục vụ chọn phân quyền
  const { data: rosterData } = useAdminLecturers({ limit: 100 });
  const allLecturers = rosterData?.items ?? [];

  // Lọc giảng viên có thể cấp quyền (loại bỏ Giáo vụ Khoa)
  const eligibleLecturers = useMemo(() => {
    return allLecturers.filter(
      (l) => l.userRole !== 'ADMIN' && l.assignedRole !== 'ADMIN',
    );
  }, [allLecturers]);

  const [matrixState, setMatrixState] = useState<Record<string, string[]>>({});

  // State cho Modal cấp/sửa quyền đặc biệt
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalUserId, setModalUserId] = useState<string>('');
  const [modalPerms, setModalPerms] = useState<string[]>([]);
  const [isSubmittingModal, setIsSubmittingModal] = useState(false);

  useEffect(() => {
    if (data?.matrix) {
      setMatrixState(data.matrix);
    }
  }, [data]);

  // Chỉ hiển thị các quyền nghiệp vụ có thể cấu hình
  const permissions = useMemo(() => {
    return (data?.permissions ?? []).filter(
      (p) => p.code !== 'LECTURER_ROLE_ASSIGN',
    );
  }, [data]);

  const customAssignments = data?.customAssignments ?? [];

  // Nhóm danh sách phân quyền đặc biệt theo từng Giảng viên
  const groupedDelegations = useMemo(() => {
    const map = new Map<
      number,
      {
        userId: number;
        fullName: string;
        email: string;
        lecturerCode: string;
        majorName?: string;
        permissions: Array<{ code: string; name: string }>;
      }
    >();

    for (const ca of customAssignments) {
      let entry = map.get(ca.userId);
      if (!entry) {
        entry = {
          userId: ca.userId,
          fullName: ca.fullName,
          email: ca.email,
          lecturerCode: ca.lecturerCode,
          majorName: ca.majorName,
          permissions: [],
        };
        map.set(ca.userId, entry);
      }
      const permDef = permissions.find((p) => p.code === ca.permission);
      entry.permissions.push({
        code: ca.permission,
        name: permDef?.name ?? ca.permission,
      });
    }

    return Array.from(map.values());
  }, [customAssignments, permissions]);

  // Thao tác bật/tắt quyền của Vai trò mặc định
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

  // Mở modal cấp/sửa quyền đặc biệt
  const handleOpenModal = (presetUserId?: number) => {
    if (presetUserId) {
      setModalUserId(String(presetUserId));
      const existing = groupedDelegations.find(
        (g) => g.userId === presetUserId,
      );
      setModalPerms(existing ? existing.permissions.map((p) => p.code) : []);
    } else {
      setModalUserId('');
      setModalPerms([]);
    }
    setIsModalOpen(true);
  };

  // Lưu quyền trong modal
  const handleSaveModal = async () => {
    if (!modalUserId) {
      toast.error('Vui lòng chọn giảng viên.');
      return;
    }

    const targetId = Number(modalUserId);
    const targetLecturer = eligibleLecturers.find((l) => l.userId === targetId);
    const targetName = targetLecturer?.fullName ?? `Giảng viên ID ${targetId}`;

    try {
      setIsSubmittingModal(true);
      await updateUserPermsMutation.mutateAsync({
        userId: targetId,
        permissions: modalPerms,
      });
      toast.success(`Đã cập nhật quyền đặc biệt cho ${targetName}.`);
      setIsModalOpen(false);
    } catch (err: any) {
      toast.error(err?.message || 'Không thể lưu quyền cho giảng viên.');
    } finally {
      setIsSubmittingModal(false);
    }
  };

  // Thu hồi nhanh 1 quyền đặc biệt qua nút X
  const handleQuickRevoke = async (
    userId: number,
    permissionCode: string,
    fullName: string,
    permissionName: string,
  ) => {
    try {
      await revokeMutation.mutateAsync({ userId, permission: permissionCode });
      toast.success(`Đã thu hồi quyền "${permissionName}" từ ${fullName}.`);
    } catch (err: any) {
      toast.error(err?.message || 'Không thể thu hồi quyền.');
    }
  };

  if (isPending) {
    return (
      <div className="space-y-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-slate-300/80 dark:border-neutral-800 bg-white dark:bg-[#18181b] p-5 space-y-4"
          >
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ))}
      </div>
    );
  }

  const categories = Array.from(new Set(permissions.map((p) => p.category)));

  return (
    <div className="space-y-8">
      {/* ============================================================ */}
      {/* KHỐI 1: QUYỀN HẠN THEO VAI TRÒ MẶC ĐỊNH (ROLE DEFAULTS)       */}
      {/* ============================================================ */}
      <div className="space-y-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-zinc-100 tracking-tight">
            Quyền hạn theo vai trò mặc định
          </h2>
        </div>

        {/* Các nhóm quyền theo danh mục */}
        <div className="space-y-6">
          {categories.map((category) => {
            const categoryPerms = permissions.filter(
              (p) => p.category === category,
            );

            return (
              <div key={category} className="space-y-2.5">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-400 select-none px-1">
                  {category}
                </span>

                <div className="rounded-xl border border-slate-300/80 dark:border-neutral-800 bg-white dark:bg-[#18181b] divide-y divide-slate-200 dark:divide-neutral-800 shadow-xs overflow-hidden">
                  {categoryPerms.map((perm) => (
                    <div
                      key={perm.code}
                      className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between hover:bg-slate-50/60 dark:hover:bg-neutral-800/30 transition-colors"
                    >
                      {/* Cột trái: Tên & mô tả */}
                      <div className="space-y-1 max-w-xl pr-4">
                        <h3 className="font-semibold text-slate-900 dark:text-zinc-100 text-base tracking-tight">
                          {perm.name}
                        </h3>
                        <p className="text-sm text-slate-600 dark:text-zinc-400 leading-normal">
                          {perm.description}
                        </p>
                      </div>

                      {/* Cột phải: Checkbox vai trò */}
                      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 shrink-0 select-none">
                        {CONFIGURABLE_ROLES.map((r) => {
                          const isChecked = (
                            matrixState[r.code] || []
                          ).includes(perm.code);
                          return (
                            <label
                              key={r.code}
                              className="inline-flex items-center gap-2.5 text-sm font-medium text-slate-800 dark:text-zinc-200 cursor-pointer transition-colors hover:text-primary"
                            >
                              <Checkbox
                                id={`role-${r.code}-${perm.code}`}
                                checked={isChecked}
                                onCheckedChange={() =>
                                  handleToggleRole(
                                    r.code,
                                    r.label,
                                    perm,
                                    isChecked,
                                  )
                                }
                              />
                              <span>{r.label}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ============================================================ */}
      {/* KHỐI 2: NHÂN SỰ ĐƯỢC CẤP QUYỀN ĐẶC BIỆT (CUSTOM DELEGATIONS)  */}
      {/* ============================================================ */}
      <div className="space-y-4 pt-6 border-t border-slate-200 dark:border-neutral-800">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-zinc-100 tracking-tight">
              Nhân sự được cấp quyền đặc biệt
            </h2>
          </div>

          {/* Nút xanh Primary nổi bật tạo điểm nhấn - Visual Anchor */}
          <Button
            type="button"
            onClick={() => handleOpenModal()}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm h-9 px-4 shadow-sm shadow-blue-500/20 cursor-pointer self-start sm:self-auto inline-flex items-center gap-2"
          >
            <Plus className="size-4" />
            Cấp quyền cho giảng viên
          </Button>
        </div>

        {/* Thẻ Card danh sách nhân sự */}
        {groupedDelegations.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 dark:border-neutral-800 bg-slate-50/60 dark:bg-neutral-900/30 py-10 px-4 text-center">
            <ShieldCheck className="size-9 mx-auto text-slate-400 dark:text-zinc-500 mb-2.5" />
            <p className="text-base font-semibold text-slate-800 dark:text-zinc-200">
              Chưa có giảng viên nào được cấp quyền đặc biệt
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenModal()}
              className="mt-4 text-sm h-9 px-4 cursor-pointer font-medium"
            >
              <Plus className="size-3.5 mr-1.5" />
              Cấp quyền đầu tiên
            </Button>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-300/80 dark:border-neutral-800 bg-white dark:bg-[#18181b] shadow-xs divide-y divide-slate-200 dark:divide-neutral-800 overflow-hidden">
            {groupedDelegations.map((item) => (
              <div
                key={item.userId}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 hover:bg-slate-50/60 dark:hover:bg-neutral-800/30 transition-colors"
              >
                {/* Giảng viên thông tin */}
                <div className="flex items-center gap-3.5 min-w-0">
                  <UserAvatar
                    name={item.fullName}
                    className="size-10 text-sm font-semibold shrink-0"
                  />
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900 dark:text-zinc-100 text-base truncate">
                        {item.fullName}
                      </span>
                      {item.majorName && (
                        <span className="text-xs font-medium text-slate-500 dark:text-zinc-400 truncate">
                          · {item.majorName}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-slate-500 dark:text-zinc-400 truncate">
                      {item.email}
                    </div>
                  </div>
                </div>

                {/* Badges các quyền được cấp + Thao tác */}
                <div className="flex flex-wrap items-center gap-2">
                  {item.permissions.map((p) => (
                    <span
                      key={p.code}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-500/15 px-3 py-1 text-sm font-medium text-blue-700 dark:text-blue-300"
                    >
                      <span>{p.name}</span>
                      <button
                        type="button"
                        onClick={() =>
                          handleQuickRevoke(
                            item.userId,
                            p.code,
                            item.fullName,
                            p.name,
                          )
                        }
                        className="hover:text-destructive text-blue-400 dark:text-blue-300 cursor-pointer transition-colors p-0.5 -mr-1 rounded hover:bg-destructive/10"
                        title={`Thu hồi quyền ${p.name}`}
                      >
                        <X className="size-3.5" />
                      </button>
                    </span>
                  ))}

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleOpenModal(item.userId)}
                    className="h-8 px-3 text-sm text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 cursor-pointer font-medium"
                  >
                    Chỉnh sửa
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* DIALOG: CẤP / CHỈNH SỬA QUYỀN ĐẶC BIỆT CHO GIẢNG VIÊN         */}
      {/* ============================================================ */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md p-6 space-y-4">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 dark:text-zinc-100">
              Cấp quyền đặc biệt cho giảng viên
            </DialogTitle>
          </DialogHeader>

          {/* Form nội dung */}
          <div className="space-y-4 pt-1">
            {/* Chọn giảng viên */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-900 dark:text-zinc-100">
                Giảng viên <span className="text-destructive">*</span>
              </label>
              <Select
                value={modalUserId}
                onValueChange={(val) => {
                  const uid = (val as string) ?? '';
                  setModalUserId(uid);
                  const existing = groupedDelegations.find(
                    (g) => String(g.userId) === uid,
                  );
                  setModalPerms(
                    existing ? existing.permissions.map((p) => p.code) : [],
                  );
                }}
              >
                <SelectTrigger className="w-full h-10 text-sm">
                  <SelectValue>
                    {(val) => {
                      if (!val) return 'Chọn giảng viên…';
                      const found = eligibleLecturers.find(
                        (l) => String(l.userId) === String(val),
                      );
                      return found
                        ? `${found.fullName} ${found.major?.name ? `(${found.major.name})` : ''}`
                        : 'Chọn giảng viên…';
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  {eligibleLecturers.map((l) => (
                    <SelectItem
                      key={l.userId}
                      value={String(l.userId)}
                      className="text-sm"
                    >
                      {l.fullName} {l.major?.name ? `(${l.major.name})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Chọn quyền */}
            <div className="space-y-2 pt-1">
              <label className="text-sm font-semibold text-slate-900 dark:text-zinc-100">
                Quyền hạn ủy quyền <span className="text-destructive">*</span>
              </label>
              <div className="space-y-2.5 rounded-lg border border-slate-200 dark:border-neutral-800 bg-slate-50/50 dark:bg-muted/20 p-3.5 max-h-60 overflow-y-auto">
                {permissions.map((p) => {
                  const isChecked = modalPerms.includes(p.code);
                  return (
                    <label
                      key={p.code}
                      className="flex items-start gap-3 text-sm text-slate-900 dark:text-zinc-100 cursor-pointer hover:bg-slate-100/70 dark:hover:bg-muted/40 p-2 rounded-md select-none transition-colors"
                    >
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setModalPerms((prev) => [...prev, p.code]);
                          } else {
                            setModalPerms((prev) =>
                              prev.filter((c) => c !== p.code),
                            );
                          }
                        }}
                        className="mt-0.5"
                      />
                      <div className="space-y-0.5">
                        <span className="font-semibold text-slate-900 dark:text-zinc-100 block text-sm">
                          {p.name}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-zinc-400 block leading-relaxed">
                          {p.description}
                        </span>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsModalOpen(false)}
              disabled={isSubmittingModal}
              className="text-sm h-9 px-4 cursor-pointer"
            >
              Hủy
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSaveModal}
              disabled={!modalUserId || isSubmittingModal}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm h-9 px-5 cursor-pointer shadow-xs"
            >
              {isSubmittingModal ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                'Lưu quyền'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
