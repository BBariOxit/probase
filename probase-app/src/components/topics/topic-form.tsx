'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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
import {
  TopicSchema,
  type TopicFormValues,
} from '@/validations/topic.validation';
import { FormError } from '@/components/shared/form-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export function TopicForm({
  defaultValues,
  lockSemester = false,
  submitLabel,
  draftLabel = 'Lưu bản nháp',
  children,
  onSubmit,
  onSaveDraft,
  onCancel,
}: {
  defaultValues?: Partial<TopicFormValues>;
  lockSemester?: boolean;
  submitLabel: string;
  draftLabel?: string;
  children?: React.ReactNode;
  onSubmit: (values: TopicInput) => Promise<unknown>;
  onSaveDraft?: (values: TopicInput) => Promise<unknown>;
  onCancel: () => void;
}) {
  const router = useRouter();
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
      router.push('/lecturer');
    } catch (err) {
      setFormError(
        err instanceof ApiError ? err.message : 'Không kết nối được máy chủ',
      );
    }
  }

  return (
    <form
      onSubmit={handleSubmit(submit)}
      className="max-w-2xl space-y-5"
      noValidate
    >
      <FormError message={formError} />

      <div className="grid gap-4 sm:grid-cols-2">
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
                disabled={lockSemester}
              >
                <SelectTrigger id="semesterId" className="w-full">
                  {/* The children function replaces the placeholder rather
                      than falling back to it, so nothing selected has to
                      resolve to the prompt itself. */}
                  <SelectValue>
                    {(value) =>
                      semesters?.find((semester) => semester.id === value)
                        ?.name ?? 'Chọn học kỳ'
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {semesters?.map((semester) => (
                    <SelectItem key={semester.id} value={semester.id}>
                      {semester.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Field>

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
                <SelectTrigger id="projectTypeId" className="w-full">
                  <SelectValue>
                    {(value) =>
                      projectTypes?.find((type) => type.id === value)?.name ??
                      'Chọn loại đồ án'
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {projectTypes?.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Field>
      </div>

      <Field label="Tên đề tài" htmlFor="title" error={errors.title?.message}>
        <Input
          id="title"
          autoFocus
          maxLength={200}
          aria-invalid={!!errors.title}
          {...register('title')}
        />
      </Field>

      <Field
        label="Mô tả"
        htmlFor="description"
        error={errors.description?.message}
      >
        <Textarea
          id="description"
          rows={5}
          maxLength={3000}
          aria-invalid={!!errors.description}
          {...register('description')}
        />
      </Field>

      <Field
        label="Yêu cầu đầu ra"
        htmlFor="expectedOutcomes"
        error={errors.expectedOutcomes?.message}
      >
        <Textarea
          id="expectedOutcomes"
          rows={4}
          maxLength={3000}
          aria-invalid={!!errors.expectedOutcomes}
          {...register('expectedOutcomes')}
        />
      </Field>

      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-slate-800 dark:text-neutral-300">
          Sĩ số nhóm sinh viên
        </Label>
        <div className="flex items-center gap-2">
          <span className="font-semibold text-xs text-slate-900 dark:text-neutral-100 px-3 py-2 rounded-lg bg-slate-100 dark:bg-neutral-800 border border-slate-300 dark:border-neutral-700">
            {matchingRound?.maxStudentsPerTopic ?? 2} sinh viên / đề tài
          </span>
          <span className="text-xs text-slate-500 dark:text-neutral-400">
            (Quy định tự động theo đợt {matchingRound?.projectType?.name ?? 'đồ án'})
          </span>
        </div>
        <input type="hidden" {...register('maxStudents', { valueAsNumber: true })} />
      </div>

      {children}

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="animate-spin" />}
          {submitLabel}
        </Button>
        {onSaveDraft && (
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
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
          className="cursor-pointer font-medium"
        >
          Huỷ
        </Button>
      </div>
    </form>
  );
}
