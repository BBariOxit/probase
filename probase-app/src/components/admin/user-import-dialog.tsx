'use client';

import { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileUp,
  Loader2,
  Mail,
  TriangleAlert,
} from 'lucide-react';
import { ApiError } from '@/lib/api/client';
import {
  downloadImportTemplate,
  useCommitImport,
  useParseImport,
  usePreviewImport,
  useSendImportEmails,
} from '@/lib/api/users';
import type {
  ColumnMapping,
  CommitImportResult,
  ParseImportResult,
  PreviewImportResult,
  SystemField,
} from '@/lib/api/types';
import { ImportColumnMapping } from '@/components/admin/import-column-mapping';
import { ImportPreviewTable } from '@/components/admin/import-preview-table';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Step = 'upload' | 'mapping' | 'preview' | 'result';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildInitialMapping(
  suggestions: ParseImportResult['suggestions'],
): ColumnMapping {
  const mapping: Partial<ColumnMapping> = {};
  for (const [field, suggestion] of Object.entries(suggestions)) {
    mapping[field as SystemField] = suggestion.fileColumn;
  }
  return mapping as ColumnMapping;
}

const ALL_FIELDS: SystemField[] = [
  'role',
  'email',
  'fullName',
  'code',
  'majorCode',
  'class',
  'academicTitle',
  'researchInterests',
  'phone',
  'bio',
];

// ---------------------------------------------------------------------------
// Step indicators
// ---------------------------------------------------------------------------

const STEPS: { key: Step; label: string }[] = [
  { key: 'upload', label: 'Tải file' },
  { key: 'mapping', label: 'Ánh xạ cột' },
  { key: 'preview', label: 'Xem trước' },
  { key: 'result', label: 'Kết quả' },
];

