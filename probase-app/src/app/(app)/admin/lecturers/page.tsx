'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import {
  Check,
  ChevronDown,
  Loader2,
  RotateCcw,
  Search,
  UserCheck,
} from 'lucide-react';
import { useDebouncedValue } from '@/lib/use-debounced-value';
import { useRequireRole } from '@/lib/auth/use-require-role';
import { useSession } from '@/lib/auth/session';
import { useMajors } from '@/lib/api/majors';
import {
  type AdminLecturerItem,
  type AssignedLecturerRole,
  type AssignableLecturerRole,
  useAdminLecturers,
  useUpdateLecturerRole,
} from '@/lib/api/lecturers';
import {
  getRoleInheritedPermissions,
  usePermissionMatrix,
} from '@/lib/api/permissions';
import { Checkbox } from '@/components/ui/checkbox';
import { EmptyState } from '@/components/shared/empty-state';
import { PaginationBar } from '@/components/shared/pagination-bar';
import { UserAvatar } from '@/components/shared/user-avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { RolePermissionMatrix } from './role-permission-matrix';

const ROLE_FILTERS = [
  { value: 'ALL', label: 'Tất cả vai trò' },
  { value: 'LECTURER', label: 'Giảng viên' },
  { value: 'TTBM', label: 'Tổ trưởng Bộ môn' },
  { value: 'GVCN', label: 'Giáo viên chủ nhiệm' },
  { value: 'ADMIN', label: 'Giáo vụ' },
];

const ASSIGNABLE_ROLES: Array<{
  value: AssignableLecturerRole;
  label: string;
}> = [
  { value: 'LECTURER', label: 'Giảng viên' },
  { value: 'TTBM', label: 'Tổ trưởng Bộ môn' },
  { value: 'GVCN', label: 'Giáo viên chủ nhiệm' },
];

const AVAILABLE_CUSTOM_PERMISSIONS = [
  {
    code: 'TOPIC_REGISTRY',
    label: 'Quản lý đợt đăng ký đề tài',
  },
  {
    code: 'STUDENT_ALLOCATION',
    label: 'Phân bổ sinh viên & Chốt đợt',
  },
  {
    code: 'TOPIC_REVIEW_DEPT',
    label: 'Thẩm định đề tài cấp Bộ môn',
  },
  {
    code: 'TOPIC_SIGN_OFF',
    label: 'Phê duyệt & Công bố Khoa',
  },
];

function RoleText({ role }: { role: AssignedLecturerRole }) {
  switch (role) {
    case 'ADMIN':
      return (
        <span className="font-semibold text-rose-600 dark:text-rose-400">
          Giáo vụ
        </span>
      );
    case 'TTBM':
      return (
        <span className="font-semibold text-sky-600 dark:text-sky-400">
          Tổ trưởng Bộ môn
        </span>
      );
    case 'GVCN':
      return (
        <span className="font-semibold text-amber-600 dark:text-amber-400">
          Giáo viên chủ nhiệm
        </span>
      );
    case 'LECTURER':
    default:
      return <span className="font-medium text-foreground">Giảng viên</span>;
  }
}

interface LecturerRoleCellProps {
  lecturer: AdminLecturerItem;
  isSelf: boolean;
  majors?: Array<{ id: number; name: string }>;
  matrix?: Record<string, string[]>;
}

