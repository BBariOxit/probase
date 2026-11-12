'use client';

import { useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileUp,
  Loader2,
  SlidersHorizontal,
  Upload,
} from 'lucide-react';
import { ApiError } from '@/lib/api/client';
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
import { FormError } from '@/components/shared/form-error';
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
  mode: EligibleNameMode,
): EligibleColumnMapping {
  return {
    studentCodeCol: suggestions.studentCode.columnIndex,
    fullNameCol: mode === 'full' ? suggestions.fullName.columnIndex : null,
    surnameCol: mode === 'split' ? suggestions.surname.columnIndex : null,
    givenNameCol: mode === 'split' ? suggestions.givenName.columnIndex : null,
    classCol: suggestions.class.columnIndex,
    emailCol: suggestions.email.columnIndex,
    noteCol: suggestions.note.columnIndex,
  };
}

function normalizeMappingForMode(
  mapping: EligibleColumnMapping,
  mode: EligibleNameMode,
): EligibleColumnMapping {
  return {
    studentCodeCol: mapping.studentCodeCol,
    fullNameCol: mode === 'full' ? mapping.fullNameCol : null,
    surnameCol: mode === 'split' ? mapping.surnameCol : null,
    givenNameCol: mode === 'split' ? mapping.givenNameCol : null,
    classCol: mapping.classCol,
    emailCol: mapping.emailCol,
    noteCol: mapping.noteCol,
  };
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
  const [mappingReturnStep, setMappingReturnStep] = useState<
    'upload' | 'preview'
  >('upload');
  const [selectedRoundId, setSelectedRoundId] = useState<number | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Import session state
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
  const [previewVersion, setPreviewVersion] = useState(0);
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
    setMappingReturnStep('upload');
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
      setErrorMsg('Chỉ chấp nhận file .xlsx hoặc .csv.');
      return;
    }

    if (picked.size === 0) {
      clearSelectedFile();
      setErrorMsg('File đang rỗng.');
      return;
    }

    if (picked.size > MAX_FILE_SIZE_BYTES) {
      clearSelectedFile();
      setErrorMsg('Dung lượng file vượt quá 10MB.');
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
      setErrorMsg('Không tải được file mẫu.');
    } finally {
      setIsDownloadingTemplate(false);
    }
  }

  async function handleContinueFromUpload() {
    if (!effectiveRoundId) {
      setErrorMsg('Vui lòng chọn đợt đồ án.');
      return;
    }
    if (!file) {
      setErrorMsg('Vui lòng chọn file danh sách.');
      return;
    }

    setErrorMsg(null);
    try {
      const res = await parseMutation.mutateAsync({
        roundId: effectiveRoundId,
        file,
      });
      const initialMapping = buildMappingFromSuggestions(
        res.suggestions,
        res.nameMode,
      );

      setParseResult(res);
      setHeaderRowIndex(res.headerRowIndex);
      setColumns(res.columns);
      setSuggestions(res.suggestions);
      setNameMode(res.nameMode);
      setMapping(initialMapping);

      const hasMissing = hasMissingRequiredMapping(initialMapping, res.nameMode);
      const hasDups =
        findDuplicateMappedColumns(initialMapping, res.nameMode).size > 0;

      if (!hasMissing && !hasDups) {
        const previewRes = await previewMutation.mutateAsync({
          roundId: effectiveRoundId,
          sessionId: res.sessionId,
          headerRowIndex: res.headerRowIndex,
          nameMode: res.nameMode,
          mapping: initialMapping,
        });
        setPreviewResult(previewRes);
        setPreviewVersion((v) => v + 1);
        setStep('preview');
        return;
      }

      setMappingReturnStep('upload');
      setStep('mapping');
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : 'Không đọc được file.',
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
      setMapping(buildMappingFromSuggestions(res.suggestions, res.nameMode));
      setParseResult((prev) =>
        prev ? { ...prev, totalDataRows: res.totalDataRows } : prev,
      );
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : 'Không đọc được dòng tiêu đề đã chọn.',
      );
    }
  }

  function handleNameModeChange(nextMode: EligibleNameMode) {
    setNameMode(nextMode);
    if (!suggestions) return;

    setMapping((prev) => {
      if (nextMode === 'full') {
        return {
          ...prev,
          fullNameCol: prev.fullNameCol ?? suggestions.fullName.columnIndex,
          surnameCol: null,
          givenNameCol: null,
        };
      }
      return {
        ...prev,
        fullNameCol: null,
        surnameCol: prev.surnameCol ?? suggestions.surname.columnIndex,
        givenNameCol: prev.givenNameCol ?? suggestions.givenName.columnIndex,
      };
    });
  }

  async function handlePreview() {
    if (!effectiveRoundId || !parseResult) return;
    const cleanMapping = normalizeMappingForMode(mapping, nameMode);
    setErrorMsg(null);
    try {
      const res = await previewMutation.mutateAsync({
        roundId: effectiveRoundId,
        sessionId: parseResult.sessionId,
        headerRowIndex,
        nameMode,
        mapping: cleanMapping,
      });
      setMapping(cleanMapping);
      setPreviewResult(res);
      setPreviewVersion((v) => v + 1);
      setStep('preview');
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : 'Không kiểm tra được dữ liệu.',
      );
    }
  }

  async function handleCommit() {
    if (!effectiveRoundId || !parseResult || !previewResult) return;
    const cleanMapping = normalizeMappingForMode(mapping, nameMode);
    setErrorMsg(null);
    try {
      const res = await commitMutation.mutateAsync({
        roundId: effectiveRoundId,
        sessionId: parseResult.sessionId,
        headerRowIndex,
        nameMode,
        mapping: cleanMapping,
      });
      setCommitResult(res);
      setStep('result');
      onSuccess?.();
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : 'Import dữ liệu thất bại.',
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
            ? 'sm:max-w-4xl'
            : 'sm:max-w-xl',
        )}
      >
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            Import sinh viên đủ điều kiện
          </DialogTitle>
          <DialogDescription className="sr-only">
            Import danh sách sinh viên đủ điều kiện làm đồ án
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[75vh] space-y-4 overflow-y-auto py-1 pr-1">
          <FormError message={errorMsg} />

          {/* ── Step 1: Upload ── */}
          {step === 'upload' && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="round-select">
                  Đợt đồ án <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={effectiveRoundId ? String(effectiveRoundId) : ''}
                  onValueChange={(val) =>
                    setSelectedRoundId(val ? Number(val) : null)
                  }
                >
                  <SelectTrigger id="round-select" className="w-full">
                    <SelectValue placeholder="Chọn đợt đồ án…">
                      {(val) => {
                        if (!val) return 'Chọn đợt đồ án…';
                        return (
                          rounds?.find((r) => String(r.id) === String(val))
                            ?.projectType.name ?? 'Chọn đợt đồ án…'
                        );
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {rounds?.map((round) => (
                      <SelectItem key={round.id} value={String(round.id)}>
                        <span className="flex items-center justify-between gap-2">
                          <span>{round.projectType.name}</span>
                          {round.cohorts.length > 0 && (
                            <span className="text-xs text-muted-foreground">
                              Khóa {round.cohorts.join(', ')}
                            </span>
                          )}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="eligible-file-input">
                    File danh sách (.xlsx, .csv){' '}
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
                    'flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition-colors',
                    isDragging
                      ? 'border-primary bg-primary/5'
                      : 'border-slate-300 bg-slate-50/60 hover:border-primary/60 hover:bg-muted/40 dark:border-neutral-700 dark:bg-[#141416]',
                  )}
                >
                  {file ? (
                    <div className="space-y-1 text-center">
                      <FileSpreadsheet className="mx-auto size-8 text-emerald-600 dark:text-emerald-400" />
                      <p className="text-sm font-medium">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(file.size / 1024).toFixed(1)} KB · Bấm để chọn file khác
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Upload className="size-4" />
                      </div>
                      <p className="text-sm font-medium">
                        Kéo thả hoặc{' '}
                        <span className="text-primary underline">
                          chọn file từ máy tính
                        </span>
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

          {/* ── Fallback Step: Column Mapping ── */}
          {step === 'mapping' && parseResult && suggestions && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                <strong className="text-foreground">
                  {parseResult.fileName}
                </strong>{' '}
                ·{' '}
                <strong className="text-foreground">
                  {parseResult.totalDataRows}
                </strong>{' '}
                dòng · {parseResult.round.projectTypeName}
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
                onChangeNameMode={handleNameModeChange}
                onChangeHeaderRow={handleChangeHeaderRow}
              />
            </div>
          )}

          {/* ── Step 2: Preview ── */}
          {step === 'preview' && previewResult && parseResult && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                <strong className="text-foreground">
                  {parseResult.fileName}
                </strong>{' '}
                · {parseResult.round.projectTypeName}
              </p>
              <EligibleImportPreviewTable
                key={previewVersion}
                preview={previewResult}
              />
            </div>
          )}

          {/* ── Step 3: Result ── */}
          {step === 'result' && commitResult && (
            <div className="space-y-4">
              <div
                className={cn(
                  'rounded-lg border p-3.5',
                  isZeroImported
                    ? 'border-destructive/30 bg-destructive/10 text-destructive'
                    : isPartialSuccess
                      ? 'border-amber-500/30 bg-amber-500/10 text-amber-950 dark:text-amber-200'
                      : 'border-emerald-500/25 bg-emerald-500/10 text-emerald-950 dark:text-emerald-200',
                )}
              >
                <div className="flex items-center gap-2 text-sm font-semibold">
                  {isZeroImported ? (
                    <>
                      <AlertTriangle className="size-4 shrink-0 text-destructive" />
                      <span>Không có sinh viên nào được import</span>
                    </>
                  ) : isPartialSuccess ? (
                    <>
                      <AlertTriangle className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                      <span>
                        Đã import {commitResult.importedCount} sinh viên (
                        {commitResult.errorCount} dòng lỗi)
                      </span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                      <span>
                        Đã import {commitResult.importedCount} sinh viên
                      </span>
                    </>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5 text-sm">
                <div className="rounded-lg border bg-muted/20 p-3 text-center">
                  <span className="block text-xs text-muted-foreground">
                    Đủ điều kiện
                  </span>
                  <span className="text-lg font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                    {commitResult.importedCount}
                  </span>
                </div>
                <div className="rounded-lg border bg-muted/20 p-3 text-center">
                  <span className="block text-xs text-muted-foreground">
                    Tài khoản mới
                  </span>
                  <span className="text-lg font-bold tabular-nums text-primary">
                    {commitResult.createdAccountsCount}
                  </span>
                </div>
                <div className="rounded-lg border bg-muted/20 p-3 text-center">
                  <span className="block text-xs text-muted-foreground">
                    Dòng lỗi
                  </span>
                  <span className="text-lg font-bold tabular-nums text-destructive">
                    {commitResult.errorCount}
                  </span>
                </div>
              </div>

              {commitResult.errors.length > 0 && (
                <section className="space-y-1.5">
                  <h3 className="text-xs font-medium text-muted-foreground">
                    Dòng không import được ({commitResult.errors.length})
                  </h3>
                  <ul className="max-h-40 divide-y overflow-y-auto rounded-lg border text-xs">
                    {commitResult.errors.map((err, idx) => (
                      <li key={idx} className="px-3 py-2">
                        <span className="font-medium tabular-nums text-muted-foreground">
                          Dòng {err.row}:
                        </span>{' '}
                        <span className="text-destructive">{err.reason}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          )}
        </div>

        <DialogFooter
          className={cn(
            'gap-2 pt-2',
            step === 'preview' && 'sm:justify-between',
          )}
        >
          {step === 'upload' && (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isBusy}
              >
                Huỷ
              </Button>
              <Button
                type="button"
                onClick={handleContinueFromUpload}
                disabled={!file || !effectiveRoundId || isBusy}
                className="gap-1.5"
              >
                {parseMutation.isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Đang đọc file…
                  </>
                ) : previewMutation.isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Đang kiểm tra…
                  </>
                ) : (
                  <>
                    Tiếp tục
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
                  setStep(mappingReturnStep);
                }}
              >
                <ArrowLeft className="size-4" />
                Quay lại
              </Button>
              <Button
                type="button"
                disabled={
                  isBusy || missingRequired || duplicateCols.size > 0
                }
                onClick={handlePreview}
                className="gap-1.5"
              >
                {previewMutation.isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Đang kiểm tra…
                  </>
                ) : (
                  <>
                    Xem trước
                    <ArrowRight className="size-4" />
                  </>
                )}
              </Button>
            </>
          )}

          {step === 'preview' && previewResult && (
            <>
              <div className="flex items-center gap-2">
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
                  Quay lại
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={isBusy}
                  onClick={() => {
                    setErrorMsg(null);
                    setMappingReturnStep('preview');
                    setStep('mapping');
                  }}
                  className="gap-1.5 text-muted-foreground hover:text-foreground"
                >
                  <SlidersHorizontal className="size-3.5" />
                  Chỉnh cột
                </Button>
              </div>
              <Button
                type="button"
                disabled={isBusy || previewResult.validCount === 0}
                onClick={handleCommit}
                className="gap-1.5"
              >
                {commitMutation.isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Đang import…
                  </>
                ) : (
                  <>
                    <FileUp className="size-4" />
                    Import {previewResult.validCount} sinh viên
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
                Import tiếp
              </Button>
              <Button type="button" onClick={() => handleOpenChange(false)}>
                Đóng
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
