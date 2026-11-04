'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { ApiError } from '@/lib/api/client';
import type { SemesterInput } from '@/lib/api/master-data';
import type { Semester } from '@/lib/api/types';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// Constant / TODO note for grade deadline rule relative to endDate.
// Currently, grade deadline must be >= startDate.
// If future academic regulations strictly require grade deadline >= endDate, set this to false.
export const GRADE_DEADLINE_ALLOW_BEFORE_END_DATE = true;

/**
 * Pure function to automatically generate semester code from its Vietnamese name.
 * Rule: "Học kỳ N năm học YYYY-YYYY" (or with en-dash) -> "HKN-YYYY-YYYY"
 */
export function generateSemesterCode(name: string): string | null {
  const trimmed = name.trim();
  const match = trimmed.match(
    /^Học\s+kỳ\s+(\d+)\s+năm\s+học\s+(\d{4})\s*[-–]\s*(\d{4})$/i,
  );
  if (!match) return null;
  return `HK${match[1]}-${match[2]}-${match[3]}`;
}

/**
 * Pure function to find date overlaps between the given date range and existing semesters.
 * Returns an array of existing semesters whose date intervals intersect with [startDate, endDate].
 */
export function findOverlaps(
  range: { startDate?: string | null; endDate?: string | null },
  existing: Semester[] = [],
  excludeId?: number,
): Semester[] {
  if (!range.startDate || !range.endDate || range.endDate <= range.startDate)
    return [];
  const start = new Date(range.startDate).getTime();
  const end = new Date(range.endDate).getTime();
  if (isNaN(start) || isNaN(end)) return [];

  return existing.filter((sem) => {
    if (excludeId !== undefined && sem.id === excludeId) return false;
    const semStart = new Date(sem.startDate).getTime();
    const semEnd = new Date(sem.endDate).getTime();
    if (isNaN(semStart) || isNaN(semEnd)) return false;

    // Two intervals [start, end] and [semStart, semEnd] overlap if:
    return start <= semEnd && end >= semStart;
  });
}

/**
 * Creates the Zod validation schema for the semester form.
 */
export const createSemesterFormSchema = (
  existingSemesters: Semester[] = [],
  currentSemesterId?: number,
) =>
  z
    .object({
      name: z
        .string({ error: 'Vui lòng nhập tên học kỳ' })
        .trim()
        .min(1, 'Vui lòng nhập tên học kỳ')
        .max(100, 'Tên học kỳ tối đa 100 ký tự'),
      code: z
        .string({ error: 'Vui lòng nhập mã học kỳ' })
        .trim()
        .toUpperCase()
        .min(1, 'Vui lòng nhập mã học kỳ')
        .max(30, 'Mã học kỳ tối đa 30 ký tự')
        .regex(
          /^[A-Z0-9-]+$/,
          'Mã chỉ cho phép chữ hoa, số và dấu gạch ngang (-)',
        ),
      startDate: z
        .string({ error: 'Vui lòng chọn ngày bắt đầu' })
        .min(1, 'Vui lòng chọn ngày bắt đầu'),
      endDate: z
        .string({ error: 'Vui lòng chọn ngày kết thúc' })
        .min(1, 'Vui lòng chọn ngày kết thúc'),
      gradeDeadline: z.string().optional().nullable(),
    })
    .superRefine((data, ctx) => {
      // endDate must be AFTER startDate
      if (data.startDate && data.endDate && data.endDate <= data.startDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Ngày kết thúc phải sau ngày bắt đầu',
          path: ['endDate'],
        });
      }

      // gradeDeadline: if present, must be >= startDate
      if (
        data.startDate &&
        data.gradeDeadline &&
        data.gradeDeadline.trim() !== '' &&
        data.gradeDeadline < data.startDate
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Hạn nhập điểm phải sau hoặc bằng ngày bắt đầu',
          path: ['gradeDeadline'],
        });
      }

      // TODO: Academic policy check against endDate (non-blocking unless required)
      if (
        !GRADE_DEADLINE_ALLOW_BEFORE_END_DATE &&
        data.endDate &&
        data.gradeDeadline &&
        data.gradeDeadline.trim() !== '' &&
        data.gradeDeadline < data.endDate
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Hạn nhập điểm phải sau hoặc bằng ngày kết thúc',
          path: ['gradeDeadline'],
        });
      }

      // Client-side unique code check
      if (data.code) {
        const normalized = data.code.trim().toUpperCase();
        const isDuplicate = existingSemesters.some(
          (s) =>
            s.code.toUpperCase() === normalized && s.id !== currentSemesterId,
        );
        if (isDuplicate) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Mã này đã tồn tại',
            path: ['code'],
          });
        }
      }
    });

