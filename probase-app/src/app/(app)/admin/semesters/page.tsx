'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  CalendarRange,
  CircleCheck,
  Loader2,
  Pencil,
  Plus,
  Settings2,
  Trash2,
} from 'lucide-react';
import {
  useActivateSemester,
  useCreateSemester,
  useDeleteSemester,
  useSemesters,
  useUpdateSemester,
} from '@/lib/api/master-data';
import type { Semester } from '@/lib/api/types';
import { useRequireRole } from '@/lib/auth/use-require-role';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { EmptyState } from '@/components/shared/empty-state';
import { StatusPill } from '@/components/shared/status-pill';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { SemesterDialog } from './semester-dialog';

const dateFormat = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

export default function SemestersPage() {
  const allowed = useRequireRole('ADMIN');
  const { data, isPending, error } = useSemesters();
  const create = useCreateSemester();
  const update = useUpdateSemester();
  const remove = useDeleteSemester();
  const activate = useActivateSemester();

  const [editing, setEditing] = useState<Semester | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Semester | null>(null);

  if (!allowed) return null;

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
                <TableHead className="w-44" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.map((semester) => (
                <TableRow key={semester.id}>
                  <TableCell className="font-medium">{semester.name}</TableCell>
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
                    {semester.isActive ? (
                      <StatusPill label="Đang mở" tone="success" />
                    ) : (
                      <StatusPill label="Đã đóng" tone="idle" />
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      {/*
                        The round plan is a destination rather than a dialog:
                        it is the longest form in the product, and it is what
                        somebody comes to this screen to reach.
                      */}
                      <Button
                        variant="ghost"
                        size="sm"
                        render={
                          <Link href={`/admin/semesters/${semester.id}`} />
                        }
                      >
                        <Settings2 />
                        Đợt đăng ký
                      </Button>
                      {!semester.isActive && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Mở ${semester.name}`}
                          disabled={activate.isPending}
                          onClick={() => activate.mutate(semester.id)}
                        >
                          <CircleCheck />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Sửa ${semester.name}`}
                        onClick={() => setEditing(semester)}
                      >
                        <Pencil />
                      </Button>
                      {/*
                        The open term is not offered for deletion. The API
                        refuses a semester with anything in it anyway, but this
                        one would take the whole product's default with it.
                      */}
                      {!semester.isActive && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Xoá ${semester.name}`}
                          onClick={() => setDeleting(semester)}
                        >
                          <Trash2 />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
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

      {activate.error && (
        <p className="text-sm text-destructive">{activate.error.message}</p>
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
