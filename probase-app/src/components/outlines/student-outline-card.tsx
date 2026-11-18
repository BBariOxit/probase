'use client';

import React, { useRef, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  Download,
  ExternalLink,
  FileCheck2,
  FileText,
  Loader2,
  RefreshCw,
  Upload,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useMyGroupOutline, useSubmitOutline } from '@/lib/api/outlines';
import type {
  OutlineStatus,
  SubmissionRequirement,
  TopicOutline,
} from '@/lib/api/types';
import { StatusPill, type StatusLabel } from '@/components/shared/status-pill';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const MAX_FILE_BYTES = 25 * 1024 * 1024;

const OUTLINE_STATUS_MAP: Record<OutlineStatus, StatusLabel> = {
  NOT_SUBMITTED: { label: 'Chưa nộp', tone: 'idle' },
  SUBMITTED: { label: 'Đã nộp', tone: 'success' },
  NEEDS_REVISION: { label: 'Cần nộp lại', tone: 'danger' },
  APPROVED_BY_LECTURER: { label: 'Đã nộp', tone: 'success' },
};

function findOutlineRequirement(
  requirements?: SubmissionRequirement[],
): SubmissionRequirement | null {
  if (!requirements || requirements.length === 0) return null;
  return (
    requirements.find((req) => {
      const lower = req.name.toLowerCase();
      return lower.includes('m03') || lower.includes('đề cương');
    }) ?? null
  );
}

