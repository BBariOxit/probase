'use client';

import { useRef, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
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
  useCommitEligibleImport,
  useParseEligibleImport,
  usePreviewEligibleImport,
  useReanalyzeEligibleImport,
} from '@/lib/api/eligible-students';
import { useActiveSemester, useRoundsForSemester } from '@/lib/api/master-data';
import type {
  CommitEligibleImportResult,
  EligibleColumnMapping,
  EligibleField,
  EligibleFieldSuggestion,
  EligibleImportColumnDescriptor,
  EligibleNameMode,
  ParseEligibleImportResult,
  PreviewEligibleImportResult,
} from '@/lib/api/types';
import {
  EligibleImportColumnMapping,
  findDuplicateMappedColumns,
  hasMissingRequiredMapping,
} from '@/components/admin/eligible-import-column-mapping';
import { EligibleImportPreviewTable } from '@/components/admin/eligible-import-preview-table';
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
import { cn } from '@/lib/utils';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_EXTENSIONS = ['.xlsx', '.csv'] as const;

type WizardStep = 'upload' | 'mapping' | 'preview' | 'result';

const STEPS: { key: WizardStep; label: string }[] = [
  { key: 'upload', label: 'Tải file' },
  { key: 'mapping', label: 'Ánh xạ cột' },
  { key: 'preview', label: 'Xem trước' },
  { key: 'result', label: 'Kết quả' },
];

const EMPTY_MAPPING: EligibleColumnMapping = {
  studentCodeCol: null,
  fullNameCol: null,
  surnameCol: null,
  givenNameCol: null,
  classCol: null,
  emailCol: null,
  noteCol: null,
};

function buildMappingFromSuggestions(
  suggestions: Record<EligibleField, EligibleFieldSuggestion>,
): EligibleColumnMapping {
  return {
    studentCodeCol: suggestions.studentCode.columnIndex,
    fullNameCol: suggestions.fullName.columnIndex,
    surnameCol: suggestions.surname.columnIndex,
    givenNameCol: suggestions.givenName.columnIndex,
    classCol: suggestions.class.columnIndex,
    emailCol: suggestions.email.columnIndex,
    noteCol: suggestions.note.columnIndex,
  };
}

