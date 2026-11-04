'use client';

import React, { useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Download,
  FileCheck2,
  FileText,
  Loader2,
  UploadCloud,
} from 'lucide-react';
import { toast } from 'sonner';
import { useMyGroupOutline, useSubmitOutline } from '@/lib/api/outlines';
import type { OutlineStatus } from '@/lib/api/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

function formatBytes(bytes?: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateString?: string | null): string {
  if (!dateString) return '';
  const d = new Date(dateString);
  return d.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function OutlineStatusBadge({ status }: { status: OutlineStatus }) {
  switch (status) {
    case 'APPROVED_BY_LECTURER':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
          <CheckCircle2 className="size-3.5" />
          Đã duyệt
        </span>
      );
    case 'SUBMITTED':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400 whitespace-nowrap">
          <Clock className="size-3.5" />
          Chờ GVHD duyệt
        </span>
      );
    case 'NEEDS_REVISION':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-600 dark:text-rose-400 whitespace-nowrap">
          <AlertCircle className="size-3.5" />
          Cần chỉnh sửa
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-neutral-400 whitespace-nowrap">
          <FileText className="size-3.5" />
          Chưa nộp
        </span>
      );
  }
}

export function StudentOutlineCard() {
  const { data, isLoading } = useMyGroupOutline();
  const submitMutation = useSubmitOutline();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  if (isLoading) {
    return (
      <Card className="border-border/60 bg-card/60">
        <CardContent className="flex justify-center py-8">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!data?.hasGroup || !data.hasTopic || !data.group) {
    return null;
  }

  const outline = data.outline;
  const status: OutlineStatus = outline?.status ?? 'NOT_SUBMITTED';
  const isApproved = status === 'APPROVED_BY_LECTURER';

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 25 * 1024 * 1024) {
        toast.error('Dung lượng file tối đa là 25MB.');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUploadSubmit = async () => {
    if (!selectedFile) {
      toast.error('Vui lòng chọn file bản scan Đề cương M03 đã có chữ ký.');
      return;
    }

    try {
      await submitMutation.mutateAsync(selectedFile);
      toast.success('Nộp bản scan Đề cương M03 thành công');
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      toast.error(err?.message || 'Có lỗi xảy ra khi nộp đề cương.');
    }
  };

  return (
    <Card className="border-slate-300 dark:border-neutral-800 bg-white dark:bg-[#141414] shadow-xs">
      <CardHeader className="pb-3 border-b border-slate-200 dark:border-neutral-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <FileCheck2 className="size-4.5 text-emerald-500" />
            <CardTitle className="text-sm font-bold tracking-tight text-slate-900 dark:text-neutral-100">
              Đề cương đồ án (M03)
            </CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1.5 px-2"
              render={
                <a
                  href="/templates/M03_Mau_De_Cuong.pdf"
                  download="M03_Mau_De_Cuong_Thuc_Hien_Do_An.pdf"
                  target="_blank"
                />
              }
            >
              <Download className="size-3.5" />
              Tải mẫu M03 (.pdf)
            </Button>
            <OutlineStatusBadge status={status} />
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        {/* Phản hồi từ GVHD nếu có yêu cầu chỉnh sửa */}
        {status === 'NEEDS_REVISION' && outline?.lecturerFeedback && (
          <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-3 text-xs space-y-1">
            <div className="flex items-center gap-1.5 font-medium text-rose-400">
              <AlertCircle className="size-3.5 shrink-0" />
              <span>Góp ý từ GVHD:</span>
            </div>
            <p className="text-zinc-300 pl-5 leading-relaxed whitespace-pre-line">
              {outline.lecturerFeedback}
            </p>
          </div>
        )}

        {/* Thông báo khi đã được duyệt */}
        {isApproved && (
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-400 font-medium">
              <CheckCircle2 className="size-4 shrink-0" />
              <span>Đề cương đã được GVHD phê duyệt</span>
            </div>
            {outline?.approvedAt && (
              <span className="text-zinc-400 text-[11px]">
                {formatDate(outline.approvedAt)}
              </span>
            )}
          </div>
        )}

        {/* Thông tin bản nộp hiện tại */}
        {outline?.attachmentUrl && (
          <div className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border/40 bg-muted/20">
            <div className="flex items-center gap-2.5 min-w-0">
              <FileText className="size-4 text-emerald-500 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-medium truncate text-foreground">
                  {outline.fileName || 'Ban_scan_De_cuong_M03.pdf'}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {formatBytes(outline.fileSize)}
                  {outline.submittedAt && ` • Nộp lúc ${formatDate(outline.submittedAt)}`}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1.5 shrink-0"
              render={
                <a
                  href={outline.attachmentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                />
              }
            >
              Xem file scan
            </Button>
          </div>
        )}

        {/* Khung nộp file (chỉ hiển thị khi chưa duyệt) */}
        {!isApproved && (
          <div className="space-y-3 pt-1">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".pdf,.docx,.doc,image/*"
              className="hidden"
            />

            <div
              onClick={() => fileInputRef.current?.click()}
              className="rounded-lg border border-dashed border-border/60 hover:border-primary/50 bg-muted/10 hover:bg-muted/20 p-5 text-center cursor-pointer transition-colors"
            >
              <UploadCloud className="size-6 mx-auto text-muted-foreground/60 mb-1.5" />
              <p className="text-xs font-medium text-foreground">
                {selectedFile ? selectedFile.name : 'Chọn file scan đề cương đã có chữ ký GVHD'}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {selectedFile
                  ? formatBytes(selectedFile.size)
                  : 'PDF hoặc ảnh scan rõ nét (Tối đa 25MB)'}
              </p>
            </div>

            {selectedFile && (
              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => {
                    setSelectedFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                >
                  Hủy
                </Button>
                <Button
                  size="sm"
                  className="h-8 text-xs gap-1.5"
                  onClick={handleUploadSubmit}
                  disabled={submitMutation.isPending}
                >
                  {submitMutation.isPending && (
                    <Loader2 className="size-3.5 animate-spin mr-1" />
                  )}
                  Nộp đề cương
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
