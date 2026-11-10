'use client';

import { useRef, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileUp,
  Info,
  Loader2,
  Upload,
} from 'lucide-react';
import {
  downloadEligibleTemplate,
  useImportEligibleStudents,
} from '@/lib/api/eligible-students';
import { useActiveSemester, useRoundsForSemester } from '@/lib/api/master-data';
import type { ImportEligibleStudentsResult } from '@/lib/api/types';
import { cn } from '@/lib/utils';
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

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_EXTENSIONS = ['.xlsx', '.csv'] as const;

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

  const [selectedRoundId, setSelectedRoundId] = useState<number | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);
  const [result, setResult] = useState<ImportEligibleStudentsResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const importMutation = useImportEligibleStudents();

  function clearSelectedFile() {
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  function validateAndPickFile(picked: File) {
    const lowerName = picked.name.toLowerCase();
    const hasAllowedExt = ALLOWED_EXTENSIONS.some((ext) =>
      lowerName.endsWith(ext),
    );
    if (!hasAllowedExt) {
      clearSelectedFile();
      setErrorMsg('Chỉ chấp nhận file Excel (.xlsx) hoặc CSV (.csv).');
      return;
    }

    if (picked.size === 0) {
      clearSelectedFile();
      setErrorMsg('File được chọn đang rỗng.');
      return;
    }

    if (picked.size > MAX_FILE_SIZE_BYTES) {
      clearSelectedFile();
      setErrorMsg('Dung lượng file vượt quá giới hạn 10MB.');
      return;
    }

    setFile(picked);
    setErrorMsg(null);
  }

  function handleOpenChange(newOpen: boolean) {
    if (!newOpen) {
      setSelectedRoundId(null);
      clearSelectedFile();
      setResult(null);
      setErrorMsg(null);
      setIsDragging(false);
    }
    onOpenChange(newOpen);
  }

  async function handleDownloadTemplate() {
    try {
      setIsDownloadingTemplate(true);
      const targetRoundId =
        selectedRoundId ?? defaultRoundId ?? rounds?.[0]?.id;
      await downloadEligibleTemplate(targetRoundId);
    } catch {
      setErrorMsg('Không thể tải file mẫu. Vui lòng thử lại sau.');
    } finally {
      setIsDownloadingTemplate(false);
    }
  }

  async function handleSubmit() {
    const targetRoundId = selectedRoundId ?? defaultRoundId ?? rounds?.[0]?.id;
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
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Đã xảy ra lỗi trong quá trình import dữ liệu. Vui lòng kiểm tra lại file.',
      );
    }
  }

  const effectiveRoundId = selectedRoundId ?? defaultRoundId ?? rounds?.[0]?.id;

  const isZeroImported =
    result !== null && result.importedCount === 0 && result.errorCount > 0;
  const isPartialSuccess =
    result !== null && result.importedCount > 0 && result.errorCount > 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <FileSpreadsheet className="size-5 text-primary" />
            Import danh sách SV đủ điều kiện làm đồ án
          </DialogTitle>
          <DialogDescription className="sr-only">
            Import danh sách sinh viên đủ điều kiện làm đồ án
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="space-y-4 py-3">
            <div
              className={cn(
                'rounded-xl border p-4',
                isZeroImported
                  ? 'border-destructive/30 bg-destructive/10 text-destructive'
                  : isPartialSuccess
                    ? 'border-amber-500/30 bg-amber-500/10 text-amber-950 dark:text-amber-200'
                    : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-950 dark:text-emerald-200',
              )}
            >
              <div className="flex items-center gap-2 font-semibold">
                {isZeroImported ? (
                  <>
                    <AlertCircle className="size-5 shrink-0 text-destructive" />
                    <span>Không thể import sinh viên nào từ file đã chọn</span>
                  </>
                ) : isPartialSuccess ? (
                  <>
                    <AlertTriangle className="size-5 shrink-0 text-amber-600 dark:text-amber-400" />
                    <span>Import hoàn tất (một số dòng có lỗi)</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <span>Import danh sách thành công!</span>
                  </>
                )}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Đã xử lý tổng cộng {result.totalRows} hàng dữ liệu.
                {result.createdAccountsCount > 0 &&
                  ' Sinh viên mới có thể đăng nhập ngay bằng Gmail DLU (@dlu.edu.vn).'}
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
                <div className="rounded-lg bg-background/80 p-2.5 text-center shadow-xs">
                  <span className="block text-xs text-muted-foreground">
                    Đủ điều kiện
                  </span>
                  <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                    {result.importedCount}
                  </span>
                </div>
                <div className="rounded-lg bg-background/80 p-2.5 text-center shadow-xs">
                  <span className="block text-xs text-muted-foreground">
                    Tài khoản tạo mới
                  </span>
                  <span className="text-lg font-bold text-primary">
                    {result.createdAccountsCount}
                  </span>
                </div>
                <div className="col-span-2 rounded-lg bg-background/80 p-2.5 text-center shadow-xs sm:col-span-1">
                  <span className="block text-xs text-muted-foreground">
                    Hàng lỗi
                  </span>
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
                <ul className="mt-1 max-h-36 space-y-1 overflow-y-auto">
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
                  clearSelectedFile();
                  setResult(null);
                  setErrorMsg(null);
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

            <div className="flex items-start gap-2 rounded-lg border border-blue-200/80 bg-blue-50/70 p-3 text-xs text-slate-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-neutral-300">
              <Info className="mt-0.5 size-4 shrink-0 text-primary" />
              <p className="leading-relaxed">
                Hệ thống tự động tạo tài khoản theo email{' '}
                <strong className="font-semibold">&lt;MSSV&gt;@dlu.edu.vn</strong>{' '}
                cho sinh viên mới. Sau khi import, sinh viên dùng{' '}
                <strong className="font-semibold">Đăng nhập với Gmail dlu</strong>{' '}
                để vào hệ thống; tài khoản chưa có trong hệ thống sẽ bị từ chối.
              </p>
            </div>

            {/* Select round */}
            <div className="space-y-1.5">
              <Label htmlFor="round-select">
                Đợt đăng ký đồ án áp dụng <span className="text-destructive">*</span>
              </Label>
              <Select
                value={effectiveRoundId ? String(effectiveRoundId) : ''}
                onValueChange={(val) =>
                  setSelectedRoundId(val ? Number(val) : null)
                }
              >
                <SelectTrigger id="round-select">
                  <SelectValue placeholder="Chọn đợt đồ án…">
                    {(val) => {
                      if (!val) return 'Chọn đợt đồ án…';
                      const round = rounds?.find((r) => String(r.id) === String(val));
                      if (!round) return 'Chọn đợt đồ án…';
                      return `${round.projectType.name} (Học kỳ: ${semester?.name ?? ''})`;
                    }}
                  </SelectValue>
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

            {/* File dropzone + Link "Tải file mẫu" nhỏ cạnh nhãn */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="eligible-file-input">
                  File danh sách sinh viên (.xlsx hoặc .csv){' '}
                  <span className="text-destructive">*</span>
                </Label>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  disabled={isDownloadingTemplate}
                  className="inline-flex cursor-pointer items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  {isDownloadingTemplate ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <Download className="size-3" />
                  )}
                  Tải file mẫu
                </button>
              </div>
              <label
                htmlFor="eligible-file-input"
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDragging(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDragging(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDragging(false);
                  const dropped = e.dataTransfer.files?.[0];
                  if (dropped) {
                    validateAndPickFile(dropped);
                  }
                }}
                className={cn(
                  'flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition-all',
                  isDragging
                    ? 'border-primary bg-primary/5'
                    : 'border-border/80 bg-background/50 hover:border-primary/60 hover:bg-muted/40',
                )}
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
                    <div className="mx-auto flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Upload className="size-4.5" />
                    </div>
                    <p className="text-sm font-medium">
                      Kéo thả file hoặc{' '}
                      <span className="text-primary underline">chọn từ máy tính</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Chấp nhận Excel (.xlsx) hoặc CSV (.csv), tối đa 10MB và 2.000 dòng
                    </p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  id="eligible-file-input"
                  type="file"
                  accept=".xlsx,.csv"
                  className="hidden"
                  onChange={(e) => {
                    const picked = e.target.files?.[0];
                    if (picked) {
                      validateAndPickFile(picked);
                    }
                  }}
                />
              </label>
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
