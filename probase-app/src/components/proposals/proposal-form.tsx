'use client';

import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { ApiError } from '@/lib/api/client';
import type { ProposalInput } from '@/lib/api/proposals';
import type { LecturerDirectoryEntry, ProjectType } from '@/lib/api/types';
import { FormError } from '@/components/shared/form-error';
import {
  LecturerPicker,
  lecturerName,
} from '@/components/lecturers/lecturer-picker';
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
import { InfoTooltip } from '@/components/shared/info-tooltip';

const ProposalSchema = z.object({
  projectTypeId: z.number('Vui lòng chọn loại đồ án').int().positive(),
  requestedLecturerId: z
    .number('Vui lòng chọn giảng viên bạn muốn gửi đề xuất')
    .int()
    .positive(),
  title: z
    .string()
    .trim()
    .min(1, 'Vui lòng nhập tên đề tài')
    .max(200, 'Tên đề tài tối đa 200 ký tự'),
  description: z
    .string()
    .trim()
    .min(1, 'Vui lòng mô tả đề tài bạn muốn làm')
    .max(3000, 'Mô tả tối đa 3000 ký tự'),
  expectedOutcomes: z
    .string()
    .trim()
    .min(1, 'Vui lòng nêu bạn định làm ra được gì')
    .max(3000, 'Yêu cầu đầu ra tối đa 3000 ký tự'),
});

export type ProposalFormValues = z.infer<typeof ProposalSchema>;

function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <Label htmlFor={htmlFor}>{label}</Label>
        {hint && <InfoTooltip text={hint} />}
      </div>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export function ProposalForm({
  projectTypes,
  defaultValues,
  fixed,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  projectTypes: ProjectType[];
  defaultValues?: Partial<ProposalFormValues>;
  fixed?: { projectType: string; lecturer: string };
  submitLabel: string;
  onSubmit: (values: ProposalInput) => Promise<unknown>;
  onCancel: () => void;
}) {
  const [formError, setFormError] = useState<string | null>(null);
  // The picker needs the whole row to show a name; the form only carries the id.
  const [lecturer, setLecturer] = useState<LecturerDirectoryEntry | null>(null);

  const {
    control,
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProposalFormValues>({
    resolver: zodResolver(ProposalSchema),
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    defaultValues: {
      title: '',
      description: '',
      expectedOutcomes: '',
      projectTypeId: projectTypes.length === 1 ? projectTypes[0].id : undefined,
      ...defaultValues,
    },
  });

  async function submit(values: ProposalFormValues) {
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
      className="max-w-2xl space-y-5"
      noValidate
    >
      <FormError message={formError} />

      {fixed ? (
        <dl className="grid gap-x-6 gap-y-3 rounded-xl border bg-muted/40 px-4 py-3 sm:grid-cols-2">
          <Fact label="Loại đồ án" value={fixed.projectType} />
          <Fact label="Gửi tới" value={fixed.lecturer} />
        </dl>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
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
                    className="h-9 w-full"
                    aria-invalid={!!errors.projectTypeId}
                  >
                    <SelectValue>
                      {(value) =>
                        projectTypes.find((type) => type.id === value)?.name ??
                        'Chọn loại đồ án'
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {projectTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>

          <Field
            label="Giảng viên hướng dẫn"
            htmlFor="requestedLecturerId"
            error={errors.requestedLecturerId?.message}
          >
            <Controller
              control={control}
              name="requestedLecturerId"
              render={({ field }) => (
                <LecturerPicker
                  id="requestedLecturerId"
                  value={lecturer}
                  invalid={!!errors.requestedLecturerId}
                  onChange={(picked) => {
                    setLecturer(picked);
                    field.onChange(picked.id);
                  }}
                />
              )}
            />
          </Field>
        </div>
      )}

      {/*
        The warning belongs next to the choice, not in the panel where it was
        made: by the time this form is submitted the panel is long closed, and
        this is the last moment the student can change their mind knowingly.
      */}
      {lecturer?.mentoring.atQuota && (
        <p className="text-xs text-status-waiting">
          {lecturerName(lecturer)} đã nhận đủ hạn mức hướng dẫn của học kỳ này,
          nên có thể chưa nhận thêm được đề tài. Bạn vẫn gửi được — thầy/cô sẽ
          trả lời kèm lý do.
        </p>
      )}

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
        hint="Bài toán bạn muốn giải, và vì sao nó đáng làm. Đây là phần giảng viên đọc để quyết định."
        error={errors.description?.message}
      >
        <Textarea
          id="description"
          rows={6}
          maxLength={3000}
          aria-invalid={!!errors.description}
          {...register('description')}
        />
      </Field>

      <Field
        label="Yêu cầu đầu ra"
        htmlFor="expectedOutcomes"
        hint="Cuối kỳ bạn nộp được những gì: sản phẩm, báo cáo, thực nghiệm…"
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

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="truncate text-sm">{value}</dd>
    </div>
  );
}
