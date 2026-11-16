'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Lock } from 'lucide-react';
import {
  type PermissionDefinition,
  type SystemRoleInfo,
  usePermissionMatrix,
  useUpdateRolePermissions,
} from '@/lib/api/permissions';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export function RolePermissionMatrix() {
  const { data, isPending } = usePermissionMatrix();
  const updateMutation = useUpdateRolePermissions();

  const [matrixState, setMatrixState] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (data?.matrix) {
      setMatrixState(data.matrix);
    }
  }, [data]);

  const handleToggle = (
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

    updateMutation.mutate(
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

  if (isPending) {
    return (
      <div className="flex-auto min-h-0 flex flex-col rounded-xl border border-slate-300 dark:border-neutral-700 bg-white dark:bg-[#1e1e1e] shadow-2xs overflow-hidden p-6 space-y-4">
        <Skeleton className="h-6 w-48" />
        <div className="space-y-3 pt-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>
    );
  }

  const permissions = data?.permissions ?? [];
  const roles = data?.roles ?? [];

  // Gom nhóm quyền theo category
  const categories = Array.from(new Set(permissions.map((p) => p.category)));

  return (
    <div className="flex-auto min-h-0 flex flex-col rounded-xl border border-slate-300 dark:border-neutral-700 bg-white dark:bg-[#1e1e1e] shadow-2xs overflow-hidden">
      <div className="flex-auto min-h-0 overflow-auto">
        <Table
          containerClassName="overflow-visible"
          className="relative w-full min-w-[760px] text-left text-xs"
        >
          <TableHeader sticky>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[42%] text-xs font-semibold">
                Tính năng & Nghiệp vụ
              </TableHead>
              {roles.map((r) => (
                <TableHead
                  key={r.code}
                  className="w-[14.5%] text-center text-xs font-semibold"
                >
                  <div className="inline-flex items-center justify-center gap-1">
                    <span>{r.label}</span>
                    {r.isLocked && (
                      <Lock className="size-3 text-muted-foreground/70" />
                    )}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((category) => {
              const categoryPerms = permissions.filter(
                (p) => p.category === category,
              );

              return (
                <tbody key={category} className="group/section">
                  {/* Category Banner Row */}
                  <TableRow className="bg-slate-50/80 dark:bg-neutral-800/40 hover:bg-slate-50/80 dark:hover:bg-neutral-800/40 border-y border-border/60">
                    <TableCell
                      colSpan={1 + roles.length}
                      className="py-1.5 px-4 font-semibold text-[11px] uppercase tracking-wider text-muted-foreground select-none"
                    >
                      {category}
                    </TableCell>
                  </TableRow>

                  {/* Rows for each permission in this category */}
                  {categoryPerms.map((perm) => (
                    <TableRow key={perm.code} className="text-xs hover:bg-muted/40">
                      <TableCell className="py-3 px-4">
                        <div className="space-y-0.5">
                          <div className="font-semibold text-foreground">
                            {perm.name}
                          </div>
                          <div className="text-[11px] text-muted-foreground leading-normal">
                            {perm.description}
                          </div>
                        </div>
                      </TableCell>

                      {roles.map((role) => {
                        const isChecked = role.isLocked
                          ? true
                          : (matrixState[role.code] || []).includes(perm.code);

                        return (
                          <TableCell
                            key={role.code}
                            className="py-3 px-2 text-center align-middle"
                          >
                            <div className="flex items-center justify-center">
                              <Checkbox
                                id={`${role.code}-${perm.code}`}
                                checked={isChecked}
                                disabled={role.isLocked}
                                onCheckedChange={() =>
                                  handleToggle(role, perm, isChecked)
                                }
                                aria-label={`Quyền ${perm.name} cho vai trò ${role.label}`}
                              />
                            </div>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </tbody>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