export type SemesterFormValues = {
  name: string;
  code: string;
  startDate: string;
  endDate: string;
  gradeDeadline?: string | null;
};

function toDateInput(iso: string | null | undefined): string {
  return iso ? iso.slice(0, 10) : '';
}

export interface SemesterDialogProps {
  semester: Semester | null;
  existingSemesters?: Semester[];
  onClose: () => void;
  onSubmit: (input: SemesterInput) => Promise<unknown>;
}

export function SemesterDialog({
  semester,
  existingSemesters = [],
  onClose,
  onSubmit,
}: SemesterDialogProps) {
  const isEditing = semester !== null;
  const isCodeManuallyEditedRef = React.useRef(isEditing);
  const [showDiscardAlert, setShowDiscardAlert] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const schema = React.useMemo(
    () => createSemesterFormSchema(existingSemesters, semester?.id),
    [existingSemesters, semester?.id],
  );

  const form = useForm<SemesterFormValues>({
    resolver: zodResolver(schema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
    defaultValues: {
      name: semester?.name ?? '',
      code: semester?.code ?? '',
      startDate: toDateInput(semester?.startDate),
      endDate: toDateInput(semester?.endDate),
      gradeDeadline: toDateInput(semester?.gradeSubmissionDeadline),
    },
  });

  const startDate = form.watch('startDate');
  const endDate = form.watch('endDate');

  // Overlap warning check
  const overlaps = React.useMemo(() => {
    return findOverlaps({ startDate, endDate }, existingSemesters, semester?.id);
  }, [startDate, endDate, existingSemesters, semester?.id]);

  const handleClose = React.useCallback(() => {
    form.reset();
    isCodeManuallyEditedRef.current = false;
    onClose();
  }, [form, onClose]);

  const requestClose = React.useCallback(() => {
    if (form.formState.isDirty) {
      setShowDiscardAlert(true);
    } else {
      handleClose();
    }
  }, [form.formState.isDirty, handleClose]);

  // Name change handler: auto-fill code if user hasn't edited code manually
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    form.setValue('name', newName, {
      shouldValidate: form.formState.submitCount > 0,
      shouldDirty: true,
    });

    if (!isCodeManuallyEditedRef.current && !form.formState.dirtyFields.code) {
      const generatedCode = generateSemesterCode(newName);
      if (generatedCode) {
        form.setValue('code', generatedCode, {
          shouldValidate: true,
          shouldDirty: false,
        });
      }
    }
  };

  // Code change handler: mark manual editing flag and convert to uppercase
  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    isCodeManuallyEditedRef.current = true;
    const upperValue = e.target.value.toUpperCase();
    form.setValue('code', upperValue, {
      shouldValidate: true,
      shouldDirty: true,
    });
  };

  const handleSubmit = async (values: SemesterFormValues) => {
    setIsSubmitting(true);
    try {
      const payload: SemesterInput = {
        name: values.name.trim(),
        code: values.code.trim().toUpperCase(),
        startDate: values.startDate,
        endDate: values.endDate,
        gradeSubmissionDeadline: values.gradeDeadline?.trim() || null,
      };

      await onSubmit(payload);
      toast.success(isEditing ? 'Đã lưu học kỳ' : 'Đã thêm học kỳ');
      handleClose();
    } catch (err) {
      let message = 'Không kết nối được máy chủ';
      if (err instanceof ApiError) {
        message = err.message;
        // Map duplicate code conflict error from server onto the code field
        if (
          err.status === 409 ||
          err.message.toLowerCase().includes('already exists') ||
          err.message.toLowerCase().includes('tồn tại')
        ) {
          form.setError('code', { message: 'Mã này đã tồn tại' });
          form.setFocus('code');
        }
      } else if (err instanceof Error) {
        message = err.message;
      }
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInvalid = (errors: Record<string, unknown>) => {
    // Focus the first invalid field
    const fieldOrder: (keyof SemesterFormValues)[] = [
      'name',
      'code',
      'startDate',
      'endDate',
      'gradeDeadline',
    ];
    for (const field of fieldOrder) {
      if (errors[field]) {
        form.setFocus(field);
        break;
      }
    }
  };

  return (
    <>
      <Dialog
        open
        onOpenChange={(open) => {
          if (!open && !isSubmitting) {
            requestClose();
          }
        }}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader className="gap-1.5 pb-2">
            <DialogTitle className="text-lg font-semibold">
              {isEditing ? 'Sửa học kỳ' : 'Thêm học kỳ'}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {isEditing ? 'Sửa thông tin học kỳ' : 'Thêm học kỳ mới'}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSubmit, handleInvalid)}
              className="space-y-5"
            >
              {/* Overlap warning (non-blocking) */}
              {overlaps.length > 0 && (
                <Alert
                  variant="warning"
                  className="gap-2.5 py-2.5 text-xs border-amber-500/40 bg-amber-500/10"
                >
                  <AlertTriangle className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  <div className="space-y-0.5">
                    <AlertTitle className="text-xs font-semibold text-amber-900 dark:text-amber-200">
                      Cảnh báo trùng khoảng thời gian
                    </AlertTitle>
                    <AlertDescription className="text-xs text-amber-800 dark:text-amber-300">
                      Khoảng thời gian này giao với học kỳ{' '}
                      <span className="font-semibold">
                        {overlaps.map((s) => s.name).join(', ')}
                      </span>
                      .
                    </AlertDescription>
                  </div>
                </Alert>
              )}

              {/* 2-column grid layout */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Hàng 1: Tên học kỳ */}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tên học kỳ</FormLabel>
                      <FormControl>
                        <Input
                          id={field.name}
                          name={field.name}
                          value={field.value ?? ''}
                          autoFocus
                          maxLength={100}
                          placeholder="Học kỳ 1 năm học 2026-2027"
                          className="placeholder:text-muted-foreground/80 dark:placeholder:text-neutral-400"
                          disabled={isSubmitting}
                          onChange={handleNameChange}
                          onBlur={field.onBlur}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Hàng 1: Mã */}
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mã</FormLabel>
                      <FormControl>
                        <Input
                          id={field.name}
                          name={field.name}
                          value={field.value ?? ''}
                          maxLength={30}
                          placeholder="HK1-2026-2027"
                          className="uppercase placeholder:text-muted-foreground/80 dark:placeholder:text-neutral-400"
                          disabled={isSubmitting}
                          onChange={handleCodeChange}
                          onBlur={field.onBlur}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Hàng 2: Bắt đầu */}
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Bắt đầu</FormLabel>
                      <FormControl>
                        <Input
                          id={field.name}
                          name={field.name}
                          type="date"
                          value={field.value ?? ''}
                          className="dark:[color-scheme:dark]"
                          disabled={isSubmitting}
                          onChange={(e) => {
                            field.onChange(e);
                            if (form.getValues('endDate')) {
                              form.trigger('endDate');
                            }
                          }}
                          onBlur={field.onBlur}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Hàng 2: Kết thúc */}
                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Kết thúc</FormLabel>
                      <FormControl>
                        <Input
                          id={field.name}
                          name={field.name}
                          type="date"
                          value={field.value ?? ''}
                          className="dark:[color-scheme:dark]"
                          disabled={isSubmitting}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Hàng 3: Hạn nhập điểm (không bắt buộc) (nằm 1 cột, độ rộng khớp lưới) */}
                <FormField
                  control={form.control}
                  name="gradeDeadline"
                  render={({ field }) => (
                    <FormItem className="flex flex-col sm:col-span-1">
                      <FormLabel>Hạn nhập điểm (không bắt buộc)</FormLabel>
                      <FormControl>
                        <Input
                          id={field.name}
                          name={field.name}
                          type="date"
                          value={field.value ?? ''}
                          className="dark:[color-scheme:dark]"
                          disabled={isSubmitting}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isSubmitting}
                  onClick={requestClose}
                >
                  Huỷ
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && (
                    <Loader2 className="mr-1.5 size-4 animate-spin" />
                  )}
                  {isSubmitting
                    ? isEditing
                      ? 'Đang lưu...'
                      : 'Đang thêm...'
                    : isEditing
                      ? 'Lưu'
                      : 'Thêm'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Confirmation when attempting to close with dirty form */}
      <AlertDialog
        open={showDiscardAlert}
        onOpenChange={(open) => !open && setShowDiscardAlert(false)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bỏ thay đổi?</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có những thay đổi chưa lưu. Bạn có chắc chắn muốn bỏ và đóng
              không?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowDiscardAlert(false)}>
              Tiếp tục nhập
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                setShowDiscardAlert(false);
                handleClose();
              }}
            >
              Bỏ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
