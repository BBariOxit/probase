'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { ApiError } from '@/lib/api/client';
import type { SemesterInput } from '@/lib/api/master-data';
import type { Semester } from '@/lib/api/types';
import {
  buildSemester,
  getAcademicYearOptions,
  getDefaultSemesterDates,
  parseSemesterCode,
  suggestNextTerm,
  type SemesterTerm,
} from '@/lib/semester-utils';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const TERM_OPTIONS: { value: SemesterTerm; label: string }[] = [
  { value: '1', label: 'Học kỳ 1' },
  { value: '2', label: 'Học kỳ 2' },
  { value: 'summer', label: 'Học kỳ hè' },
];

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
 * Creates the Zod validation schema for the semester form.
 */
export const createSemesterFormSchema = (
  existingSemesters: Semester[] = [],
  currentSemesterId?: number,
) =>
  z
    .object({
      academicYear: z
        .string({ error: 'Vui lòng chọn năm học' })
        .min(1, 'Vui lòng chọn năm học'),
      term: z.enum(['1', '2', 'summer'], {
        error: 'Vui lòng chọn học kỳ',
      }),
      name: z
        .string({ error: 'Vui lòng nhập tên học kỳ' })
        .trim()
        .min(1, 'Vui lòng nhập tên học kỳ')
        .max(100, 'Tên học kỳ tối đa 100 ký tự'),
      code: z
        .string({ error: 'Vui lòng nhập mã học kỳ' })
        .min(1, 'Vui lòng nhập mã học kỳ'),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      gradeDeadline: z.string().optional().nullable(),
    })
    .superRefine((data, ctx) => {
      // Client-side unique check for combination of (academicYear, term), mapped to term
      if (data.academicYear && data.term) {
        const { code } = buildSemester(data.academicYear, data.term);
        const isDuplicate = existingSemesters.some(
          (s) =>
            s.code.toUpperCase() === code.toUpperCase() &&
            s.id !== currentSemesterId,
        );
        if (isDuplicate) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Học kỳ này đã được tạo',
            path: ['term'],
          });
        }
      }
    });

