'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FileUp, Loader2, Upload, Users } from 'lucide-react';
import { ApiError } from '@/lib/api/client';
import { useMyGroup } from '@/lib/api/registration';
import { useCreateSubmission, useSubmissions } from '@/lib/api/submissions';
import type { SubmissionRequirement } from '@/lib/api/types';
import { useRequireRole } from '@/lib/auth/use-require-role';
import { EmptyState } from '@/components/shared/empty-state';
import { FormError } from '@/components/shared/form-error';
import { PageWithRail } from '@/components/layout/page-with-rail';
import { SubmissionCard } from '@/components/submissions/submission-card';
import { SubmissionDeadlines } from '@/components/submissions/submission-deadlines';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function StudentSubmissionsPage() {
  const allowed = useRequireRole('STUDENT');
  const { data: group, isPending: groupPending } = useMyGroup();
  const { data, isPending, error } = useSubmissions({ limit: 50 });
  const [submitting, setSubmitting] = useState(false);

  if (!allowed) return null;

  if (groupPending) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Nothing to hand in against. Not a failure — a student without a topic yet
  // simply has no work to submit, and the way out is the other screen.
  if (!group) {
    return (
      <div className="mx-auto max-w-2xl rounded-xl border">
        <EmptyState
          icon={Users}
          title="Bạn chưa có đề tài nào, nên chưa nộp bài được."
          action={
            <Button render={<Link href="/student" />}>
              Xem danh sách đề tài
            </Button>
          }
        />
      </div>
    );
  }

  const submissions = data?.items ?? [];

  return (
    /*
      The history is the reading column and the rail is the context it is read
      against. Which topic and what is due are the two things a group checks
      before deciding whether to hand something in, and they were competing with
      the history for the top of the page — while half the screen sat empty
      beside it.
    */
    <PageWithRail
      rail={
        <>
          <section className="rounded-xl border bg-card p-4">
            <p className="text-sm font-medium">{group.topic.title}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {group.topic.lecturer.academicTitle
                ? `${group.topic.lecturer.academicTitle} ${group.topic.lecturer.fullName}`
                : group.topic.lecturer.fullName}
            </p>
          </section>

          <SubmissionDeadlines
            requirements={group.requirements}
            submissions={submissions}
          />
        </>
      }
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-heading text-sm font-semibold tracking-tight">
          Đã nộp
        </h2>
        {/*
          Nothing to hand in until the faculty has said what. The button is
          hidden rather than disabled: a greyed control invites hunting for the
          trick that enables it, and the empty deadline list beside it has
          already given the reason.
        */}
        {group.requirements.length > 0 && (
          <Button onClick={() => setSubmitting(true)}>
            <Upload />
            Nộp bài
          </Button>
        )}
      </div>

      {error && (
        <p className="text-sm text-destructive">Không tải được bài nộp.</p>
      )}

      {isPending && (
        <div className="flex justify-center py-16">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {!isPending && submissions.length === 0 && (
        <div className="rounded-xl border">
          <EmptyState
            icon={FileUp}
            title="Nhóm bạn chưa nộp gì cả."
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSubmitting(true)}
              >
                <Upload />
                Nộp bài đầu tiên
              </Button>
            }
          />
        </div>
      )}

      <ul className="space-y-3">
        {submissions.map((submission) => (
          <li key={submission.id}>
            <SubmissionCard submission={submission} />
          </li>
        ))}
      </ul>

      {submitting && (
        <SubmitDialog
          requirements={group.requirements}
          onClose={() => setSubmitting(false)}
        />
      )}
    </PageWithRail>
  );
}

function SubmitDialog({
  requirements,
  onClose,
}: {
  requirements: SubmissionRequirement[];
  onClose: () => void;
}) {
  const create = useCreateSubmission();
  const [requirementId, setRequirementId] = useState(requirements[0].id);
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  const trimmedUrl = url.trim();
  const validUrl = trimmedUrl === '' || /^https?:\/\//i.test(trimmedUrl);
  const ready = (file !== null || trimmedUrl !== '') && validUrl;

  async function submit() {
    setError(null);
    try {
      await create.mutateAsync({
        requirementId,
        submissionUrl: trimmedUrl || undefined,
        file,
      });
      onClose();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Không tải được bài nộp lên',
      );
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(next) => !next && !create.isPending && onClose()}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nộp bài</DialogTitle>
          <DialogDescription>
            Mỗi lần nộp là một phiên bản mới — bài cũ và nhận xét trên nó vẫn
            giữ nguyên.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <FormError message={error} />

          <div className="space-y-2">
            <Label htmlFor="sub-type">Nộp cho mục nào</Label>
            <Select
              value={requirementId}
              onValueChange={(value) => setRequirementId(value as number)}
            >
              <SelectTrigger id="sub-type" className="w-full">
                <SelectValue>
                  {(value) =>
                    requirements.find((one) => one.id === value)?.name ??
                    'Chọn mục'
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {requirements.map((one) => (
                  <SelectItem key={one.id} value={one.id}>
                    {one.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sub-file">Tệp</Label>
            <p className="-mt-1 text-xs text-muted-foreground">
              PDF, Word hoặc ZIP, tối đa 25MB.
            </p>
            <Input
              id="sub-file"
              type="file"
              accept=".pdf,.doc,.docx,.zip"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sub-url">Hoặc link</Label>
            {/*
              One sentence covering both, now that the wording cannot key off a
              fixed kind: what the office called this document is their text, and
              guessing "this one is source code" from its name would be wrong the
              first time a faculty writes it differently.
            */}
            <p className="-mt-1 text-xs text-muted-foreground">
              Link GitHub, Google Drive… nếu bạn không tải file lên.
            </p>
            <Input
              id="sub-url"
              placeholder="https://github.com/..."
              value={url}
              aria-invalid={!validUrl}
              onChange={(event) => setUrl(event.target.value)}
            />
            {!validUrl && (
              <p className="text-xs text-destructive">
                Link phải bắt đầu bằng http:// hoặc https://
              </p>
            )}
          </div>

          {!file && trimmedUrl === '' && (
            <p className="text-xs text-muted-foreground">
              Cần ít nhất một trong hai: tải tệp lên, hoặc dán link.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            disabled={create.isPending}
            onClick={onClose}
          >
            Huỷ
          </Button>
          <Button disabled={!ready || create.isPending} onClick={submit}>
            {create.isPending && <Loader2 className="animate-spin" />}
            Nộp
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
