'use client';

import { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  UserPlus,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type {
  PreviewEligibleImportResult,
  PreviewEligibleImportRow,
} from '@/lib/api/types';
import { cn } from '@/lib/utils';

type FilterTab = 'all' | 'valid' | 'warning' | 'error';

const FORMULA_TRIGGER_RE = /^[=+\-@\t\r]/;

function sanitizeCsvCell(value: string | number | undefined): string {
  const str = value === undefined ? '' : String(value).trim();
  const safe = FORMULA_TRIGGER_RE.test(str) ? `'${str}` : str;
  return `"${safe.replace(/"/g, '""')}"`;
}

function exportErrorRowsCsv(rows: PreviewEligibleImportRow[]) {
  const invalid = rows.filter((r) => !r.valid);
  if (invalid.length === 0) return;

  const headers = ['Dòng', 'MSSV', 'Họ và tên', 'Email', 'Lý do lỗi'];
  const csvRows = [
    headers.join(','),
    ...invalid.map((r) =>
      [
        r.row,
        sanitizeCsvCell(r.studentCode),
        sanitizeCsvCell(r.fullName),
        sanitizeCsvCell(r.effectiveEmail),
        sanitizeCsvCell(r.reason),
      ].join(','),
    ),
  ];

  const blob = new Blob(['\uFEFF' + csvRows.join('\r\n')], {
    type: 'text/csv;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'ds-sv-du-dieu-kien-loi.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

interface Props {
  preview: PreviewEligibleImportResult;
}

export function EligibleImportPreviewTable({ preview }: Props) {
  const [tab, setTab] = useState<FilterTab>(
    preview.errorCount > 0 ? 'error' : 'all',
  );

  const filteredRows = preview.rows.filter((row) => {
    if (tab === 'valid') return row.valid;
    if (tab === 'warning') return row.valid && (row.warnings?.length ?? 0) > 0;
    if (tab === 'error') return !row.valid;
    return true;
  });

  return (
    <div className="space-y-3">
      {/* Filter tabs + Error download */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex rounded-lg border bg-muted/40 p-0.5 text-xs">
          {(
            [
              { key: 'all', label: `Tất cả (${preview.totalRows})` },
              { key: 'valid', label: `Hợp lệ (${preview.validCount})` },
              { key: 'warning', label: `Cảnh báo (${preview.warningCount})` },
              { key: 'error', label: `Lỗi (${preview.errorCount})` },
            ] as const
          ).map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key)}
              className={cn(
                'cursor-pointer rounded-md px-2.5 py-1 font-medium transition-colors',
                tab === item.key
                  ? 'bg-background text-foreground shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {preview.newAccountsCount > 0 && (
            <span className="text-xs text-muted-foreground">
              Tạo mới{' '}
              <strong className="font-semibold text-foreground">
                {preview.newAccountsCount}
              </strong>{' '}
              tài khoản
            </span>
          )}
          {preview.errorCount > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => exportErrorRowsCsv(preview.rows)}
            >
              <Download className="size-3.5" />
              Tải file lỗi
            </Button>
          )}
        </div>
      </div>

      {preview.errorCount > 0 && (
        <p className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>
            Các dòng lỗi sẽ bị bỏ qua. Chỉ lưu{' '}
            <strong>{preview.validCount} sinh viên hợp lệ</strong>.
          </span>
        </p>
      )}

      {/* Preview rows table */}
      <div className="max-h-96 overflow-auto rounded-xl border border-slate-300 bg-white dark:border-neutral-700 dark:bg-[#1e1e1e]">
        <Table containerClassName="overflow-visible" className="text-xs">
          <TableHeader>
            <TableRow>
              <TableHead className="h-9.5 w-14 px-3">Dòng</TableHead>
              <TableHead className="h-9.5 px-3">Trạng thái</TableHead>
              <TableHead className="h-9.5 px-3">MSSV</TableHead>
              <TableHead className="h-9.5 px-3">Họ và tên</TableHead>
              <TableHead className="h-9.5 px-3">Lớp</TableHead>
              <TableHead className="h-9.5 px-3">Email / Chi tiết</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRows.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={6}
                  className="px-3 py-8 text-center text-xs text-muted-foreground"
                >
                  Không có dòng nào.
                </TableCell>
              </TableRow>
            ) : (
              filteredRows.map((row) => {
                const hasWarnings = (row.warnings?.length ?? 0) > 0;
                return (
                  <TableRow
                    key={row.row}
                    className={cn(
                      row.valid
                        ? hasWarnings
                          ? 'bg-amber-500/5 hover:bg-amber-500/10'
                          : 'hover:bg-emerald-500/5'
                        : 'bg-destructive/5 hover:bg-destructive/10',
                    )}
                  >
                    <TableCell className="px-3 py-2.5 text-xs tabular-nums text-muted-foreground">
                      {row.row}
                    </TableCell>
                    <TableCell className="px-3 py-2.5 text-xs">
                      {!row.valid ? (
                        <span className="inline-flex items-center gap-1 font-medium text-destructive">
                          <XCircle className="size-3.5" />
                          Lỗi
                        </span>
                      ) : row.action === 'create_account' ? (
                        <span className="inline-flex items-center gap-1 font-medium text-primary">
                          <UserPlus className="size-3.5" />
                          Tạo TK mới
                        </span>
                      ) : row.action === 'already_in_round' ? (
                        <span className="inline-flex items-center gap-1 font-medium text-amber-600 dark:text-amber-400">
                          <AlertTriangle className="size-3.5" />
                          Cập nhật
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="size-3.5" />
                          Thêm vào đợt
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="px-3 py-2.5 font-mono text-xs font-medium text-foreground">
                      {row.studentCode ?? '—'}
                    </TableCell>
                    <TableCell className="px-3 py-2.5 text-xs font-medium text-foreground">
                      {row.fullName ?? '—'}
                    </TableCell>
                    <TableCell className="px-3 py-2.5 text-xs">
                      {row.className ? (
                        <span>
                          {row.className}
                          {row.majorCode && (
                            <span className="ml-1 text-muted-foreground">
                              ({row.majorCode})
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="px-3 py-2.5 text-xs whitespace-normal">
                      {!row.valid ? (
                        <span className="text-destructive">{row.reason}</span>
                      ) : hasWarnings ? (
                        <span className="text-amber-700 dark:text-amber-400">
                          {row.warnings!.join(' · ')}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">
                          {row.effectiveEmail}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
