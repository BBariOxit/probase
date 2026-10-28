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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

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
        <Badge className="bg-emerald-600/15 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-500/30 gap-1.5 px-3 py-1 font-medium">
          <CheckCircle2 className="size-4" />
          Đã được GVHD phê duyệt
        </Badge>
      );
    case 'SUBMITTED':
      return (
        <Badge className="bg-amber-500/15 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 border border-amber-500/30 gap-1.5 px-3 py-1 font-medium">
          <Clock className="size-4" />
          Đã nộp bản scan — Chờ GVHD duyệt
        </Badge>
      );
    case 'NEEDS_REVISION':
      return (
        <Badge className="bg-rose-500/15 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300 border border-rose-500/30 gap-1.5 px-3 py-1 font-medium">
          <AlertCircle className="size-4" />
          Cần chỉnh sửa / Nộp lại
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="text-muted-foreground gap-1.5 px-3 py-1 font-medium">
          <FileText className="size-4" />
          Chưa nộp
        </Badge>
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
      <Card className="shadow-xs border-border/80">
        <CardContent className="flex justify-center py-10">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
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
      toast.success('Nộp bản scan Đề cương M03 thành công! Đã gửi thông báo cho GVHD.');
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      toast.error(err?.message || 'Có lỗi xảy ra khi nộp đề cương. Vui lòng thử lại.');
    }
  };

  return (
    <Card className="shadow-xs border-border/80 overflow-hidden">
      <CardHeader className="bg-muted/30 border-b pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <FileCheck2 className="size-5 text-emerald-600 dark:text-emerald-400" />
              <CardTitle className="text-lg font-semibold tracking-tight">
                Đề cương thực hiện đồ án (Mẫu M03)
              </CardTitle>
            </div>
            <CardDescription className="text-sm">
              Nộp bản scan Đề cương chi tiết có chữ ký xác nhận của GVHD để hoàn tất thủ tục giao đề tài (BR-08)
            </CardDescription>
          </div>
          <div>
            <OutlineStatusBadge status={status} />
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-6 space-y-6">
        {/* Phản hồi từ GVHD nếu có yêu cầu chỉnh sửa */}
        {status === 'NEEDS_REVISION' && outline?.lecturerFeedback && (
          <div className="rounded-lg border border-rose-300 bg-rose-50/70 p-4 dark:border-rose-900/50 dark:bg-rose-950/20">
            <div className="flex items-start gap-3">
              <AlertCircle className="size-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div className="space-y-1 text-sm">
                <p className="font-semibold text-rose-800 dark:text-rose-300">
                  Góp ý từ Giảng viên hướng dẫn:
                </p>
                <p className="text-rose-700 dark:text-rose-400 whitespace-pre-line leading-relaxed">
                  {outline.lecturerFeedback}
                </p>
                <p className="text-xs text-rose-600/80 dark:text-rose-400/80 pt-1">
                  Nhóm vui lòng cập nhật lại nội dung hoặc bổ sung chữ ký rồi upload bản scan mới bên dưới.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Thông báo chúc mừng khi đã được duyệt */}
        {isApproved && (
          <div className="rounded-lg border border-emerald-300 bg-emerald-50/70 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/20">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div className="text-sm">
                <p className="font-semibold text-emerald-800 dark:text-emerald-300">
                  Đề cương M03 đã được Giảng viên hướng dẫn phê duyệt chính thức
                </p>
                <p className="text-emerald-700 dark:text-emerald-400 text-xs mt-0.5">
                  Phê duyệt lúc {formatDate(outline?.approvedAt)}. Đề tài đã bước vào giai đoạn thực hiện chính thức!
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Quy trình 3 bước thực tế */}
        <div className="rounded-xl border bg-card/60 p-4 space-y-3">
          <p className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
            Quy trình thực hiện chuẩn Khoa CNTT - DLU
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-muted/40 border">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white text-xs font-bold">
                1
              </span>
              <div>
                <p className="font-medium text-foreground">Tải biểu mẫu M03</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Tải file Word chuẩn từ hệ thống và hoàn thiện 6 mục chuyên môn.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-muted/40 border">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white text-xs font-bold">
                2
              </span>
              <div>
                <p className="font-medium text-foreground">Xin chữ ký GVHD</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  In bản Word ra giấy, gặp GVHD trao đổi chuyên môn và xin chữ ký sống xác nhận.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-muted/40 border">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white text-xs font-bold">
                3
              </span>
              <div>
                <p className="font-medium text-foreground">Scan & Nộp file</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Scan hoặc chụp rõ bản đã ký thành file PDF và tải lên hệ thống để GVHD duyệt.
                </p>
              </div>
            </div>
          </div>

          <div className="pt-2 flex flex-wrap gap-2 items-center">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 text-emerald-700 dark:text-emerald-400 border-emerald-600/30 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
              render={
                <a
                  href="/templates/M03_Mau_De_Cuong.pdf"
                  download="M03_Mau_De_Cuong_Thuc_Hien_Do_An.pdf"
                  target="_blank"
                />
              }
            >
              <Download className="size-4" />
              Tải Biểu mẫu Đề cương M03 (.pdf)
            </Button>
            <span className="text-xs text-muted-foreground">
              Mẫu biểu số hóa chính thức của Khoa CNTT - Đại học Đà Lạt.
            </span>
          </div>
        </div>

        {/* Thông tin bản nộp hiện tại */}
        {outline?.attachmentUrl && (
          <div className="rounded-lg border bg-muted/20 p-4 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Bản scan đề cương đã nộp trên hệ thống
            </p>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-lg bg-emerald-600/10 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <FileText className="size-5" />
                </div>
                <div>
                  <p className="text-sm font-medium line-clamp-1">
                    {outline.fileName || 'Ban_scan_De_cuong_M03.pdf'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatBytes(outline.fileSize)}
                    {outline.submittedAt && ` • Nộp lúc ${formatDate(outline.submittedAt)}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  render={
                    <a
                      href={outline.attachmentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    />
                  }
                >
                  <Download className="size-4" />
                  Xem / Tải bản scan
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Khu vực upload file nộp mới / nộp lại (chỉ hiển thị khi chưa duyệt) */}
        {!isApproved && (
          <div className="space-y-3 pt-2">
            <p className="text-sm font-semibold text-foreground">
              {outline?.attachmentUrl ? 'Cập nhật lại bản scan Đề cương M03' : 'Nộp bản scan Đề cương M03 có chữ ký'}
            </p>

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-border/80 hover:border-emerald-500/60 dark:hover:border-emerald-500/50 rounded-xl p-6 text-center cursor-pointer transition-colors bg-muted/10 hover:bg-muted/30"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.doc,image/*"
                className="hidden"
                onChange={handleFileChange}
              />
              <UploadCloud className="size-8 mx-auto text-muted-foreground/70 mb-2" />
              {selectedFile ? (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Dung lượng: {formatBytes(selectedFile.size)} (Bấm để chọn file khác)
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">
                    Nhấp để chọn file scan hoặc kéo thả file vào đây
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Định dạng hỗ trợ: PDF, Word (.docx, .doc), hoặc ảnh scan rõ nét (Tối đa 25MB)
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-1">
              <Button
                onClick={handleUploadSubmit}
                disabled={!selectedFile || submitMutation.isPending}
                className="gap-2 bg-emerald-700 hover:bg-emerald-800 text-white"
              >
                {submitMutation.isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Đang tải lên...
                  </>
                ) : (
                  <>
                    <FileCheck2 className="size-4" />
                    {outline?.attachmentUrl ? 'Tải lên bản thay thế' : 'Xác nhận nộp Đề cương M03'}
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