export type SemesterFormValues = {
  academicYear: string;
  term: SemesterTerm;
  name: string;
  code: string;
  startDate?: string;
  endDate?: string;
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
  const [showDiscardAlert, setShowDiscardAlert] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Calculate default academicYear, term, and standard background dates
  const initialDefaults = React.useMemo(() => {
    if (semester) {
      const parsed = parseSemesterCode(semester.code);
      const year =
        parsed?.academicYear ??
        (semester.startDate
          ? `${new Date(semester.startDate).getFullYear()}-${new Date(semester.startDate).getFullYear() + 1}`
          : '2026-2027');
      const term = parsed?.term ?? '1';
      const auto = buildSemester(year, term);
      const isCustomName = semester.name !== auto.name;

      const stdDates = getDefaultSemesterDates(year, term);
      const semStart = toDateInput(semester.startDate) || stdDates.startDate;
      const semEnd = toDateInput(semester.endDate) || stdDates.endDate;

      return {
        academicYear: year,
        term,
        name: semester.name,
        code: semester.code,
        startDate: semStart,
        endDate: semEnd,
        gradeDeadline: toDateInput(semester.gradeSubmissionDeadline),
        isCustomName,
      };
    }

    const suggested = suggestNextTerm(new Date(), existingSemesters);
    const auto = buildSemester(suggested.academicYear, suggested.term);
    const stdDates = getDefaultSemesterDates(
      suggested.academicYear,
      suggested.term,
    );

    return {
      academicYear: suggested.academicYear,
      term: suggested.term,
      name: auto.name,
      code: auto.code,
      startDate: stdDates.startDate,
      endDate: stdDates.endDate,
      gradeDeadline: stdDates.gradeDeadline,
      isCustomName: false,
    };
  }, [semester, existingSemesters]);

  const [isCustomNameOpen, setIsCustomNameOpen] = React.useState(
    initialDefaults.isCustomName,
  );

  const academicYearOptions = React.useMemo(() => {
    const base = getAcademicYearOptions(new Date());
    if (
      initialDefaults.academicYear &&
      !base.includes(initialDefaults.academicYear)
    ) {
      return [initialDefaults.academicYear, ...base].sort();
    }
    return base;
  }, [initialDefaults.academicYear]);

  const schema = React.useMemo(
    () => createSemesterFormSchema(existingSemesters, semester?.id),
    [existingSemesters, semester?.id],
  );

  const form = useForm<SemesterFormValues>({
    resolver: zodResolver(schema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
    defaultValues: {
      academicYear: initialDefaults.academicYear,
      term: initialDefaults.term,
      name: initialDefaults.name,
      code: initialDefaults.code,
      startDate: initialDefaults.startDate,
      endDate: initialDefaults.endDate,
      gradeDeadline: initialDefaults.gradeDeadline,
    },
  });

  const watchYear = form.watch('academicYear');
  const watchTerm = form.watch('term');
  const watchName = form.watch('name');

  // Preview computation
  const preview = React.useMemo(() => {
    if (!watchYear || !watchTerm) return null;
    const auto = buildSemester(watchYear, watchTerm);
    return {
      name:
        isCustomNameOpen && watchName && watchName.trim() !== ''
          ? watchName.trim()
          : auto.name,
      code: auto.code,
    };
  }, [watchYear, watchTerm, isCustomNameOpen, watchName]);

  const handleClose = React.useCallback(() => {
    form.reset();
    setIsCustomNameOpen(false);
    onClose();
  }, [form, onClose]);

  const requestClose = React.useCallback(() => {
    if (form.formState.isDirty) {
      setShowDiscardAlert(true);
    } else {
      handleClose();
    }
  }, [form.formState.isDirty, handleClose]);

  const handleAcademicYearChange = (newYear: string | null) => {
    if (!newYear) return;
    form.setValue('academicYear', newYear, {
      shouldValidate: true,
      shouldDirty: true,
    });
    const currentTerm = form.getValues('term');
    const auto = buildSemester(newYear, currentTerm);
    form.setValue('code', auto.code, { shouldValidate: true, shouldDirty: true });
    if (!isCustomNameOpen) {
      form.setValue('name', auto.name, {
        shouldValidate: true,
        shouldDirty: true,
      });
    }
    const dates = getDefaultSemesterDates(newYear, currentTerm);
    form.setValue('startDate', dates.startDate);
    form.setValue('endDate', dates.endDate);
    form.setValue('gradeDeadline', dates.gradeDeadline);
  };

  const handleTermChange = (newTerm: SemesterTerm) => {
    form.setValue('term', newTerm, {
      shouldValidate: true,
      shouldDirty: true,
    });
    const currentYear = form.getValues('academicYear');
    const auto = buildSemester(currentYear, newTerm);
    form.setValue('code', auto.code, { shouldValidate: true, shouldDirty: true });
    if (!isCustomNameOpen) {
      form.setValue('name', auto.name, {
        shouldValidate: true,
        shouldDirty: true,
      });
    }
    const dates = getDefaultSemesterDates(currentYear, newTerm);
    form.setValue('startDate', dates.startDate);
    form.setValue('endDate', dates.endDate);
    form.setValue('gradeDeadline', dates.gradeDeadline);
  };

  const handleSubmit = async (values: SemesterFormValues) => {
    setIsSubmitting(true);
    try {
      const { name: autoName, code: autoCode } = buildSemester(
        values.academicYear,
        values.term,
      );
      const dates = getDefaultSemesterDates(
        values.academicYear,
        values.term,
      );

      const payload: SemesterInput = {
        academicYear: values.academicYear,
        term: values.term,
        name:
          isCustomNameOpen && values.name.trim() !== ''
            ? values.name.trim()
            : autoName,
        code: autoCode,
        startDate: values.startDate || dates.startDate,
        endDate: values.endDate || dates.endDate,
        gradeSubmissionDeadline:
          values.gradeDeadline?.trim() || dates.gradeDeadline || null,
      };

      await onSubmit(payload);
      toast.success(isEditing ? 'Đã lưu học kỳ' : 'Đã thêm học kỳ');
      handleClose();
    } catch (err) {
      let message = 'Không kết nối được máy chủ';
      if (err instanceof ApiError) {
        message = err.message;
        // Map duplicate code conflict error from server onto the term field
        if (
          err.status === 409 ||
          err.message.toLowerCase().includes('already exists') ||
          err.message.toLowerCase().includes('tồn tại')
        ) {
          form.setError('term', { message: 'Học kỳ này đã được tạo' });
          form.setFocus('term');
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
    const fieldOrder: (keyof SemesterFormValues)[] = [
      'academicYear',
      'term',
      'name',
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
              className="space-y-4"
            >
              {/* 2-column grid layout */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Hàng 1: Năm học */}
                <FormField
                  control={form.control}
                  name="academicYear"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Năm học</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={handleAcademicYearChange}
                        disabled={isSubmitting}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Chọn năm học..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {academicYearOptions.map((year) => (
                            <SelectItem key={year} value={year}>
                              {year}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Hàng 1: Học kỳ */}
                <FormField
                  control={form.control}
                  name="term"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Học kỳ</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={(val) =>
                          handleTermChange(val as SemesterTerm)
                        }
                        disabled={isSubmitting}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Chọn học kỳ..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {TERM_OPTIONS.map((opt) => {
                            const targetCode = buildSemester(
                              watchYear,
                              opt.value,
                            ).code.toUpperCase();
                            const isCreated = existingSemesters.some(
                              (s) =>
                                s.code.toUpperCase() === targetCode &&
                                s.id !== semester?.id,
                            );
                            return (
                              <SelectItem
                                key={opt.value}
                                value={opt.value}
                                disabled={isCreated}
                              >
                                <span className="flex items-center gap-1.5">
                                  <span>{opt.label}</span>
                                  {isCreated && (
                                    <span className="text-[11px] text-muted-foreground font-normal">
                                      (Đã tạo)
                                    </span>
                                  )}
                                </span>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Hàng 2: Xem trước chỉ đọc + Tùy chỉnh tên */}
                {preview && (
                  <div className="sm:col-span-2 rounded-lg border border-slate-200 dark:border-neutral-800 bg-slate-50/80 dark:bg-white/4 px-3.5 py-2.5 flex items-center justify-between gap-3">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="text-xs text-muted-foreground select-none">
                        Xem trước:
                      </span>
                      <span className="font-semibold text-sm text-slate-900 dark:text-neutral-100">
                        {preview.name}
                      </span>
                      <span className="text-xs font-mono font-medium text-slate-500 dark:text-neutral-400 bg-slate-200/60 dark:bg-neutral-800 px-1.5 py-0.5 rounded">
                        {preview.code}
                      </span>
                    </div>

                    {!isCustomNameOpen && (
                      <button
                        type="button"
                        onClick={() => setIsCustomNameOpen(true)}
                        className="text-xs text-primary hover:underline font-medium cursor-pointer shrink-0 ml-auto"
                      >
                        Tùy chỉnh tên
                      </button>
                    )}
                  </div>
                )}

                {/* Hàng 2.5: Ô Input cho name khi bật Tùy chỉnh tên */}
                {isCustomNameOpen && (
                  <div className="sm:col-span-2">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem className="space-y-1.5 animate-in fade-in-50">
                          <div className="flex items-center justify-between">
                            <FormLabel>Tùy chỉnh tên học kỳ</FormLabel>
                            <button
                              type="button"
                              onClick={() => {
                                setIsCustomNameOpen(false);
                                const auto = buildSemester(watchYear, watchTerm);
                                form.setValue('name', auto.name, {
                                  shouldValidate: true,
                                  shouldDirty: true,
                                });
                              }}
                              className="text-xs text-muted-foreground hover:text-foreground hover:underline cursor-pointer"
                            >
                              Đóng lại (dùng tên tự sinh)
                            </button>
                          </div>
                          <FormControl>
                            <Input
                              id={field.name}
                              name={field.name}
                              value={field.value ?? ''}
                              maxLength={100}
                              placeholder={
                                buildSemester(watchYear, watchTerm).name
                              }
                              className="h-9 text-sm placeholder:text-muted-foreground/80 dark:placeholder:text-neutral-400"
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
                )}
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
