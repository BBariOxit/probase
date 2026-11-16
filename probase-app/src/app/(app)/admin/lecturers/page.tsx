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
  useAdminLecturers,
  useUpdateLecturerRole,
} from '@/lib/api/lecturers';
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

const ROLE_FILTERS = [
  { value: 'ALL', label: 'Tất cả vai trò' },
  { value: 'LECTURER', label: 'Giảng viên' },
  { value: 'TTBM', label: 'Tổ trưởng Bộ môn' },
  { value: 'GVCN', label: 'Giáo viên chủ nhiệm' },
  { value: 'ADMIN', label: 'Giáo vụ' },
];

const ROLES: Array<{
  value: AssignedLecturerRole;
  label: string;
}> = [
  { value: 'LECTURER', label: 'Giảng viên' },
  { value: 'TTBM', label: 'Tổ trưởng Bộ môn' },
  { value: 'GVCN', label: 'Giáo viên chủ nhiệm' },
  { value: 'ADMIN', label: 'Giáo vụ' },
];

function RoleText({ role }: { role: AssignedLecturerRole }) {
  switch (role) {
    case 'ADMIN':
      return <span className="font-semibold text-rose-600 dark:text-rose-400">Giáo vụ</span>;
    case 'TTBM':
      return <span className="font-semibold text-sky-600 dark:text-sky-400">Tổ trưởng Bộ môn</span>;
    case 'GVCN':
      return <span className="font-semibold text-amber-600 dark:text-amber-400">Giáo viên chủ nhiệm</span>;
    case 'LECTURER':
    default:
      return <span className="font-medium text-foreground">Giảng viên</span>;
  }
}

interface LecturerRoleCellProps {
  lecturer: AdminLecturerItem;
  isSelf: boolean;
  majors?: Array<{ id: number; name: string }>;
}

