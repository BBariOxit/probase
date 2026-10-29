'use client';

import { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileUp,
  Loader2,
  Sparkles,
  Upload,
} from 'lucide-react';
import {
  downloadEligibleTemplate,
  useImportEligibleStudents,
} from '@/lib/api/eligible-students';
import { useActiveSemester, useRoundsForSemester } from '@/lib/api/master-data';
import type { ImportEligibleStudentsResult } from '@/lib/api/types';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultRoundId?: number;
  onSuccess?: () => void;
}

export function EligibleStudentsImportDialog({
  open,
  onOpenChange,
  defaultRoundId,
  onSuccess,
}: Props) {
  const semester = useActiveSemester();
  const { data: rounds } = useRoundsForSemester(semester?.id);

  const [selectedRoundId, setSelectedRoundId] = useState<number | null>(
    defaultRoundId ?? null,
  );
  const [file, setFile] = useState<File | null>(null);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);
  const [result, setResult] = useState<ImportEligibleStudentsResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const importMutation = useImportEligibleStudents();

  // Reset when dialog opens
  function handleOpenChange(newOpen: boolean) {
    if (!newOpen) {
      setFile(null);
      setResult(null);
      setErrorMsg(null);
    }
    onOpenChange(newOpen);
  }

  async function handleDownloadTemplate() {
    try {
      setIsDownloadingTemplate(true);
      const targetRoundId = selectedRoundId ?? rounds?.[0]?.id;
      await downloadEligibleTemplate(targetRoundId);
    } catch {
      setErrorMsg('Không thể tải file mẫu. Vui lòng thử lại sau.');
    } finally {
      setIsDownloadingTemplate(false);
    }
  }

  async function handleSubmit() {
    const targetRoundId = selectedRoundId ?? rounds?.[0]?.id;
    if (!targetRoundId) {
      setErrorMsg('Vui lòng chọn đợt đăng ký đồ án.');
      return;
    }
    if (!file) {
      setErrorMsg('Vui lòng chọn file Excel hoặc CSV danh sách sinh viên.');
      return;
    }

    setErrorMsg(null);
    try {
      const res = await importMutation.mutateAsync({
        roundId: targetRoundId,
        file,
      });
      setResult(res);
      onSuccess?.();
    } catch (err: any) {
      setErrorMsg(
        err?.message ||
          'Đã xảy ra lỗi trong quá trình import dữ liệu. Vui lòng kiểm tra lại file.',
      );
    }
  }

  const effectiveRoundId = selectedRoundId ?? rounds?.[0]?.id;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <FileSpreadsheet className="size-5 text-primary" />
            Import danh sách SV đủ điều kiện làm đồ án
          </DialogTitle>
          <DialogDescription>
            Nhập danh sách sinh viên từ file Excel của Phòng Đào tạo thẩm định.
            Hệ thống sẽ tự động kích hoạt trạng thái đủ điều kiện và tự động khởi tạo
            tài khoản sinh viên nếu chưa có trong hệ thống.
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="space-y-4 py-3">
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-emerald-950 dark:text-emerald-200">
              <div className="flex items-center gap-2 font-semibold">
                <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400" />
                <span>Import danh sách thành công!</span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Đã xử lý tổng cộng {result.totalRows} hàng dữ liệu.
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
                <div className="rounded-lg bg-background/80 p-2.5 text-center shadow-xs">
                  <span className="block text-xs text-muted-foreground">Đủ điều kiện</span>
                  <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                    {result.importedCount}
                  </span>
                </div>
                <div className="rounded-lg bg-background/80 p-2.5 text-center shadow-xs">
                  <span className="block text-xs text-muted-foreground">Tài khoản tạo mới</span>
                  <span className="text-lg font-bold text-primary">
                    {result.createdAccountsCount}
                  </span>
                </div>
                <div className="col-span-2 rounded-lg bg-background/80 p-2.5 text-center shadow-xs sm:col-span-1">
                  <span className="block text-xs text-muted-foreground">Hàng lỗi</span>
                  <span className="text-lg font-bold text-destructive">
                    {result.errorCount}
                  </span>
                </div>
              </div>
            </div>

            {result.errors.length > 0 && (
              <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs">
                <p className="font-semibold text-destructive">
                  Danh sách hàng không thể import ({result.errors.length}):
                </p>
                <ul className="mt-1 max-h-32 space-y-1 overflow-y-auto">
                  {result.errors.map((err, idx) => (
                    <li key={idx} className="text-muted-foreground">
                      - Dòng {err.row}: {err.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setFile(null);
                  setResult(null);
                }}
              >
                Import thêm file khác
              </Button>
              <Button onClick={() => handleOpenChange(false)}>Hoàn tất</Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {errorMsg && (
              <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="size-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Select round */}
            <div className="space-y-1.5">
              <Label htmlFor="round-select">
                Đợt đăng ký đồ án áp dụng <span className="text-destructive">*</span>
              </Label>
              <Select
                value={effectiveRoundId ? String(effectiveRoundId) : ''}
                onValueChange={(val) => setSelectedRoundId(val ? Number(val) : null)}
              >
                <SelectTrigger id="round-select">
                  <SelectValue placeholder="Chọn đợt đồ án…" />
                </SelectTrigger>
                <SelectContent>
                  {rounds?.map((round) => (
                    <SelectItem key={round.id} value={String(round.id)}>
                      {round.projectType.name} (Học kỳ: {semester?.name})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Template action */}
            <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 p-3">
              <div className="space-y-0.5">
                <p className="text-sm font-medium">Chưa có file chuẩn format DLU?</p>
                <p className="text-xs text-muted-foreground">
                  File mẫu gồm các cột MSSV, Họ tên, Lớp, Email, Ghi chú.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDownloadTemplate}
                disabled={isDownloadingTemplate}
                className="gap-1.5 shrink-0"
              >
                {isDownloadingTemplate ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Download className="size-3.5 text-primary" />
                )}
                Tải file mẫu Excel
              </Button>
            </div>

            {/* File dropzone */}
            <div className="space-y-1.5">
              <Label>
                File danh sách sinh viên (.xlsx hoặc .csv){' '}
                <span className="text-destructive">*</span>
              </Label>
              <label
                htmlFor="eligible-file-input"
                className="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border/80 bg-background/50 p-6 text-center transition-all hover:border-primary/60 hover:bg-muted/40"
              >
                {file ? (
                  <div className="space-y-1 text-center">
                    <FileSpreadsheet className="mx-auto size-9 text-emerald-600 dark:text-emerald-400" />
                    <p className="text-sm font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(file.size / 1024).toFixed(1)} KB — Bấm để chọn file khác
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Upload className="size-5" />
                    </div>
                    <p className="text-sm font-medium">
                      Kéo thả file vào đây hoặc <span className="text-primary underline">chọn từ máy tính</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Chấp nhận file Excel (.xlsx) hoặc file CSV (.csv) dung lượng tối đa 10MB
                    </p>
                  </div>
                )}
                <input
                  id="eligible-file-input"
                  type="file"
                  accept=".xlsx,.csv"
                  className="hidden"
                  onChange={(e) => {
                    const picked = e.target.files?.[0];
                    if (picked) {
                      setFile(picked);
                      setErrorMsg(null);
                    }
                  }}
                />
              </label>
            </div>

            <div className="rounded-lg bg-blue-500/10 p-3 text-xs text-blue-900 dark:text-blue-200">
              <div className="flex items-center gap-1.5 font-semibold">
                <Sparkles className="size-3.5 text-blue-600 dark:text-blue-400" />
                <span>Tiện ích tự động hóa 2-trong-1</span>
              </div>
              <p className="mt-1 text-muted-foreground leading-relaxed">
                Sinh viên chưa có tài khoản trong hệ thống sẽ được tự động kích hoạt tài khoản
                mới với mật khẩu tạm thời. Sinh viên đã có tài khoản sẽ được gắn trạng thái đủ
                điều kiện và nhận thông báo tức thời.
              </p>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={importMutation.isPending}
              >
                Hủy
              </Button>
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={!file || !effectiveRoundId || importMutation.isPending}
                className="gap-2"
              >
                {importMutation.isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Đang xử lý import…
                  </>
                ) : (
                  <>
                    <FileUp className="size-4" />
                    Bắt đầu Import
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
