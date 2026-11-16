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
  DialogDescription,
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
            className="rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#18181b] p-5 space-y-4"
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
    <div className="space-y-8">
      {/* ============================================================ */}
      {/* KHỐI 1: QUYỀN HẠN THEO VAI TRÒ MẶC ĐỊNH (ROLE DEFAULTS)       */}
      {/* ============================================================ */}
      <div className="space-y-5">
        <div>
          <h2 className="text-sm font-semibold text-foreground tracking-tight">
            Quyền hạn theo vai trò mặc định
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Cấu hình các quyền hạn được kích hoạt tự động theo chức vụ chuyên môn.
          </p>
        </div>

        {/* Các nhóm quyền theo danh mục */}
        <div className="space-y-5">
          {categories.map((category) => {
            const categoryPerms = permissions.filter(
              (p) => p.category === category,
            );

            return (
              <div key={category} className="space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground select-none px-1">
                  {category}
                </span>

                <div className="rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#18181b] divide-y divide-border/60 shadow-2xs overflow-hidden">
                  {categoryPerms.map((perm) => (
                    <div
                      key={perm.code}
                      className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      {/* Cột trái: Tên & mô tả */}
                      <div className="space-y-0.5 max-w-xl pr-4">
                        <h3 className="font-semibold text-foreground text-sm tracking-tight">
                          {perm.name}
                        </h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {perm.description}
                        </p>
                      </div>

                      {/* Cột phải: Checkbox vai trò */}
                      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 shrink-0 select-none">
                        {CONFIGURABLE_ROLES.map((r) => {
                          const isChecked = (
                            matrixState[r.code] || []
                          ).includes(perm.code);
                          return (
                            <label
                              key={r.code}
                              className="inline-flex items-center gap-2 text-xs font-medium text-foreground cursor-pointer transition-colors hover:text-foreground/80"
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
      <div className="space-y-4 pt-4 border-t border-border/60">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground tracking-tight">
              Nhân sự được cấp quyền đặc biệt
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Danh sách giảng viên được giao quyền riêng biệt ngoài chức vụ mặc định.
            </p>
          </div>

          {/* Nút xanh Primary nổi bật tạo điểm nhấn - Visual Anchor */}
          <Button
            type="button"
            onClick={() => handleOpenModal()}
            className="bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs h-8.5 px-3.5 shadow-sm shadow-blue-500/20 cursor-pointer self-start sm:self-auto inline-flex items-center gap-1.5"
          >
            <Plus className="size-3.5" />
            Cấp quyền cho giảng viên
          </Button>
        </div>

        {/* Thẻ Card danh sách nhân sự */}
        <div className="rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#18181b] shadow-2xs divide-y divide-border/60 overflow-hidden">
          {groupedDelegations.length === 0 ? (
            <div className="py-12 px-4 text-center">
              <ShieldCheck className="size-9 mx-auto text-muted-foreground/40 mb-2.5" />
              <p className="text-sm font-medium text-foreground">
                Chưa có giảng viên nào được cấp quyền đặc biệt
              </p>
              <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                Hệ thống hiện đang áp dụng quyền theo vai trò mặc định. Bạn có thể cấp thêm quyền riêng lẻ cho từng giảng viên bất kỳ lúc nào.
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenModal()}
                className="mt-4 text-xs h-8 cursor-pointer"
              >
                <Plus className="size-3 mr-1.5" />
                Cấp quyền đầu tiên
              </Button>
            </div>
          ) : (
            groupedDelegations.map((item) => (
              <div
                key={item.userId}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 hover:bg-muted/20 transition-colors"
              >
                {/* Giảng viên thông tin */}
                <div className="flex items-center gap-3 min-w-0">
                  <UserAvatar
                    name={item.fullName}
                    className="size-9 text-xs font-semibold shrink-0"
                  />
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground text-sm truncate">
                        {item.fullName}
                      </span>
                      {item.majorName && (
                        <span className="text-[11px] text-muted-foreground truncate">
                          ({item.majorName})
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {item.email}
                    </div>
                  </div>
                </div>

                {/* Badges các quyền được cấp + Thao tác */}
                <div className="flex flex-wrap items-center gap-2">
                  {item.permissions.map((p) => (
                    <span
                      key={p.code}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-blue-500/25 bg-blue-500/10 dark:bg-blue-500/15 px-2.5 py-1 text-xs font-medium text-blue-600 dark:text-blue-400"
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
                        <X className="size-3" />
                      </button>
                    </span>
                  ))}

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleOpenModal(item.userId)}
                    className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    Chỉnh sửa
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/* DIALOG: CẤP / CHỈNH SỬA QUYỀN ĐẶC BIỆT CHO GIẢNG VIÊN         */}
      {/* ============================================================ */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md p-5 space-y-4">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold text-foreground">
              Cấp quyền đặc biệt cho giảng viên
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Chọn giảng viên và đánh dấu các quyền hạn bạn muốn ủy quyền trực tiếp.
            </DialogDescription>
          </DialogHeader>

          {/* Form nội dung */}
          <div className="space-y-4 pt-1">
            {/* Chọn giảng viên */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
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
                <SelectTrigger className="w-full h-9 text-xs">
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
                      className="text-xs"
                    >
                      {l.fullName} {l.major?.name ? `(${l.major.name})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Chọn quyền */}
            <div className="space-y-2 pt-1">
              <label className="text-xs font-semibold text-foreground">
                Quyền hạn ủy quyền <span className="text-destructive">*</span>
              </label>
              <div className="space-y-2 rounded-lg border border-border/60 bg-muted/20 p-3 max-h-56 overflow-y-auto">
                {permissions.map((p) => {
                  const isChecked = modalPerms.includes(p.code);
                  return (
                    <label
                      key={p.code}
                      className="flex items-start gap-2.5 text-xs text-foreground cursor-pointer hover:bg-muted/40 p-1.5 rounded-md select-none transition-colors"
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
                        <span className="font-medium text-foreground block">
                          {p.name}
                        </span>
                        <span className="text-[11px] text-muted-foreground block">
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
              className="text-xs h-8 cursor-pointer"
            >
              Hủy
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSaveModal}
              disabled={!modalUserId || isSubmittingModal}
              className="bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs h-8 px-4 cursor-pointer shadow-xs"
            >
              {isSubmittingModal ? (
                <Loader2 className="size-3.5 animate-spin" />
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
