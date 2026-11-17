'use client';

import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { ApiError } from '@/lib/api/client';
import {
  useProjectTypes,
  useSemesterRounds,
  useSemesters,
} from '@/lib/api/master-data';
import type { TopicInput } from '@/lib/api/topics';
import { formatSemesterShort } from '@/lib/utils';
import {
  TopicSchema,
  type TopicFormValues,
} from '@/validations/topic.validation';
import { FormError } from '@/components/shared/form-error';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

function Field({
  label,
  htmlFor,
  count,
  maxLength,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  count?: number;
  maxLength?: number;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <Label
          htmlFor={htmlFor}
          className="text-sm sm:text-[15px] font-semibold text-slate-800 dark:text-neutral-200"
        >
          {label}
        </Label>
        {count !== undefined && maxLength !== undefined && (
          <span className="text-xs tabular-nums text-muted-foreground">
            {count}/{maxLength}
          </span>
        )}
      </div>
      {children}
      {error && <p className="text-[13px] font-medium text-destructive">{error}</p>}
    </div>
  );
}

export function TopicForm({
  defaultValues,
  semesterInfo,
  lockSemester = false,
  submitLabel,
  draftLabel = 'Lưu bản nháp',
  children,
  onSubmit,
  onSaveDraft,
  onCancel,
}: {
  defaultValues?: Partial<TopicFormValues>;
  semesterInfo?: { id: number; name: string; code?: string };
  lockSemester?: boolean;
  submitLabel: string;
  draftLabel?: string;
  children?: React.ReactNode;
  onSubmit: (values: TopicInput) => Promise<unknown>;
  onSaveDraft?: (values: TopicInput) => Promise<unknown>;
  onCancel: () => void;
}) {
  const { data: semesters } = useSemesters();
  const { data: projectTypes } = useProjectTypes();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    control,
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<TopicFormValues>({
    resolver: zodResolver(TopicSchema),
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    defaultValues: {
      maxStudents: 2,
      title: '',
      description: '',
      expectedOutcomes: '',
      ...defaultValues,
    },
  });

  const selectedSemesterId = watch('semesterId');
  const selectedProjectTypeId = watch('projectTypeId');
  const titleValue = watch('title') ?? '';
  const descriptionValue = watch('description') ?? '';
  const expectedOutcomesValue = watch('expectedOutcomes') ?? '';
  const { data: rounds } = useSemesterRounds(selectedSemesterId);
  const matchingRound = rounds?.find(
    (r) => r.projectTypeId === selectedProjectTypeId,
  );

  useEffect(() => {
    if (matchingRound?.maxStudentsPerTopic) {
      setValue('maxStudents', matchingRound.maxStudentsPerTopic);
    }
  }, [matchingRound?.maxStudentsPerTopic, setValue]);

  async function submit(values: TopicFormValues) {
    setFormError(null);
    try {
      await onSubmit(values);
    } catch (err) {
      setFormError(
        err instanceof ApiError ? err.message : 'Không kết nối được máy chủ',
      );
    }
  }

  return (
    <form
      onSubmit={handleSubmit(submit)}
      className="w-full space-y-6"
      noValidate
    >
      <FormError message={formError} />

      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {lockSemester ? (
            <div className="space-y-2">
              <Label className="text-sm sm:text-[15px] font-semibold text-slate-800 dark:text-neutral-200">
                Học kỳ
              </Label>
              <div className="flex h-11 w-full items-center rounded-lg border border-slate-200 dark:border-neutral-700 bg-slate-100/80 dark:bg-neutral-800/80 px-3.5 text-[15px] font-medium text-slate-800 dark:text-neutral-100">
                {formatSemesterShort(
                  semesterInfo ??
                    semesters?.find((s) => s.id === selectedSemesterId),
                )}
              </div>
              <input
                type="hidden"
                {...register('semesterId', { valueAsNumber: true })}
              />
            </div>
          ) : (
            <Field
              label="Học kỳ"
              htmlFor="semesterId"
              error={errors.semesterId?.message}
            >
              <Controller
                control={control}
                name="semesterId"
                render={({ field }) => (
                  <Select
                    value={field.value ?? null}
                    onValueChange={(value) => field.onChange(value)}
                  >
                    <SelectTrigger
                      id="semesterId"
                      className="w-full data-[size=default]:h-11 text-[15px]"
                    >
                      {/* The children function replaces the placeholder rather
                          than falling back to it, so nothing selected has to
                          resolve to the prompt itself. */}
                      <SelectValue>
                        {(value) => {
                          const found = semesters?.find(
                            (semester) => semester.id === value,
                          );
                          return found
                            ? formatSemesterShort(found)
                            : 'Chọn học kỳ';
                        }}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {semesters?.map((semester) => (
                        <SelectItem
                          key={semester.id}
                          value={semester.id}
                          className="text-[15px]"
                        >
                          {formatSemesterShort(semester)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
          )}

          <Field
            label="Loại đồ án"
            htmlFor="projectTypeId"
            error={errors.projectTypeId?.message}
          >
            <Controller
              control={control}
              name="projectTypeId"
              render={({ field }) => (
                <Select
                  value={field.value ?? null}
                  onValueChange={(value) => field.onChange(value)}
                >
                  <SelectTrigger
                    id="projectTypeId"
                    className="w-full data-[size=default]:h-11 text-[15px]"
                  >
                    <SelectValue>
                      {(value) =>
                        projectTypes?.find((type) => type.id === value)?.name ??
                        'Chọn loại đồ án'
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {projectTypes?.map((type) => (
                      <SelectItem
                        key={type.id}
                        value={type.id}
                        className="text-[15px]"
                      >
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>

          <div className="space-y-2 sm:col-span-2 lg:col-span-1">
            <Label className="text-sm sm:text-[15px] font-semibold text-slate-800 dark:text-neutral-200">
              Sĩ số nhóm sinh viên
            </Label>
            <div className="flex h-11 w-full items-center rounded-lg border border-slate-200 dark:border-neutral-700 bg-slate-100/80 dark:bg-neutral-800/80 px-3.5 text-[15px] font-medium text-slate-800 dark:text-neutral-100">
              {matchingRound?.maxStudentsPerTopic ??
                defaultValues?.maxStudents ??
                2}{' '}
              sinh viên / đề tài
            </div>
            <input
              type="hidden"
              {...register('maxStudents', { valueAsNumber: true })}
            />
          </div>
        </div>
      </div>

      <hr className="border-slate-200 dark:border-neutral-800" />

      <div className="space-y-5">
        <Field
          label="Tên đề tài"
          htmlFor="title"
          count={titleValue.length}
          maxLength={200}
          error={errors.title?.message}
        >
          <Textarea
            id="title"
            autoFocus
            rows={2}
            maxLength={200}
            aria-invalid={!!errors.title}
            className="min-h-12 resize-none px-3.5 py-2.5 text-[15px] md:text-[15px] leading-relaxed"
            {...register('title')}
          />
        </Field>

        <Field
          label="Mô tả"
          htmlFor="description"
          count={descriptionValue.length}
          maxLength={3000}
          error={errors.description?.message}
        >
          <Textarea
            id="description"
            rows={6}
            maxLength={3000}
            aria-invalid={!!errors.description}
            className="min-h-36 resize-y px-3.5 py-2.5 text-[15px] md:text-[15px] leading-relaxed"
            {...register('description')}
          />
        </Field>

        <Field
          label="Yêu cầu đầu ra"
          htmlFor="expectedOutcomes"
          count={expectedOutcomesValue.length}
          maxLength={3000}
          error={errors.expectedOutcomes?.message}
        >
          <Textarea
            id="expectedOutcomes"
            rows={5}
            maxLength={3000}
            aria-invalid={!!errors.expectedOutcomes}
            className="min-h-30 resize-y px-3.5 py-2.5 text-[15px] md:text-[15px] leading-relaxed"
            {...register('expectedOutcomes')}
          />
        </Field>
      </div>

      {children}

      <div className="flex flex-wrap items-center gap-3 border-t border-slate-200 dark:border-neutral-800 pt-5">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="h-10 px-5 text-sm font-semibold cursor-pointer"
        >
          {isSubmitting && <Loader2 className="animate-spin" />}
          {submitLabel}
        </Button>
        {onSaveDraft && (
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            className="h-10 px-5 text-sm font-medium cursor-pointer"
            onClick={handleSubmit(async (values) => {
              setFormError(null);
              try {
                await onSaveDraft(values);
              } catch (err) {
                setFormError(
                  err instanceof ApiError
                    ? err.message
                    : 'Không kết nối được máy chủ',
                );
              }
            })}
          >
            {draftLabel}
          </Button>
        )}
        <Button
          type="button"
          variant="destructive"
          disabled={isSubmitting}
          onClick={onCancel}
          className="h-10 px-5 text-sm font-medium cursor-pointer"
        >
          Huỷ
        </Button>
      </div>
    </form>
  );
}
