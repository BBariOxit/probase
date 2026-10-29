'use client';

import { useState } from 'react';
import { FileUp, GitBranch, Loader2, UploadCloud } from 'lucide-react';
import { toast } from 'sonner';
import { useSubmitProgressReport } from '@/lib/api/progress';
import type { ProgressReportItem } from '@/lib/api/types';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ProgressReportModalProps {
  stage: 'STAGE_1' | 'STAGE_2';
  existingReport?: ProgressReportItem | null;
  trigger?: React.ReactNode;
}

export function ProgressReportModal({
  stage,
  existingReport,
  trigger,
}: ProgressReportModalProps) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [sourceCodeUrl, setSourceCodeUrl] = useState(
    existingReport?.sourceCodeUrl ?? '',
  );

  const submitMutation = useSubmitProgressReport();
  const isPending = submitMutation.isPending;

  const stageTitle =
    stage === 'STAGE_1'
      ? 'Tiến độ lần 1 (Tuần 5–6)'
      : 'Tiến độ lần 2 (Tuần 9–10 - Hội đồng)';

  const stageDesc =
    stage === 'STAGE_1'
      ? 'Nộp báo cáo phân tích thiết kế, mô hình CSDL và giao diện prototype (trọng số 20%).'
      : 'Nộp bản demo chạy chức năng chính, CSDL hoàn chỉnh và dự thảo báo cáo (trọng số 30%).';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file && !existingReport?.reportFileUrl && !sourceCodeUrl.trim()) {
      toast.error('Vui lòng chọn file báo cáo hoặc nhập link mã nguồn.');
      return;
    }

    try {
      await submitMutation.mutateAsync({
        stage,
        file: file ?? undefined,
        sourceCodeUrl: sourceCodeUrl.trim() || undefined,
      });
      toast.success(`Đã nộp bài ${stageTitle} thành công.`);
      setOpen(false);
    } catch (err: any) {
      toast.error(err?.message || 'Có lỗi xảy ra khi nộp bài.');
    }
  };

  return (
    <>
      {trigger ? (
        <span onClick={() => setOpen(true)} className="inline-block cursor-pointer">
          {trigger}
        </span>
      ) : (
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={() => setOpen(true)}
        >
          <FileUp className="size-4" />
          {existingReport ? 'Nộp lại bài' : 'Nộp báo cáo'}
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Báo cáo {stageTitle}</DialogTitle>
          <DialogDescription>{stageDesc}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="reportFile">Tệp báo cáo (.pdf, .docx)</Label>
            <div className="relative rounded-lg border-2 border-dashed p-4 text-center hover:bg-muted/30 transition-colors">
              <input
                id="reportFile"
                type="file"
                accept=".pdf,.docx,.doc"
                className="absolute inset-0 cursor-pointer opacity-0"
                onChange={(e) => {
                  const selected = e.target.files?.[0];
                  if (selected) setFile(selected);
                }}
              />
              <UploadCloud className="mx-auto size-8 text-muted-foreground/60 mb-2" />
              {file ? (
                <div className="text-sm font-medium text-primary">
                  {file.name} ({(file.size / (1024 * 1024)).toFixed(2)} MB)
                </div>
              ) : existingReport?.reportFileName ? (
                <div className="text-xs text-muted-foreground">
                  Hiện tại: {existingReport.reportFileName} (Bấm để thay file)
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">
                  Kéo thả file hoặc bấm vào đây để chọn tệp
                </div>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sourceUrl" className="flex items-center gap-1.5">
              <GitBranch className="size-3.5" />
              Link kho mã nguồn / Bản demo (GitHub / GitLab)
            </Label>
            <Input
              id="sourceUrl"
              placeholder="https://github.com/..."
              value={sourceCodeUrl}
              onChange={(e) => setSourceCodeUrl(e.target.value)}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Hủy
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-1.5 size-4 animate-spin" />}
              Xác nhận nộp bài
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    </>
  );
}