function LecturerRoleCell({ lecturer, isSelf, majors }: LecturerRoleCellProps) {
  const [open, setOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<AssignedLecturerRole>(lecturer.assignedRole);
  const [selectedMajorId, setSelectedMajorId] = useState<string>(
    lecturer.major?.id ? String(lecturer.major.id) : majors?.[0]?.id ? String(majors[0].id) : '',
  );

  const updateMutation = useUpdateLecturerRole();

  if (isSelf) {
    return <RoleText role={lecturer.assignedRole} />;
  }

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      setSelectedRole(lecturer.assignedRole);
      setSelectedMajorId(
        lecturer.major?.id
          ? String(lecturer.major.id)
          : majors?.[0]?.id
            ? String(majors[0].id)
            : '',
      );
    }
  };

  const handleSave = async () => {
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
      setOpen(false);
    } catch (err: any) {
      toast.error(err?.message || 'Không thể cập nhật vai trò.');
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        render={
          <button
            type="button"
            className="group inline-flex items-center gap-1.5 rounded-md px-2 py-1 -ml-2 text-xs font-semibold transition-colors hover:bg-slate-100 dark:hover:bg-neutral-800/80 cursor-pointer"
            aria-label={`Đổi vai trò cho ${lecturer.fullName}`}
          />
        }
      >
        <RoleText role={lecturer.assignedRole} />
        <ChevronDown className="size-3 text-muted-foreground/60 transition-transform group-hover:text-foreground" />
      </PopoverTrigger>

      <PopoverContent
        align="start"
        side="bottom"
        className="w-64 p-3 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#1e1e1e] shadow-xl text-xs space-y-3"
      >
        <div className="flex items-center justify-between pb-2 border-b border-border/60">
          <span className="font-semibold text-foreground">Đổi vai trò</span>
          <span className="text-[11px] text-muted-foreground truncate max-w-32">{lecturer.fullName}</span>
        </div>

        {/* Danh sách vai trò */}
        <div className="space-y-1">
          {ROLES.map((r) => {
            const active = selectedRole === r.value;
            return (
              <button
                key={r.value}
                type="button"
                onClick={() => setSelectedRole(r.value)}
                className={cn(
                  'flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors text-left cursor-pointer',
                  active
                    ? 'bg-primary/10 text-primary font-semibold dark:bg-primary/20'
                    : 'text-foreground hover:bg-muted/60',
                )}
              >
                <span>{r.label}</span>
                {active && <Check className="size-3.5 text-primary shrink-0" />}
              </button>
            );
          })}
        </div>

        {/* Nếu là TTBM -> chọn bộ môn */}
        {selectedRole === 'TTBM' && (
          <div className="space-y-1.5 pt-2 border-t border-border/60">
            <span className="text-[11px] font-medium text-muted-foreground">
              Bộ môn phụ trách <span className="text-destructive">*</span>
            </span>
            <Select
              value={selectedMajorId}
              onValueChange={(val) => setSelectedMajorId((val as string) ?? '')}
            >
              <SelectTrigger className="w-full h-8 text-xs">
                <SelectValue>
                  {(val) => majors?.find((m) => String(m.id) === String(val))?.name ?? 'Chọn bộ môn…'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {majors?.map((m) => (
                  <SelectItem key={m.id} value={String(m.id)} className="text-xs">
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Nút hành động */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setOpen(false)}
            disabled={updateMutation.isPending}
            className="h-7 px-2.5 text-xs"
          >
            Hủy
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className="h-7 px-3 text-xs"
          >
            {updateMutation.isPending ? (
              <Loader2 className="size-3 animate-spin" />
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

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);

  const [selectedRole, setSelectedRole] = useState('ALL');
  const [selectedMajorId, setSelectedMajorId] = useState('ALL');
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const { data: majors } = useMajors();
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

  const isFiltered = search !== '' || selectedRole !== 'ALL' || selectedMajorId !== 'ALL';

  return (
    <div className="space-y-6">
      {/* Tiêu đề trang */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
          Phân quyền
        </h1>
      </div>

      {/* Thanh bộ lọc */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-52 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Tìm theo tên hoặc email…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-8 text-xs h-9"
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
          <SelectTrigger className="w-44 h-9 text-xs font-medium" aria-label="Lọc theo vai trò">
            <SelectValue>
              {(val) => ROLE_FILTERS.find((opt) => opt.value === val)?.label ?? 'Tất cả vai trò'}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {ROLE_FILTERS.map((r) => (
              <SelectItem key={r.value} value={r.value} className="text-xs">
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
          <SelectTrigger className="w-48 h-9 text-xs font-medium" aria-label="Lọc theo bộ môn">
            <SelectValue>
              {(val) => {
                if (!val || val === 'ALL') return 'Tất cả bộ môn';
                const found = majors?.find((m) => String(m.id) === String(val));
                return found ? found.name : 'Tất cả bộ môn';
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL" className="text-xs">
              Tất cả bộ môn
            </SelectItem>
            {majors?.map((m) => (
              <SelectItem key={m.id} value={String(m.id)} className="text-xs">
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
            className="h-9 px-2.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="mr-1.5 size-3.5" />
            Đặt lại
          </Button>
        )}

        {data && (
          <div className="ml-auto text-xs font-medium text-slate-600 dark:text-neutral-400 select-none">
            Tổng cộng: <strong className="font-semibold text-foreground">{data.total}</strong> giảng viên
          </div>
        )}
      </div>

      {/* Bảng danh sách */}
      <div className="flex-auto min-h-0 flex flex-col rounded-xl border border-slate-300 dark:border-neutral-700 bg-white dark:bg-[#1e1e1e] shadow-2xs overflow-hidden">
        <div className="flex-auto min-h-0 overflow-auto">
          <Table containerClassName="overflow-visible" className="relative w-full min-w-[700px] text-left text-xs">
            <TableHeader sticky>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-12 text-center text-xs">STT</TableHead>
                <TableHead className="text-xs">Giảng viên</TableHead>
                <TableHead className="text-xs">Email & SĐT</TableHead>
                <TableHead className="text-xs">Bộ môn</TableHead>
                <TableHead className="text-xs">Vai trò / Chức vụ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isPending ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i} className="text-xs">
                    <TableCell className="text-center">
                      <Skeleton className="mx-auto size-4" />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Skeleton className="size-8 rounded-full" />
                        <div className="space-y-1">
                          <Skeleton className="h-4 w-32" />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-40" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell>
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
                    <TableRow key={lecturer.id} className="text-xs">
                      <TableCell className="text-center font-mono text-muted-foreground">
                        {stt}
                      </TableCell>

                      {/* Giảng viên */}
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <UserAvatar
                            name={lecturer.fullName}
                            src={lecturer.avatarUrl}
                            className="size-8 text-xs font-semibold"
                          />
                          <div className="font-semibold text-foreground">
                            {lecturer.academicTitle ? `${lecturer.academicTitle} ` : ''}
                            {lecturer.fullName}
                          </div>
                        </div>
                      </TableCell>

                      {/* Email & Phone */}
                      <TableCell>
                        <div className="space-y-0.5">
                          <div className="text-foreground">{lecturer.email}</div>
                          {lecturer.phone && (
                            <div className="font-mono text-[11px] text-muted-foreground">
                              {lecturer.phone}
                            </div>
                          )}
                        </div>
                      </TableCell>

                      {/* Bộ môn */}
                      <TableCell>
                        {lecturer.major ? (
                          <span className="text-foreground">
                            {lecturer.major.name}
                          </span>
                        ) : (
                          <span className="text-muted-foreground italic">Chưa phân</span>
                        )}
                      </TableCell>

                      {/* Vai trò / Chức vụ - Click mở Popover đổi nhanh tại chỗ */}
                      <TableCell>
                        <LecturerRoleCell
                          lecturer={lecturer}
                          isSelf={isSelf}
                          majors={majors}
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
    </div>
  );
}