function StepIndicator({ current }: { current: Step }) {
  const currentIdx = STEPS.findIndex((s) => s.key === current);
  return (
    <div className="flex items-center gap-1.5 text-xs">
      {STEPS.map((step, idx) => {
        const done = idx < currentIdx;
        const active = idx === currentIdx;
        return (
          <span key={step.key} className="flex items-center gap-1.5">
            <span
              className={[
                'flex size-5 items-center justify-center rounded-full text-[10px] font-semibold',
                done
                  ? 'bg-primary text-primary-foreground'
                  : active
                    ? 'bg-primary/20 text-primary ring-1 ring-primary'
                    : 'bg-muted text-muted-foreground',
              ].join(' ')}
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

// ---------------------------------------------------------------------------
// Dialog
// ---------------------------------------------------------------------------

export function UserImportDialog() {
  const parseImport = useParseImport();
  const previewImport = usePreviewImport();
  const commitImport = useCommitImport();
  const sendEmails = useSendImportEmails();

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Wizard state
  const [parseResult, setParseResult] = useState<ParseImportResult | null>(
    null,
  );
  const [mapping, setMapping] = useState<ColumnMapping>(
    Object.fromEntries(ALL_FIELDS.map((f) => [f, null])) as ColumnMapping,
  );
  const [preview, setPreview] = useState<PreviewImportResult | null>(null);
  const [commitResult, setCommitResult] = useState<CommitImportResult | null>(
    null,
  );
  const [emailResult, setEmailResult] = useState<{
    sent: number;
    failed: number;
  } | null>(null);

  // ── Helpers ────────────────────────────────────────────

  function reset() {
    setStep('upload');
    setFile(null);
    setError(null);
    setParseResult(null);
    setMapping(
      Object.fromEntries(ALL_FIELDS.map((f) => [f, null])) as ColumnMapping,
    );
    setPreview(null);
    setCommitResult(null);
    setEmailResult(null);
  }

  function close() {
    const isBusy =
      parseImport.isPending ||
      previewImport.isPending ||
      commitImport.isPending ||
      sendEmails.isPending;
    if (isBusy) return;

    // Block closing if accounts are created but emails haven't been sent yet
    if (step === 'result' && commitResult && !emailResult) {
      return;
    }

    setOpen(false);
    reset();
  }

  // ── Step handlers ──────────────────────────────────────

  async function handleParse() {
    if (!file) return;
    setError(null);
    try {
      const result = await parseImport.mutateAsync(file);
      setParseResult(result);
      setMapping(buildInitialMapping(result.suggestions));
      setStep('mapping');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không đọc được file');
    }
  }

  async function handlePreview() {
    if (!parseResult) return;
    setError(null);
    try {
      const result = await previewImport.mutateAsync({
        sessionId: parseResult.sessionId,
        mapping,
      });
      setPreview(result);
      setStep('preview');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Lỗi khi xem trước');
    }
  }

  async function handleCommit() {
    if (!parseResult || !preview) return;
    setError(null);
    try {
      const result = await commitImport.mutateAsync({
        sessionId: parseResult.sessionId,
        mapping,
      });
      setCommitResult(result);
      setStep('result');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Lỗi khi import');
    }
  }

  async function handleSendEmails() {
    if (!commitResult) return;
    setError(null);
    try {
      const result = await sendEmails.mutateAsync(commitResult.sessionId);
      setEmailResult(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Lỗi khi gửi email');
    }
  }

  // ── Render ─────────────────────────────────────────────

  const isLoading =
    parseImport.isPending ||
    previewImport.isPending ||
    commitImport.isPending ||
    sendEmails.isPending;

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <FileUp />
        Nhập từ file
      </Button>

      <Dialog
        open={open}
        onOpenChange={(next) => (next ? setOpen(true) : close())}
      >
        <DialogContent
          className={cn(
            'transition-all duration-300',
            step === 'upload' || step === 'result'
              ? 'sm:max-w-lg'
              : 'sm:max-w-4xl',
          )}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Nhập danh sách tài khoản
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <AlertCircle className="size-4 text-muted-foreground hover:text-foreground transition-colors cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[300px] text-xs font-normal">
                    Hệ thống sẽ tự động gửi mật khẩu tạm thời qua email cho các
                    tài khoản hợp lệ. Các dòng lỗi sẽ bị bỏ qua.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </DialogTitle>
            <DialogDescription className="sr-only">
              Wizard nhập danh sách tài khoản hàng loạt
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 overflow-y-auto max-h-[60vh] pr-2 -mr-2">
            <FormError message={error} />

            {/* ── Step 1: Upload ── */}
            {step === 'upload' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="roster">
                    File (.xlsx hoặc .csv, tối đa 5MB)
                  </Label>
                  <Input
                    id="roster"
                    type="file"
                    accept=".xlsx,.csv"
                    className="cursor-pointer file:cursor-pointer hover:bg-muted/50 transition-colors"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => downloadImportTemplate('STUDENT')}
                    type="button"
                  >
                    <Download className="size-3.5" />
                    Mẫu Sinh viên
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => downloadImportTemplate('LECTURER')}
                    type="button"
                  >
                    <Download className="size-3.5" />
                    Mẫu Giảng viên
                  </Button>
                </div>
              </div>
            )}

            {/* ── Step 2: Column Mapping ── */}
            {step === 'mapping' && parseResult && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  File có <strong>{parseResult.rowCount}</strong> dòng dữ liệu.
                  Hệ thống đã tự động gợi ý ánh xạ cột bên dưới. Vui lòng kiểm
                  tra và điều chỉnh nếu cần.
                </p>
                <ImportColumnMapping
                  headers={parseResult.headers}
                  suggestions={parseResult.suggestions}
                  mapping={mapping}
                  onChange={setMapping}
                />
              </div>
            )}

            {/* ── Step 3: Preview ── */}
            {step === 'preview' && preview && (
              <ImportPreviewTable preview={preview} />
            )}

            {/* ── Step 4: Result ── */}
            {step === 'result' && commitResult && (
              <div className="space-y-4">
                {/* Commit summary */}
                <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
                  <span>
                    <strong className="tabular-nums">
                      {commitResult.createdCount}
                    </strong>{' '}
                    tài khoản đã tạo
                  </span>
                  {commitResult.failedCount > 0 && (
                    <span className="text-destructive">
                      <strong className="tabular-nums">
                        {commitResult.failedCount}
                      </strong>{' '}
                      dòng lỗi
                    </span>
                  )}
                  {commitResult.warnedCount > 0 && (
                    <span className="text-amber-600 dark:text-amber-400">
                      <strong className="tabular-nums">
                        {commitResult.warnedCount}
                      </strong>{' '}
                      dòng cần xem lại
                    </span>
                  )}
                </div>

                {/* Email section */}
                {!emailResult ? (
                  <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                    <p className="text-sm font-medium">
                      Gửi mật khẩu tạm thời qua email
                    </p>

                    <Button
                      size="sm"
                      disabled={sendEmails.isPending}
                      onClick={handleSendEmails}
                    >
                      {sendEmails.isPending ? (
                        <Loader2 className="animate-spin mr-2 size-3.5" />
                      ) : (
                        <Mail className="mr-2 size-3.5" />
                      )}
                      Gửi email ({commitResult.createdCount} người)
                    </Button>
                  </div>
                ) : (
                  <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-4 space-y-1">
                    <p className="flex items-center gap-2 text-sm font-medium text-green-700 dark:text-green-400">
                      <CheckCircle2 className="size-4" />
                      Đã gửi email xong
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Gửi thành công:{' '}
                      <strong className="tabular-nums">
                        {emailResult.sent}
                      </strong>
                      {emailResult.failed > 0 && (
                        <>
                          {' '}
                          · Thất bại:{' '}
                          <strong className="tabular-nums text-destructive">
                            {emailResult.failed}
                          </strong>{' '}
                          (dùng &ldquo;Cấp lại mật khẩu&rdquo; cho những tài
                          khoản đó)
                        </>
                      )}
                    </p>
                  </div>
                )}

                {/* Failed rows */}
                {commitResult.failed.length > 0 && (
                  <section className="space-y-1.5">
                    <h3 className="text-xs font-medium text-muted-foreground">
                      Dòng không nhập được
                    </h3>
                    <ul className="max-h-40 divide-y overflow-y-auto rounded-lg border text-sm">
                      {commitResult.failed.map((row) => (
                        <li key={row.row} className="px-3 py-2">
                          <span className="text-muted-foreground tabular-nums">
                            Dòng {row.row}
                          </span>
                          {row.email && (
                            <span className="ml-2">{row.email}</span>
                          )}
                          <p className="text-xs text-destructive">
                            {row.reason}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
              </div>
            )}
          </div>

          {/* ── Footer ── */}
          {!(step === 'result' && commitResult && !emailResult) && (
            <DialogFooter className="gap-2">
              <Button variant="outline" disabled={isLoading} onClick={close}>
                {step === 'result' ? 'Đóng' : 'Huỷ'}
              </Button>

              {step === 'upload' && (
                <Button
                  disabled={!file || parseImport.isPending}
                  onClick={handleParse}
                >
                  {parseImport.isPending && (
                    <Loader2 className="animate-spin" />
                  )}
                  Phân tích file
                </Button>
              )}

              {step === 'mapping' && (
                <>
                  <Button variant="outline" onClick={() => setStep('upload')}>
                    Quay lại
                  </Button>
                  <Button
                    disabled={previewImport.isPending}
                    onClick={handlePreview}
                  >
                    {previewImport.isPending && (
                      <Loader2 className="animate-spin" />
                    )}
                    Xem trước dữ liệu
                  </Button>
                </>
              )}

              {step === 'preview' && preview && (
                <>
                  <Button variant="outline" onClick={() => setStep('mapping')}>
                    Quay lại
                  </Button>
                  <Button
                    disabled={
                      commitImport.isPending || preview.validCount === 0
                    }
                    onClick={handleCommit}
                  >
                    {commitImport.isPending && (
                      <Loader2 className="animate-spin" />
                    )}
                    Xác nhận Import {preview.validCount} tài khoản
                  </Button>
                </>
              )}
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