function StepIndicator({ current }: { current: WizardStep }) {
  const currentIdx = STEPS.findIndex((s) => s.key === current);
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-xs">
      {STEPS.map((step, idx) => {
        const done = idx < currentIdx;
        const active = idx === currentIdx;
        return (
          <span key={step.key} className="flex items-center gap-1.5">
            <span
              className={cn(
                'flex size-5 items-center justify-center rounded-full text-[10px] font-semibold',
                done
                  ? 'bg-primary text-primary-foreground'
                  : active
                    ? 'bg-primary/15 text-primary ring-1 ring-primary'
                    : 'bg-muted text-muted-foreground',
              )}
            >
              {done ? '✓' : idx + 1}
            </span>
            <span
              className={
                active ? 'font-medium text-foreground' : 'text-muted-foreground'
              }
            >
              {step.label}
            </span>
            {idx < STEPS.length - 1 && (
              <span className="text-muted-foreground/40">›</span>
            )}
          </span>
        );
      })}
    </div>
  );
}

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

  const [step, setStep] = useState<WizardStep>('upload');
  const [selectedRoundId, setSelectedRoundId] = useState<number | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Wizard session state
  const [parseResult, setParseResult] =
    useState<ParseEligibleImportResult | null>(null);
  const [headerRowIndex, setHeaderRowIndex] = useState<number>(1);
  const [columns, setColumns] = useState<EligibleImportColumnDescriptor[]>([]);
  const [suggestions, setSuggestions] = useState<
    Record<EligibleField, EligibleFieldSuggestion> | null
  >(null);
  const [nameMode, setNameMode] = useState<EligibleNameMode>('full');
  const [mapping, setMapping] = useState<EligibleColumnMapping>(EMPTY_MAPPING);
  const [previewResult, setPreviewResult] =
    useState<PreviewEligibleImportResult | null>(null);
  const [commitResult, setCommitResult] =
    useState<CommitEligibleImportResult | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseMutation = useParseEligibleImport();
  const reanalyzeMutation = useReanalyzeEligibleImport();
  const previewMutation = usePreviewEligibleImport();
  const commitMutation = useCommitEligibleImport();

  const effectiveRoundId = selectedRoundId ?? defaultRoundId ?? rounds?.[0]?.id;
  const isBusy =
    parseMutation.isPending ||
    reanalyzeMutation.isPending ||
    previewMutation.isPending ||
    commitMutation.isPending;

  function clearSelectedFile() {
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  function resetWizardState() {
    setStep('upload');
    setErrorMsg(null);
    setParseResult(null);
    setHeaderRowIndex(1);
    setColumns([]);
    setSuggestions(null);
    setNameMode('full');
    setMapping(EMPTY_MAPPING);
    setPreviewResult(null);
    setCommitResult(null);
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
      if (isBusy) return;
      setSelectedRoundId(null);
      clearSelectedFile();
      setIsDragging(false);
      resetWizardState();
    }
    onOpenChange(newOpen);
  }

  async function handleDownloadTemplate() {
    try {
      setIsDownloadingTemplate(true);
      await downloadEligibleTemplate(effectiveRoundId);
    } catch {
      setErrorMsg('Không thể tải file mẫu. Vui lòng thử lại sau.');
    } finally {
      setIsDownloadingTemplate(false);
    }
  }

  async function handleParse() {
    if (!effectiveRoundId) {
      setErrorMsg('Vui lòng chọn đợt đăng ký đồ án.');
      return;
    }
    if (!file) {
      setErrorMsg('Vui lòng chọn file Excel hoặc CSV danh sách sinh viên.');
      return;
    }

    setErrorMsg(null);
    try {
      const res = await parseMutation.mutateAsync({
        roundId: effectiveRoundId,
        file,
      });
      setParseResult(res);
      setHeaderRowIndex(res.headerRowIndex);
      setColumns(res.columns);
      setSuggestions(res.suggestions);
      setNameMode(res.nameMode);
      setMapping(buildMappingFromSuggestions(res.suggestions));
      setStep('mapping');
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Không thể đọc cấu trúc file. Vui lòng kiểm tra lại định dạng.',
      );
    }
  }

  async function handleChangeHeaderRow(nextHeaderRowIndex: number) {
    if (!effectiveRoundId || !parseResult) return;
    setErrorMsg(null);
    try {
      const res = await reanalyzeMutation.mutateAsync({
        roundId: effectiveRoundId,
        sessionId: parseResult.sessionId,
        headerRowIndex: nextHeaderRowIndex,
      });
      setHeaderRowIndex(res.headerRowIndex);
      setColumns(res.columns);
      setSuggestions(res.suggestions);
      setNameMode(res.nameMode);
      setMapping(buildMappingFromSuggestions(res.suggestions));
      setParseResult((prev) =>
        prev ? { ...prev, totalDataRows: res.totalDataRows } : prev,
      );
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Không thể phân tích lại dòng tiêu đề đã chọn.',
      );
    }
  }

  async function handlePreview() {
    if (!effectiveRoundId || !parseResult) return;
    setErrorMsg(null);
    try {
      const res = await previewMutation.mutateAsync({
        roundId: effectiveRoundId,
        sessionId: parseResult.sessionId,
        headerRowIndex,
        nameMode,
        mapping,
      });
      setPreviewResult(res);
      setStep('preview');
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Không thể kiểm tra dữ liệu. Vui lòng kiểm tra lại ánh xạ cột.',
      );
    }
  }

  async function handleCommit() {
    if (!effectiveRoundId || !parseResult || !previewResult) return;
    setErrorMsg(null);
    try {
      const res = await commitMutation.mutateAsync({
        roundId: effectiveRoundId,
        sessionId: parseResult.sessionId,
        headerRowIndex,
        nameMode,
        mapping,
      });
      setCommitResult(res);
      setStep('result');
      onSuccess?.();
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Đã xảy ra lỗi khi lưu dữ liệu import.',
      );
    }
  }

  const duplicateCols = findDuplicateMappedColumns(mapping, nameMode);
  const missingRequired = hasMissingRequiredMapping(mapping, nameMode);

  const isZeroImported =
    commitResult !== null &&
    commitResult.importedCount === 0 &&
    commitResult.errorCount > 0;
  const isPartialSuccess =
    commitResult !== null &&
    commitResult.importedCount > 0 &&
    commitResult.errorCount > 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className={cn(
          'transition-all duration-200',
          step === 'mapping' || step === 'preview'
            ? 'sm:max-w-3xl'
            : 'sm:max-w-xl',
        )}
      >
        <DialogHeader className="space-y-2">
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <FileSpreadsheet className="size-5 text-primary" />
            Import danh sách SV đủ điều kiện làm đồ án
          </DialogTitle>
          <DialogDescription className="sr-only">
            Wizard 4 bước import danh sách sinh viên đủ điều kiện làm đồ án
          </DialogDescription>
          <StepIndicator current={step} />
        </DialogHeader>

        <div className="max-h-[65vh] space-y-4 overflow-y-auto py-1 pr-1">
          {errorMsg && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/25 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* ── Step 1: Upload ── */}
          {step === 'upload' && (
            <div className="space-y-4">
              <div className="flex items-start gap-2 rounded-lg border border-blue-200/80 bg-blue-50/70 p-3 text-xs text-slate-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-neutral-300">
                <Info className="mt-0.5 size-4 shrink-0 text-primary" />
                <p className="leading-relaxed">
                  Hệ thống hỗ trợ tự động nhận diện tiêu đề lệch tên / lỗi gõ nhẹ
                  và cho phép bạn kiểm tra, ánh xạ lại cột trước khi lưu vào DB.
                  Sinh viên mới sẽ được tạo tài khoản theo email{' '}
                  <strong className="font-semibold">&lt;MSSV&gt;@dlu.edu.vn</strong>{' '}
                  để đăng nhập bằng Google SSO.
                </p>
              </div>

              {/* Select round */}
              <div className="space-y-1.5">
                <Label htmlFor="round-select">
                  Đợt đăng ký đồ án áp dụng{' '}
                  <span className="text-destructive">*</span>
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
                        const round = rounds?.find(
                          (r) => String(r.id) === String(val),
                        );
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

              {/* File dropzone + Template link */}
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
                        <span className="text-primary underline">
                          chọn từ máy tính
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Chấp nhận Excel (.xlsx) hoặc CSV (.csv), tối đa 10MB và
                        2.000 dòng
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
            </div>
          )}

          {/* ── Step 2: Column Mapping ── */}
          {step === 'mapping' && parseResult && suggestions && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                File <strong className="text-foreground">{parseResult.fileName}</strong>{' '}
                có <strong className="text-foreground">{parseResult.totalDataRows}</strong>{' '}
                hàng dữ liệu cho đợt{' '}
                <strong className="text-foreground">
                  {parseResult.round.projectTypeName}
                </strong>
                . Vui lòng xác nhận ánh xạ cột bên dưới trước khi xem trước.
              </p>

              <EligibleImportColumnMapping
                columns={columns}
                suggestions={suggestions}
                mapping={mapping}
                nameMode={nameMode}
                headerRowIndex={headerRowIndex}
                candidateHeaderRows={parseResult.candidateHeaderRows}
                isReanalyzing={reanalyzeMutation.isPending}
                onChangeMapping={setMapping}
                onChangeNameMode={setNameMode}
                onChangeHeaderRow={handleChangeHeaderRow}
              />
            </div>
          )}

          {/* ── Step 3: Preview ── */}
          {step === 'preview' && previewResult && (
            <EligibleImportPreviewTable preview={previewResult} />
          )}

          {/* ── Step 4: Result ── */}
          {step === 'result' && commitResult && (
            <div className="space-y-4">
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
                  Đã xử lý tổng cộng {commitResult.totalRows} hàng dữ liệu.
                  {commitResult.createdAccountsCount > 0 &&
                    ' Sinh viên mới có thể đăng nhập ngay bằng Gmail DLU (@dlu.edu.vn).'}
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
                  <div className="rounded-lg bg-background/80 p-2.5 text-center shadow-xs">
                    <span className="block text-xs text-muted-foreground">
                      Đủ điều kiện
                    </span>
                    <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                      {commitResult.importedCount}
                    </span>
                  </div>
                  <div className="rounded-lg bg-background/80 p-2.5 text-center shadow-xs">
                    <span className="block text-xs text-muted-foreground">
                      Tài khoản tạo mới
                    </span>
                    <span className="text-lg font-bold text-primary">
                      {commitResult.createdAccountsCount}
                    </span>
                  </div>
                  <div className="col-span-2 rounded-lg bg-background/80 p-2.5 text-center shadow-xs sm:col-span-1">
                    <span className="block text-xs text-muted-foreground">
                      Hàng lỗi
                    </span>
                    <span className="text-lg font-bold text-destructive">
                      {commitResult.errorCount}
                    </span>
                  </div>
                </div>
              </div>

              {commitResult.errors.length > 0 && (
                <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs">
                  <p className="font-semibold text-destructive">
                    Danh sách hàng không thể import ({commitResult.errors.length}):
                  </p>
                  <ul className="mt-1 max-h-36 space-y-1 overflow-y-auto">
                    {commitResult.errors.map((err, idx) => (
                      <li key={idx} className="text-muted-foreground">
                        - Dòng {err.row}: {err.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 pt-2">
          {step === 'upload' && (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isBusy}
              >
                Hủy
              </Button>
              <Button
                type="button"
                onClick={handleParse}
                disabled={!file || !effectiveRoundId || parseMutation.isPending}
                className="gap-2"
              >
                {parseMutation.isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Đang phân tích file…
                  </>
                ) : (
                  <>
                    Phân tích cột
                    <ArrowRight className="size-4" />
                  </>
                )}
              </Button>
            </>
          )}

          {step === 'mapping' && (
            <>
              <Button
                type="button"
                variant="outline"
                disabled={isBusy}
                onClick={() => {
                  setErrorMsg(null);
                  setStep('upload');
                }}
              >
                <ArrowLeft className="size-4" />
                Chọn file khác
              </Button>
              <Button
                type="button"
                disabled={
                  isBusy || missingRequired || duplicateCols.size > 0
                }
                onClick={handlePreview}
                className="gap-2"
              >
                {previewMutation.isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Đang kiểm tra dữ liệu…
                  </>
                ) : (
                  <>
                    Xem trước dữ liệu
                    <ArrowRight className="size-4" />
                  </>
                )}
              </Button>
            </>
          )}

          {step === 'preview' && previewResult && (
            <>
              <Button
                type="button"
                variant="outline"
                disabled={isBusy}
                onClick={() => {
                  setErrorMsg(null);
                  setStep('mapping');
                }}
              >
                <ArrowLeft className="size-4" />
                Sửa ánh xạ cột
              </Button>
              <Button
                type="button"
                disabled={isBusy || previewResult.validCount === 0}
                onClick={handleCommit}
                className="gap-2"
              >
                {commitMutation.isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Đang lưu vào hệ thống…
                  </>
                ) : (
                  <>
                    <FileUp className="size-4" />
                    Xác nhận Import {previewResult.validCount} sinh viên
                  </>
                )}
              </Button>
            </>
          )}

          {step === 'result' && (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  clearSelectedFile();
                  resetWizardState();
                }}
              >
                Import thêm file khác
              </Button>
              <Button type="button" onClick={() => handleOpenChange(false)}>
                Hoàn tất
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