function formatBytes(bytes?: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDateOnly(dateString: string): string {
  return new Date(dateString).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatDateTime(dateString?: string | null): string {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatSubmitter(outline: TopicOutline): string | null {
  const profile = outline.submittedBy?.studentProfile;
  if (profile) {
    return `${profile.fullName} (${profile.studentCode})`;
  }
  return outline.submittedBy?.email ?? null;
}

function getDeadlineState(
  dueAt: string,
  status: OutlineStatus,
): { text: string; toneClass: string } {
  const formatted = formatDateOnly(dueAt);
  if (status === 'APPROVED_BY_LECTURER' || status === 'SUBMITTED') {
    return {
      text: `Hạn nộp: ${formatted}`,
      toneClass: 'text-slate-600 dark:text-neutral-400',
    };
  }

  const now = new Date();
  const due = new Date(dueAt);
  const diffDays = Math.ceil(
    (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays < 0) {
    return {
      text: `Hạn nộp: ${formatted} (Quá hạn)`,
      toneClass: 'text-rose-600 dark:text-rose-400 font-medium',
    };
  }
  if (diffDays <= 3) {
    return {
      text: `Hạn nộp: ${formatted} (${diffDays === 0 ? 'Hôm nay' : `còn ${diffDays} ngày`})`,
      toneClass: 'text-amber-600 dark:text-amber-400 font-medium',
    };
  }
  return {
    text: `Hạn nộp: ${formatted}`,
    toneClass: 'text-slate-600 dark:text-neutral-400',
  };
}

export function StudentOutlineCard({
  requirements,
}: {
  requirements?: SubmissionRequirement[];
}) {
  const { data, isLoading } = useMyGroupOutline();
  const submitMutation = useSubmitOutline();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showReplace, setShowReplace] = useState(false);

  if (isLoading) {
    return (
      <section className="rounded-2xl border border-[#b8c0d0] dark:border-[#333338] bg-white dark:bg-[#1e1e1e] p-6 shadow-sm flex justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </section>
    );
  }

  if (!data?.hasGroup || !data.hasTopic || !data.group) {
    return null;
  }

  const outline = data.outline;
  const status: OutlineStatus = outline?.status ?? 'NOT_SUBMITTED';
  const statusMeta = OUTLINE_STATUS_MAP[status];
  const hasSubmitted =
    status === 'SUBMITTED' || status === 'APPROVED_BY_LECTURER';

  const m03Req = findOutlineRequirement(requirements);
  const deadline = m03Req?.dueAt ? getDeadlineState(m03Req.dueAt, status) : null;
  const submitter = outline ? formatSubmitter(outline) : null;
  const showUploadControls = !hasSubmitted || showReplace;

  function clearSelectedFile() {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      toast.error('Dung lượng tệp tối đa 25 MB.');
      e.target.value = '';
      return;
    }
    setSelectedFile(file);
  }

  async function handleUploadSubmit() {
    if (!selectedFile || submitMutation.isPending) {
      toast.error('Vui lòng chọn tệp đề cương để nộp.');
      return;
    }

    try {
      await submitMutation.mutateAsync(selectedFile);
      toast.success('Đã nộp đề cương M03 cho nhóm.');
      clearSelectedFile();
      setShowReplace(false);
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : 'Không thể nộp đề cương.',
      );
    }
  }

  const submittedAt = outline?.submittedAt ?? outline?.approvedAt;
  const metadataParts = [
    formatBytes(outline?.fileSize),
    submitter ? `Nộp bởi ${submitter}` : null,
    submittedAt ? formatDateTime(submittedAt) : null,
  ].filter(Boolean);

  return (
    <section className="rounded-2xl border border-[#b8c0d0] dark:border-[#333338] bg-white dark:bg-[#1e1e1e] p-5 sm:p-6 shadow-sm space-y-4">
      {/* Header: Tên mốc nộp, trạng thái, hạn nộp & tải biểu mẫu */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <FileCheck2 className="size-4.5 text-primary shrink-0" />
            <h2 className="font-heading text-base font-bold tracking-tight text-slate-900 dark:text-neutral-100">
              {m03Req?.name ?? 'Đề cương chi tiết (Mẫu M03)'}
            </h2>
            <StatusPill
              variant="text"
              label={statusMeta.label}
              tone={statusMeta.tone}
            />
          </div>

          {deadline && (
            <p
              className={cn(
                'flex items-center gap-1.5 text-xs pl-7',
                deadline.toneClass,
              )}
            >
              <Calendar className="size-3.5 shrink-0" />
              <span>{deadline.text}</span>
            </p>
          )}
        </div>

        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs font-medium shrink-0 self-start"
          render={
            <a
              href="/templates/M03_Mau_De_Cuong.pdf"
              download="M03_Mau_De_Cuong_Thuc_Hien_Do_An.pdf"
              target="_blank"
              rel="noopener noreferrer"
            />
          }
        >
          <Download className="size-3.5" />
          <span>Tải mẫu M03 (.pdf)</span>
        </Button>
      </header>

      {/* Phản hồi từ GVHD khi cần chỉnh sửa */}
      {status === 'NEEDS_REVISION' && outline?.lecturerFeedback && (
        <div className="border-t border-slate-200 dark:border-neutral-800 pt-3">
          <div className="border-l-2 border-rose-500 pl-3 py-0.5 space-y-1">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400">
              <AlertCircle className="size-3.5 shrink-0" />
              <span>Yêu cầu chỉnh sửa từ GVHD</span>
            </p>
            <p className="text-sm text-slate-700 dark:text-neutral-200 whitespace-pre-line leading-relaxed">
              {outline.lecturerFeedback}
            </p>
          </div>
        </div>
      )}

      {/* Bản nộp hiện tại của nhóm (dùng chung cho mọi thành viên) */}
      {outline?.attachmentUrl && (
        <div className="border-t border-slate-200 dark:border-neutral-800 pt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2.5 min-w-0">
            <FileText className="size-4 text-primary mt-0.5 shrink-0" />
            <div className="min-w-0 space-y-0.5">
              <p className="text-sm font-medium text-slate-900 dark:text-neutral-100 truncate">
                {outline.fileName || 'De_cuong_M03.pdf'}
              </p>
              {metadataParts.length > 0 && (
                <p className="text-xs text-slate-500 dark:text-neutral-400">
                  {metadataParts.join(' · ')}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs font-medium"
              render={
                <a
                  href={outline.attachmentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                />
              }
            >
              <ExternalLink className="size-3.5" />
              <span>Xem file</span>
            </Button>

            {hasSubmitted && !showReplace && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowReplace(true)}
                className="h-8 gap-1.5 text-xs font-medium cursor-pointer"
              >
                <RefreshCw className="size-3.5" />
                <span>Nộp lại</span>
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Khối chọn tệp & nộp bài */}
      {showUploadControls && (
        <div className="border-t border-slate-200 dark:border-neutral-800 pt-4 flex flex-col gap-2.5 sm:flex-row sm:items-center">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".pdf,.docx,.doc,image/*"
            className="hidden"
          />

          <div
            title="Hỗ trợ PDF, Word hoặc ảnh scan (tối đa 25MB)"
            className="flex w-full sm:flex-1 sm:min-w-0 items-center justify-between gap-2 h-10 shrink-0 px-3.5 rounded-lg border-[1.5px] border-slate-300 dark:border-neutral-700 bg-white dark:bg-[#141414] hover:border-slate-400 dark:hover:border-neutral-600 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-colors"
          >
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-1 min-w-0 items-center gap-2 h-full text-left cursor-pointer focus:outline-none"
            >
              <Upload className="size-4 text-slate-500 dark:text-neutral-400 shrink-0" />
              <span
                className={cn(
                  'truncate text-sm',
                  selectedFile
                    ? 'font-medium text-slate-900 dark:text-neutral-100'
                    : 'text-slate-500 dark:text-neutral-400',
                )}
              >
                {selectedFile
                  ? selectedFile.name
                  : hasSubmitted
                    ? 'Chọn tệp mới...'
                    : 'Chọn tệp bài nộp...'}
              </span>
            </button>

            {selectedFile && (
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-xs font-mono text-slate-500 dark:text-neutral-400">
                  {formatBytes(selectedFile.size)}
                </span>
                <button
                  type="button"
                  onClick={clearSelectedFile}
                  aria-label="Bỏ chọn tệp"
                  className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200 cursor-pointer"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0 justify-end">
            {hasSubmitted && showReplace && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  clearSelectedFile();
                  setShowReplace(false);
                }}
                disabled={submitMutation.isPending}
                className="h-10 px-4 text-sm cursor-pointer"
              >
                Hủy
              </Button>
            )}

            <Button
              type="button"
              onClick={handleUploadSubmit}
              disabled={!selectedFile || submitMutation.isPending}
              className="h-10 px-4 text-sm font-semibold gap-1.5 cursor-pointer"
            >
              {submitMutation.isPending && (
                <Loader2 className="size-4 animate-spin" />
              )}
              <span>
                {status === 'NEEDS_REVISION' || hasSubmitted
                  ? 'Nộp lại'
                  : 'Nộp đề cương'}
              </span>
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
