'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { ApiError } from '@/lib/api/client';
import { useProjectTypes, useSemesters } from '@/lib/api/master-data';
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
  onSubmit,
  onCancel,
}: {
  defaultValues?: Partial<TopicFormValues>;
  lockSemester?: boolean;
  submitLabel: string;
  onSubmit: (values: TopicInput) => Promise<unknown>;
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
    formState: { errors, isSubmitting },
  } = useForm<TopicFormValues>({
    resolver: zodResolver(TopicSchema),
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    defaultValues: {
      maxStudents: 3,
      title: '',
      description: '',
      expectedOutcomes: '',
      ...defaultValues,
    },
  });

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

      <Field
        label="Số sinh viên tối đa"
        htmlFor="maxStudents"
        error={errors.maxStudents?.message}
      >
        <Input
          id="maxStudents"
          type="number"
          min={1}
          max={10}
          className="w-28"
          aria-invalid={!!errors.maxStudents}
          {...register('maxStudents', { valueAsNumber: true })}
        />
      </Field>

      <div className="flex items-center gap-2 pt-1">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="animate-spin" />}
          {submitLabel}
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={isSubmitting}
          onClick={onCancel}
        >
          Huỷ
        </Button>
      </div>
    </form>
  );
}