function LecturerRoleCell({
  lecturer,
  isSelf,
  majors,
  matrix,
}: LecturerRoleCellProps) {
  const [open, setOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<AssignableLecturerRole>(
    lecturer.assignedRole === 'ADMIN' ? 'LECTURER' : lecturer.assignedRole,
  );
  const [selectedMajorId, setSelectedMajorId] = useState<string>(
    lecturer.major?.id
      ? String(lecturer.major.id)
      : majors?.[0]?.id
        ? String(majors[0].id)
        : '',
  );
  const [selectedCustomPerms, setSelectedCustomPerms] = useState<string[]>(
    lecturer.customPermissions ?? [],
  );

  const updateMutation = useUpdateLecturerRole();

  if (isSelf || lecturer.assignedRole === 'ADMIN') {
    return (
      <div className="inline-flex items-center">
        <RoleText role={lecturer.assignedRole} />
      </div>
    );
  }

  const roleInheritedPerms = getRoleInheritedPermissions(matrix, selectedRole);
  const currentInheritedPerms = getRoleInheritedPermissions(
    matrix,
    lecturer.assignedRole,
  );

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      const initialRole: AssignableLecturerRole =
        lecturer.assignedRole === 'ADMIN' ? 'LECTURER' : lecturer.assignedRole;
      const initialInherited = getRoleInheritedPermissions(matrix, initialRole);
      setSelectedRole(initialRole);
      setSelectedMajorId(
        lecturer.major?.id
          ? String(lecturer.major.id)
          : majors?.[0]?.id
            ? String(majors[0].id)
            : '',
      );
      setSelectedCustomPerms(
        (lecturer.customPermissions ?? []).filter(
          (c) => !initialInherited.has(c),
        ),
      );
    }
  };

  const handleSave = async () => {
    if (selectedRole === 'TTBM' && !selectedMajorId) {
      toast.error('Vui lòng chọn Bộ môn cho Tổ trưởng Bộ môn.');
      return;
    }

    const customOnlyPerms = selectedCustomPerms.filter(
      (c) => !roleInheritedPerms.has(c),
    );

    try {
      await updateMutation.mutateAsync({
        userId: lecturer.userId,
        assignedRole: selectedRole,
        majorId: selectedMajorId
          ? Number(selectedMajorId)
          : (lecturer.major?.id ?? null),
        customPermissions: customOnlyPerms,
      });
      toast.success(`Đã cập nhật vai trò và quyền hạn cho ${lecturer.fullName}.`);
      setOpen(false);
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : 'Không thể cập nhật vai trò.',
      );
    }
  };

  const customCount = (lecturer.customPermissions ?? []).filter(
    (c) => !currentInheritedPerms.has(c),
  ).length;

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        render={
          <button
            type="button"
            className="group inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 -ml-2 text-sm font-semibold transition-colors hover:bg-slate-100 dark:hover:bg-neutral-800/80 cursor-pointer"
            aria-label={`Đổi vai trò cho ${lecturer.fullName}`}
          />
        }
      >
        <div className="inline-flex items-center">
          <RoleText role={lecturer.assignedRole} />
          {customCount > 0 && (
            <span className="text-xs font-normal text-muted-foreground ml-1.5">
              (+{customCount} quyền)
            </span>
          )}
        </div>
        <ChevronDown className="size-3.5 text-muted-foreground/60 transition-transform group-hover:text-foreground shrink-0" />
      </PopoverTrigger>

      <PopoverContent
        align="start"
        side="bottom"
        className="w-80 sm:w-[350px] p-4 rounded-2xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#1e1e1e] shadow-2xl space-y-3.5"
      >
        <div className="flex items-center justify-between pb-2.5 border-b border-border/60">
          <span className="text-sm font-bold text-foreground">Phân quyền vai trò</span>
          <span className="text-xs font-medium text-muted-foreground bg-muted/70 px-2 py-0.5 rounded-md truncate max-w-44">
            {lecturer.fullName}
          </span>
        </div>

        {/* Danh sách vai trò chính */}
        <div className="space-y-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Vai trò chính
          </span>
          {ASSIGNABLE_ROLES.map((r) => {
            const active = selectedRole === r.value;
            return (
              <button
                key={r.value}
                type="button"
                onClick={() => {
                  setSelectedRole(r.value);
                  const nextInherited = getRoleInheritedPermissions(
                    matrix,
                    r.value,
                  );
                  setSelectedCustomPerms((prev) =>
                    prev.filter((c) => !nextInherited.has(c)),
                  );
                }}
                className={cn(
                  'flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors text-left cursor-pointer',
                  active
                    ? 'bg-primary/10 text-primary font-semibold dark:bg-primary/20'
                    : 'text-foreground hover:bg-muted/60',
                )}
              >
                <span>{r.label}</span>
                {active && <Check className="size-4 text-primary shrink-0" />}
              </button>
            );
          })}
        </div>

        {/* Chọn bộ môn trực thuộc / phụ trách */}
        <div className="space-y-1.5 pt-2.5 border-t border-border/60">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {selectedRole === 'TTBM' ? (
              <>
                Bộ môn phụ trách (Tổ trưởng) <span className="text-destructive">*</span>
              </>
            ) : (
              <>Bộ môn trực thuộc</>
            )}
          </span>
          <Select
            value={selectedMajorId}
            onValueChange={(val) => setSelectedMajorId((val as string) ?? '')}
          >
            <SelectTrigger className="w-full h-9.5 text-sm">
              <SelectValue>
                {(val) =>
                  majors?.find((m) => String(m.id) === String(val))?.name ??
                  'Chọn bộ môn…'
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {majors?.map((m) => (
                <SelectItem key={m.id} value={String(m.id)} className="text-sm">
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Quyền bổ sung cho cá nhân */}
        <div className="space-y-2 pt-2.5 border-t border-border/60">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Quyền bổ sung cho cá nhân
            </span>
            {selectedCustomPerms.length > 0 && (
              <button
                type="button"
                onClick={() => setSelectedCustomPerms([])}
                className="text-xs font-medium text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
              >
                Bỏ chọn
              </button>
            )}
          </div>
          <div className="space-y-1">
            {AVAILABLE_CUSTOM_PERMISSIONS.map((perm) => {
              const isFromRole = roleInheritedPerms.has(perm.code);
              const isChecked =
                isFromRole || selectedCustomPerms.includes(perm.code);
              return (
                <label
                  key={perm.code}
                  className={cn(
                    'flex items-center justify-between gap-2 text-sm text-foreground py-1.5 px-2 rounded-lg select-none transition-colors',
                    isFromRole
                      ? 'opacity-75 cursor-not-allowed'
                      : 'cursor-pointer hover:bg-muted/50',
                  )}
                >
                  <span className="flex items-center gap-3 min-w-0">
                    <Checkbox
                      id={`override-${lecturer.id}-${perm.code}`}
                      checked={isChecked}
                      disabled={isFromRole}
                      onCheckedChange={(checked) => {
                        if (isFromRole) return;
                        if (checked) {
                          setSelectedCustomPerms((prev) =>
                            prev.includes(perm.code)
                              ? prev
                              : [...prev, perm.code],
                          );
                        } else {
                          setSelectedCustomPerms((prev) =>
                            prev.filter((c) => c !== perm.code),
                          );
                        }
                      }}
                    />
                    <span className="truncate font-medium">{perm.label}</span>
                  </span>
                  {isFromRole && (
                    <span className="shrink-0 rounded bg-slate-200/80 dark:bg-neutral-800 px-1.5 py-0.5 text-[11px] font-medium text-slate-600 dark:text-neutral-400">
                      Từ vai trò
                    </span>
                  )}
                </label>
              );
            })}
          </div>
        </div>

        {/* Nút hành động */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border/60">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setOpen(false)}
            disabled={updateMutation.isPending}
            className="h-8.5 px-3 text-sm font-medium"
          >
            Hủy
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className="h-8.5 px-4 text-sm font-semibold shadow-xs"
          >
            {updateMutation.isPending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              'Lưu'
            )}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default function AdminLecturersRolePage() {
  const allowed = useRequireRole('ADMIN');
  const currentUserId = useSession((s) => s.user?.id);

  // Tab state: 'roster' (Danh sách giảng viên) hoặc 'matrix' (Vai trò & Quyền hạn)
  const [activeTab, setActiveTab] = useState<'roster' | 'matrix'>('roster');

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);

  const [selectedRole, setSelectedRole] = useState('ALL');
  const [selectedMajorId, setSelectedMajorId] = useState('ALL');
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const { data: majors } = useMajors();
  const { data: permissionMatrix } = usePermissionMatrix();
  const { data, isPending } = useAdminLecturers({
    q: debouncedSearch || undefined,
    role: selectedRole !== 'ALL' ? selectedRole : undefined,
    majorId: selectedMajorId !== 'ALL' ? Number(selectedMajorId) : undefined,
    page,
    limit: pageSize,
  });

  if (!allowed) return null;

  const lecturers = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  const handleResetFilters = () => {
    setSearch('');
    setSelectedRole('ALL');
    setSelectedMajorId('ALL');
    setPage(1);
  };

  const isFiltered =
    search !== '' || selectedRole !== 'ALL' || selectedMajorId !== 'ALL';

  return (
    <div className="space-y-6">
      {/* Tiêu đề trang tích hợp đồng thời làm Tab điều hướng */}
      <div className="flex items-center gap-8 border-b border-border/60 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('roster')}
          className={cn(
            'group inline-flex items-center gap-2 pb-0.5 text-xl font-bold tracking-tight transition-colors cursor-pointer relative',
            activeTab === 'roster'
              ? 'text-foreground after:absolute after:-bottom-3.5 after:left-0 after:right-0 after:h-[3px] after:rounded-full after:bg-primary'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          Giảng viên
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('matrix')}
          className={cn(
            'group inline-flex items-center gap-2 pb-0.5 text-xl font-bold tracking-tight transition-colors cursor-pointer relative',
            activeTab === 'matrix'
              ? 'text-foreground after:absolute after:-bottom-3.5 after:left-0 after:right-0 after:h-[3px] after:rounded-full after:bg-primary'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          Vai trò & Quyền hạn
        </button>
      </div>

      {activeTab === 'matrix' ? (
        <RolePermissionMatrix />
      ) : (
        <>
          {/* Thanh bộ lọc */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-56 flex-1 sm:max-w-xs">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Tìm theo tên hoặc email…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9 text-sm h-9.5 rounded-lg border-slate-300 dark:border-neutral-700 bg-white dark:bg-[#1e1e1e]"
              />
            </div>

            {/* Lọc theo vai trò */}
            <Select
              value={selectedRole}
              onValueChange={(val) => {
                setSelectedRole((val as string) ?? 'ALL');
                setPage(1);
              }}
            >
              <SelectTrigger
                className="w-48 h-9.5 text-sm font-medium"
                aria-label="Lọc theo vai trò"
              >
                <SelectValue>
                  {(val) =>
                    ROLE_FILTERS.find((opt) => opt.value === val)?.label ??
                    'Tất cả vai trò'
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {ROLE_FILTERS.map((r) => (
                  <SelectItem key={r.value} value={r.value} className="text-sm">
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Lọc theo bộ môn */}
            <Select
              value={selectedMajorId}
              onValueChange={(val) => {
                setSelectedMajorId((val as string) ?? 'ALL');
                setPage(1);
              }}
            >
              <SelectTrigger
                className="w-52 h-9.5 text-sm font-medium"
                aria-label="Lọc theo bộ môn"
              >
                <SelectValue>
                  {(val) => {
                    if (!val || val === 'ALL') return 'Tất cả bộ môn';
                    const found = majors?.find(
                      (m) => String(m.id) === String(val),
                    );
                    return found ? found.name : 'Tất cả bộ môn';
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL" className="text-sm">
                  Tất cả bộ môn
                </SelectItem>
                {majors?.map((m) => (
                  <SelectItem
                    key={m.id}
                    value={String(m.id)}
                    className="text-sm"
                  >
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {isFiltered && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="h-9.5 px-3 text-sm text-muted-foreground hover:text-foreground cursor-pointer font-medium"
              >
                <RotateCcw className="mr-1.5 size-4" />
                Đặt lại
              </Button>
            )}

            {data && (
              <div className="ml-auto text-sm font-medium text-slate-600 dark:text-neutral-400 select-none">
                Tổng cộng:{' '}
                <strong className="font-semibold text-foreground">
                  {data.total}
                </strong>{' '}
                giảng viên
              </div>
            )}
          </div>

          {/* Bảng danh sách */}
          <div className="flex-auto min-h-0 flex flex-col rounded-xl border border-slate-300 dark:border-neutral-700 bg-white dark:bg-[#1e1e1e] shadow-2xs overflow-hidden">
            <div className="flex-auto min-h-0 overflow-auto">
              <Table
                containerClassName="overflow-visible"
                className="relative w-full min-w-[700px] text-left text-sm"
              >
                <TableHeader sticky>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-14 px-3 text-center text-xs font-bold tracking-wider uppercase">
                      STT
                    </TableHead>
                    <TableHead className="px-4 text-xs font-bold tracking-wider uppercase">
                      Giảng viên
                    </TableHead>
                    <TableHead className="px-4 text-xs font-bold tracking-wider uppercase">
                      Email & SĐT
                    </TableHead>
                    <TableHead className="px-4 text-xs font-bold tracking-wider uppercase">
                      Bộ môn
                    </TableHead>
                    <TableHead className="px-4 text-xs font-bold tracking-wider uppercase">
                      Vai trò / Chức vụ
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isPending ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i} className="text-sm">
                        <TableCell className="px-3 py-3 text-center">
                          <Skeleton className="mx-auto size-4" />
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Skeleton className="size-9 rounded-full" />
                            <div className="space-y-1">
                              <Skeleton className="h-4 w-32" />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <Skeleton className="h-4 w-40" />
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <Skeleton className="h-4 w-24" />
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <Skeleton className="h-4 w-28" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : lecturers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-48 text-center">
                        <EmptyState
                          icon={UserCheck}
                          title={
                            isFiltered
                              ? 'Không tìm thấy giảng viên nào phù hợp bộ lọc.'
                              : 'Chưa có dữ liệu giảng viên.'
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ) : (
                    lecturers.map((lecturer, index) => {
                      const stt = (page - 1) * pageSize + index + 1;
                      const isSelf = currentUserId === lecturer.userId;

                      return (
                        <TableRow key={lecturer.id} className="text-sm hover:bg-slate-50/80 dark:hover:bg-[#252528] transition-colors">
                          <TableCell className="px-3 py-3 text-center font-mono text-sm text-muted-foreground">
                            {stt}
                          </TableCell>

                          {/* Giảng viên */}
                          <TableCell className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <UserAvatar
                                name={lecturer.fullName}
                                src={lecturer.avatarUrl}
                                className="size-9 text-sm font-semibold"
                              />
                              <div className="font-semibold text-foreground text-sm">
                                {lecturer.academicTitle
                                  ? `${lecturer.academicTitle} `
                                  : ''}
                                {lecturer.fullName}
                              </div>
                            </div>
                          </TableCell>

                          {/* Email & Phone */}
                          <TableCell className="px-4 py-3">
                            <div className="space-y-0.5">
                              <div className="text-sm text-foreground">
                                {lecturer.email}
                              </div>
                              {lecturer.phone && (
                                <div className="font-mono text-xs text-muted-foreground">
                                  {lecturer.phone}
                                </div>
                              )}
                            </div>
                          </TableCell>

                          {/* Bộ môn */}
                          <TableCell className="px-4 py-3">
                            {lecturer.major ? (
                              <span className="text-sm text-foreground font-medium">
                                {lecturer.major.name}
                              </span>
                            ) : (
                              <span className="text-sm text-muted-foreground italic">
                                Chưa phân
                              </span>
                            )}
                          </TableCell>

                          {/* Vai trò / Chức vụ - Click mở Popover đổi nhanh tại chỗ */}
                          <TableCell className="px-4 py-3">
                            <LecturerRoleCell
                              lecturer={lecturer}
                              isSelf={isSelf}
                              majors={majors}
                              matrix={permissionMatrix?.matrix}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Phân trang */}
          <div className="shrink-0">
            <PaginationBar
              page={page}
              totalPages={totalPages}
              total={total}
              pageSize={pageSize}
              itemName="giảng viên"
              onPageChange={setPage}
            />
          </div>
        </>
      )}
    </div>
  );
}
