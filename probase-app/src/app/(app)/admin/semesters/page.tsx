'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  CalendarRange,
  CircleOff,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Settings2,
  Trash2,
} from 'lucide-react';
import {
  useCreateSemester,
  useDeactivateSemester,
  useDeleteSemester,
  useSemesters,
  useUpdateSemester,
} from '@/lib/api/master-data';
import type { Semester } from '@/lib/api/types';
import { useRequireRole } from '@/lib/auth/use-require-role';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { EmptyState } from '@/components/shared/empty-state';
import { StatusPill, type StatusTone } from '@/components/shared/status-pill';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { SemesterDialog } from './semester-dialog';

const dateFormat = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

function getSemesterStatus(semester: Semester): {
  label: string;
  tone: StatusTone;
} {
  if (semester.isActive) {
    return { label: 'Đang mở', tone: 'success' };
  }
  const now = Date.now();
  const start = new Date(semester.startDate).getTime();
  const end = new Date(semester.endDate).getTime();

  if (!isNaN(start) && start > now) {
    return { label: 'Chưa mở', tone: 'active' };
  }
  if (!isNaN(end) && end < now) {
    return { label: 'Đã kết thúc', tone: 'idle' };
  }
  return { label: 'Đã đóng', tone: 'idle' };
}

function ActionMenuItem({
  icon: Icon,
  label,
  disabled,
  tooltip,
  variant,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  disabled?: boolean;
  tooltip?: string;
  variant?: 'default' | 'destructive';
  onClick?: () => void;
}) {
  const item = (
    <DropdownMenuItem
      variant={variant}
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
      className={cn(
        disabled && 'cursor-not-allowed opacity-50',
        variant === 'destructive' &&
          'text-destructive focus:text-destructive data-[disabled]:text-destructive data-[variant=destructive]:text-destructive',
      )}
    >
      <Icon className="size-4 shrink-0" />
      <span>{label}</span>
    </DropdownMenuItem>
  );

  if (disabled && tooltip) {
    return (
      <Tooltip>
        <TooltipTrigger
          render={
            <span className="block w-full cursor-not-allowed">{item}</span>
          }
        />
        <TooltipContent side="left">{tooltip}</TooltipContent>
      </Tooltip>
    );
  }

  return item;
}

export default function SemestersPage() {
  const allowed = useRequireRole('ADMIN');
  const { data, isPending, error } = useSemesters();
  const create = useCreateSemester();
  const update = useUpdateSemester();
  const remove = useDeleteSemester();
  const deactivate = useDeactivateSemester();

  const [editing, setEditing] = useState<Semester | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Semester | null>(null);
  const [closing, setClosing] = useState<Semester | null>(null);

  if (!allowed) return null;

  const now = Date.now();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end gap-3">
        <Button onClick={() => setEditing('new')}>
          <Plus />
          Thêm học kỳ
        </Button>
      </div>

      {error && (
        <p className="text-sm text-destructive">Không tải được danh sách.</p>
      )}

      <div className="overflow-hidden rounded-xl border">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-56">Học kỳ</TableHead>
                <TableHead className="w-56">Thời gian</TableHead>
                <TableHead className="w-40">Hạn nhập điểm</TableHead>
                <TableHead className="w-32">Trạng thái</TableHead>
                <TableHead className="w-[180px] text-right" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.map((semester) => {
                const start = new Date(semester.startDate).getTime();
                const isUpcoming =
                  !semester.isActive && !isNaN(start) && start > now;
                const isActive = semester.isActive;

                const canClose = isActive;
                const closeTooltip = canClose
                  ? undefined
                  : isUpcoming
                    ? 'Học kỳ chưa bắt đầu'
                    : 'Học kỳ đã kết thúc';

                const canDelete = isUpcoming;
                const deleteTooltip = canDelete
                  ? undefined
                  : isActive
                    ? 'Không thể xóa học kỳ đang diễn ra'
                    : 'Không thể xóa học kỳ đã kết thúc';

                return (
                  <TableRow key={semester.id}>
                    <TableCell className="font-medium">
                      {semester.name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {dateFormat.format(new Date(semester.startDate))} –{' '}
                      {dateFormat.format(new Date(semester.endDate))}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {semester.gradeSubmissionDeadline
                        ? dateFormat.format(
                            new Date(semester.gradeSubmissionDeadline),
                          )
                        : '—'}
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const { label, tone } = getSemesterStatus(semester);
                        return <StatusPill label={label} tone={tone} />;
                      })()}
                    </TableCell>
                    <TableCell className="w-[180px] text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          render={
                            <Link href={`/admin/semesters/${semester.id}`} />
                          }
                        >
                          <Settings2 className="size-4" />
                          Đợt đăng ký
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label={`Thao tác cho ${semester.name}`}
                              >
                                <MoreHorizontal className="size-4" />
                              </Button>
                            }
                          />
                          <DropdownMenuContent align="end" className="w-40">
                            <ActionMenuItem
                              icon={Pencil}
                              label="Chỉnh sửa"
                              onClick={() => setEditing(semester)}
                            />
                            <DropdownMenuSeparator />
                            <ActionMenuItem
                              icon={CircleOff}
                              label="Đóng đợt"
                              disabled={!canClose}
                              tooltip={closeTooltip}
                              variant="destructive"
                              onClick={() => setClosing(semester)}
                            />
                            <ActionMenuItem
                              icon={Trash2}
                              label="Xóa"
                              disabled={!canDelete}
                              tooltip={deleteTooltip}
                              variant="destructive"
                              onClick={() => setDeleting(semester)}
                            />
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {isPending && (
          <div className="flex justify-center py-14">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isPending && data?.length === 0 && (
          <EmptyState
            icon={CalendarRange}
            title="Chưa có học kỳ nào. Mọi thứ khác trong hệ thống đều bắt đầu từ đây."
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditing('new')}
              >
                <Plus />
                Thêm học kỳ đầu tiên
              </Button>
            }
          />
        )}
      </div>

      {deactivate.error && (
        <p className="text-sm text-destructive">{deactivate.error.message}</p>
      )}
      {remove.error && (
        <p className="text-sm text-destructive">{remove.error.message}</p>
      )}

      {editing && (
        <SemesterDialog
          semester={editing === 'new' ? null : editing}
          existingSemesters={data ?? []}
          onClose={() => setEditing(null)}
          onSubmit={(input) =>
            editing === 'new'
              ? create.mutateAsync(input)
              : update.mutateAsync({ ...input, id: editing.id })
          }
        />
      )}

      <ConfirmDialog
        open={closing !== null}
        onOpenChange={(open) => !open && setClosing(null)}
        title="Đóng đợt đăng ký?"
        description={`Học kỳ "${closing?.name}" sẽ được đóng lại. Sinh viên và giảng viên sẽ không thể đăng ký mới.`}
        confirmLabel="Đóng đợt"
        onConfirm={() => deactivate.mutateAsync(closing!.id)}
      />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Xoá học kỳ?"
        description={`"${deleting?.name}" sẽ bị xoá. Nếu học kỳ đã có đợt đăng ký hoặc đề tài thì hệ thống sẽ từ chối.`}
        confirmLabel="Xoá học kỳ"
        onConfirm={() => remove.mutateAsync(deleting!.id)}
      />
    </div>
  );
}
