'use client';

import { useState } from 'react';
import { Loader2, Plus, Trash2, Pencil } from 'lucide-react';
import { ApiError } from '@/lib/api/client';
import {
  useRoundRequirements,
  useSetRoundRequirements,
} from '@/lib/api/master-data';
import type { RegistrationRound, SubmissionRequirement } from '@/lib/api/types';
import { DateField } from '@/components/shared/date-field';
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
import { toast } from 'sonner';

interface Row {
  id?: number;
  name: string;
  due: string;
  isRequired: boolean;
}

const SUGGESTED = ['Đề cương', 'Báo cáo', 'Mã nguồn', 'Slide'];

function toDateInput(iso: string): string {
  return iso.slice(0, 10);
}

function toRow(requirement: SubmissionRequirement): Row {
  return {
    id: requirement.id,
    name: requirement.name,
    due: toDateInput(requirement.dueAt),
    isRequired: requirement.isRequired,
  };
}

export function RoundRequirementsEditor({
  round,
}: {
  round: RegistrationRound;
}) {
  const { data, isPending } = useRoundRequirements(round.id);
  const save = useSetRoundRequirements();
  const [draft, setDraft] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  /*
    What the server said, until the office types something — then their draft,
    for good. Derived rather than copied into state by an effect: a refetch
    landing mid-edit would otherwise wipe what they were in the middle of
    writing.
  */
  const rows = draft ?? data?.map(toRow) ?? null;

  function edit(next: Row[]) {
    setSaved(false);
    setHasSubmitted(false);
    setDraft(next);
  }

  function patch(index: number, changes: Partial<Row>) {
    edit(
      (rows ?? []).map((row, at) =>
        at === index ? { ...row, ...changes } : row,
      ),
    );
  }

  function add(name = '') {
    edit([...(rows ?? []), { name, due: '', isRequired: true }]);
  }

  function remove(index: number) {
    edit((rows ?? []).filter((_, at) => at !== index));
  }

  async function submit() {
    setHasSubmitted(true);
    setError(null);
    setSaved(false);

    if (problems.length > 0 || duplicated) return;

    try {
      const next = await save.mutateAsync({
        roundId: round.id,
        requirements: (rows ?? []).map((row) => ({
          id: row.id,
          name: row.name.trim(),
          dueAt: new Date(row.due).toISOString(),
          isRequired: row.isRequired,
        })),
      });

      setDraft(next.map(toRow));
      setSaved(true);
      toast.success('Đã lưu danh sách bài nộp.');
    } catch (err) {
      // The refusal worth reading comes from the API: a document groups have
      // already handed work in against cannot be taken off the list.
      setError(
        err instanceof ApiError ? err.message : 'Không kết nối được máy chủ',
      );
    }
  }

  if (isPending || rows === null) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const problems = rows.flatMap((row, index) => {
    if (row.name.trim() === '') return [`Mục ${index + 1}: chưa có tên.`];
    if (row.due === '') return [`${row.name} chưa có hạn nộp.`];

    return [];
  });

  const duplicated =
    new Set(rows.map((row) => row.name.trim().toLowerCase())).size !==
    rows.length;

  const isCompact =
    saved || (data != null && data.length > 0 && draft === null);

  return (
    <div
      className={
        isCompact
          ? 'flex flex-wrap items-center justify-between gap-4 rounded-xl border p-4'
          : 'space-y-2.5 rounded-xl border p-4'
      }
    >
      <h3 className="text-sm font-medium">{round.projectType.name}</h3>

      {isCompact ? (
        <div className="inline-flex items-center gap-3 rounded-lg border bg-muted/30 pl-4 pr-1.5 py-1.5">
          <p className="text-sm">
            {rows.length === 0 ? (
              <span className="text-muted-foreground">
                Không có bài nộp nào.
              </span>
            ) : (
              rows.map((r) => r.name).join(', ')
            )}
          </p>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 shrink-0 text-muted-foreground hover:bg-background hover:text-foreground"
            onClick={() => {
              setDraft(rows);
              setSaved(false);
            }}
          >
            <Pencil className="size-3.5" />
          </Button>
        </div>
      ) : (
        <div className="space-y-3 pt-1">
          <FormError message={error} />

          {rows.length === 0 ? (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed px-3 py-3">
              <span className="text-sm text-muted-foreground">
                Chưa khai mục nào. Thường có:
              </span>
              {SUGGESTED.map((name) => (
                <Button
                  key={name}
                  variant="outline"
                  size="sm"
                  onClick={() => add(name)}
                >
                  <Plus />
                  {name}
                </Button>
              ))}
            </div>
          ) : (
            <ul className="space-y-2">
              {rows.map((row, index) => (
                <li
                  key={row.id ?? `new-${index}`}
                  className="grid items-start gap-3 sm:grid-cols-[minmax(0,1fr)_12rem_auto]"
                >
                  <div className="space-y-2">
                    <Label htmlFor={`name-${round.id}-${index}`}>
                      Tên mục nộp
                    </Label>
                    <Select
                      value={row.name}
                      onValueChange={(value) =>
                        patch(index, { name: value as string })
                      }
                    >
                      <SelectTrigger
                        id={`name-${round.id}-${index}`}
                        aria-label={`Tên mục ${index + 1}`}
                        className="w-full"
                        aria-invalid={hasSubmitted && row.name.trim() === ''}
                      >
                        <SelectValue placeholder="Chọn mục nộp" />
                      </SelectTrigger>
                      <SelectContent>
                        {SUGGESTED.map((name) => (
                          <SelectItem key={name} value={name}>
                            {name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <label className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
                      <input
                        type="checkbox"
                        className="size-3.5 accent-primary"
                        checked={row.isRequired}
                        onChange={(event) =>
                          patch(index, { isRequired: event.target.checked })
                        }
                      />
                      Bắt buộc
                    </label>
                  </div>

                  <DateField
                    id={`due-${round.id}-${index}`}
                    label="Hạn nộp"
                    value={row.due}
                    invalid={hasSubmitted && row.due === ''}
                    onChange={(due) => patch(index, { due })}
                  />

                  <div className="flex flex-col space-y-2">
                    <Label className="invisible">X</Label>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive"
                      aria-label={`Xoá ${row.name || `mục ${index + 1}`}`}
                      onClick={() => remove(index)}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {hasSubmitted && duplicated && (
            <p className="text-sm text-destructive">
              Hai mục trùng tên — sinh viên sẽ không biết chọn cái nào.
            </p>
          )}

          {hasSubmitted &&
            problems.map((problem) => (
              <p key={problem} className="text-sm text-destructive">
                {problem}
              </p>
            ))}

          <div className="flex items-center gap-4 pt-4">
            {rows.length > 0 && (
              <Button variant="outline" size="sm" onClick={() => add()}>
                <Plus />
                Thêm mục
              </Button>
            )}

            <Button disabled={save.isPending} onClick={submit}>
              {save.isPending ? <Loader2 className="animate-spin" /> : null}
              Lưu danh sách
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
