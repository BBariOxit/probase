'use client';

import { useState } from 'react';
import {
  GraduationCap,
  Loader2,
  MoreHorizontal,
  RotateCcw,
  Search,
  ShieldCheck,
  UserCheck,
  UserCog,
} from 'lucide-react';
import { useDebouncedValue } from '@/lib/use-debounced-value';
import { useRequireRole } from '@/lib/auth/use-require-role';
import { useSession } from '@/lib/auth/session';
import { useMajors } from '@/lib/api/majors';
import {
  type AdminLecturerItem,
  type AssignedLecturerRole,
  useAdminLecturers,
} from '@/lib/api/lecturers';
import { AssignLecturerRoleDialog } from '@/components/admin/assign-lecturer-role-dialog';
import { EmptyState } from '@/components/shared/empty-state';
import { PaginationBar } from '@/components/shared/pagination-bar';
import { UserAvatar } from '@/components/shared/user-avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
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

const ROLE_FILTERS = [
  { value: 'ALL', label: 'Tất cả vai trò' },
  { value: 'LECTURER', label: 'Giảng viên' },
  { value: 'TTBM', label: 'Tổ trưởng Bộ môn' },
  { value: 'GVCN', label: 'GV Chủ nhiệm' },
  { value: 'ADMIN', label: 'Giáo vụ' },
];

function RoleText({ role, majorCode }: { role: AssignedLecturerRole; majorCode?: string | null }) {
  switch (role) {
    case 'ADMIN':
      return <span className="font-semibold text-rose-600 dark:text-rose-400">Giáo vụ</span>;
    case 'TTBM':
      return (
        <span className="font-semibold text-sky-600 dark:text-sky-400">
          Tổ trưởng BM {majorCode ? `(${majorCode})` : ''}
        </span>
      );
    case 'GVCN':
      return <span className="font-semibold text-amber-600 dark:text-amber-400">GV Chủ nhiệm</span>;
    case 'LECTURER':
    default:
      return <span className="font-medium text-slate-600 dark:text-slate-400">Giảng viên</span>;
  }
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

  const [assigningLecturer, setAssigningLecturer] = useState<AdminLecturerItem | null>(null);

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
            placeholder="Tìm theo tên, email, mã GV…"
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
                return found ? `${found.name} (${found.code})` : 'Tất cả bộ môn';
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL" className="text-xs">
              Tất cả bộ môn
            </SelectItem>
            {majors?.map((m) => (
              <SelectItem key={m.id} value={String(m.id)} className="text-xs">
                {m.name} ({m.code})
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
      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-12 text-center text-xs">STT</TableHead>
              <TableHead className="text-xs">Giảng viên</TableHead>
              <TableHead className="text-xs">Email & SĐT</TableHead>
              <TableHead className="text-xs">Bộ môn</TableHead>
              <TableHead className="text-xs">Vai trò / Chức vụ</TableHead>
              <TableHead className="w-16 text-right text-xs">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell className="text-center">
                    <Skeleton className="mx-auto size-4" />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Skeleton className="size-8 rounded-full" />
                      <div className="space-y-1">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-20" />
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
                  <TableCell className="text-right">
                    <Skeleton className="ml-auto size-8 rounded-md" />
                  </TableCell>
                </TableRow>
              ))
            ) : lecturers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-48 text-center">
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
                        <div className="space-y-0.5">
                          <div className="font-semibold text-foreground">
                            {lecturer.academicTitle ? `${lecturer.academicTitle} ` : ''}
                            {lecturer.fullName}
                            {isSelf && (
                              <span className="ml-2 text-[11px] font-normal text-muted-foreground">
                                (Bạn)
                              </span>
                            )}
                          </div>
                          <div className="font-mono text-[11px] text-muted-foreground">
                            {lecturer.lecturerCode}
                          </div>
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
                          {lecturer.major.name}{' '}
                          <span className="text-muted-foreground font-mono">
                            ({lecturer.major.code})
                          </span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground italic">Chưa phân</span>
                      )}
                    </TableCell>

                    {/* Chữ có màu ở role để biết (ko dùng badge màu) */}
                    <TableCell>
                      <RoleText
                        role={lecturer.assignedRole}
                        majorCode={lecturer.major?.code}
                      />
                    </TableCell>

                    {/* Dấu 3 chấm để thao tác */}
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 p-0"
                              aria-label="Thao tác"
                            >
                              <MoreHorizontal className="size-4" />
                            </Button>
                          }
                        />
                        <DropdownMenuContent align="end" className="text-xs">
                          {isSelf ? (
                            <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                              Không thể tự đổi vai trò của bạn
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() => setAssigningLecturer(lecturer)}
                              className="text-xs cursor-pointer"
                            >
                              <UserCog className="mr-2 size-3.5" />
                              Phân quyền vai trò
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        {/* Phân trang */}
        {total > pageSize && (
          <div className="border-t p-3">
            <PaginationBar
              page={page}
              totalPages={totalPages}
              total={total}
              pageSize={pageSize}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>

      {/* Dialog phân quyền */}
      {assigningLecturer && (
        <AssignLecturerRoleDialog
          lecturer={assigningLecturer}
          onClose={() => setAssigningLecturer(null)}
        />
      )}
    </div>
  );
}

