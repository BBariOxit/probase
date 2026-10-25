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
import { ApiError } from '@/lib/api/client';
import {
  useActivateSemester,
  useCreateSemester,
  useDeleteSemester,
  useSemesters,
  useUpdateSemester,
  type SemesterInput,
} from '@/lib/api/master-data';
import type { Semester } from '@/lib/api/types';
import { useRequireRole } from '@/lib/auth/use-require-role';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { DateField } from '@/components/shared/date-field';
import { EmptyState } from '@/components/shared/empty-state';
import { FormError } from '@/components/shared/form-error';
import { StatusPill } from '@/components/shared/status-pill';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const dateFormat = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

function toDateInput(iso: string | null): string {
  return iso ? iso.slice(0, 10) : '';
}

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

function SemesterDialog({
  semester,
  onClose,
  onSubmit,
}: {
  semester: Semester | null;
  onClose: () => void;
  onSubmit: (input: SemesterInput) => Promise<unknown>;
}) {
  const [name, setName] = useState(semester?.name ?? '');
  const [code, setCode] = useState(semester?.code ?? '');
  const [startDate, setStartDate] = useState(
    toDateInput(semester?.startDate ?? null),
  );
  const [endDate, setEndDate] = useState(
    toDateInput(semester?.endDate ?? null),
  );
  const [gradeDeadline, setGradeDeadline] = useState(
    toDateInput(semester?.gradeSubmissionDeadline ?? null),
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const ordered = startDate !== '' && endDate !== '' && endDate > startDate;
  const ready = name.trim() !== '' && code.trim() !== '' && ordered;

  async function submit() {
    setPending(true);
    setError(null);
    try {
      await onSubmit({
        name: name.trim(),
        code: code.trim(),
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        // Null rather than omitted, so clearing the box actually clears the
        // field — an omitted key on a PATCH means "leave it alone".
        gradeSubmissionDeadline: gradeDeadline
          ? new Date(gradeDeadline).toISOString()
          : null,
      });
      onClose();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Không kết nối được máy chủ',
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open onOpenChange={(next) => !next && !pending && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{semester ? 'Sửa học kỳ' : 'Thêm học kỳ'}</DialogTitle>
          <DialogDescription className="sr-only">
            Thêm hoặc sửa học kỳ
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <FormError message={error} />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="semester-name">Tên học kỳ</Label>
              <Input
                id="semester-name"
                autoFocus
                maxLength={100}
                placeholder="Học kỳ 1 năm học 2026-2027"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="semester-code">Mã</Label>
              <Input
                id="semester-code"
                className="uppercase"
                maxLength={20}
                placeholder="HK1-2026-2027"
                value={code}
                onChange={(event) => setCode(event.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <DateField
              id="semester-start"
              label="Bắt đầu"
              value={startDate}
              onChange={setStartDate}
            />
            <DateField
              id="semester-end"
              label="Kết thúc"
              value={endDate}
              onChange={setEndDate}
              invalid={endDate !== '' && !ordered}
              error={
                endDate !== '' && !ordered
                  ? 'Ngày kết thúc phải sau ngày bắt đầu.'
                  : undefined
              }
            />
          </div>

          <DateField
            id="semester-grade"
            label="Hạn nhập điểm"
            hint="Không bắt buộc. Để trống nếu khoa chưa chốt."
            className="w-48"
            value={gradeDeadline}
            onChange={setGradeDeadline}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" disabled={pending} onClick={onClose}>
            Huỷ
          </Button>
          <Button disabled={!ready || pending} onClick={submit}>
            {pending && <Loader2 className="animate-spin" />}
            {semester ? 'Lưu' : 'Thêm'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
