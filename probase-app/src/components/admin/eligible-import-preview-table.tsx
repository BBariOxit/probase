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
  const [tab, setTab] = useState<FilterTab>('all');

  const filteredRows = preview.rows.filter((row) => {
    if (tab === 'valid') return row.valid;
    if (tab === 'warning') return row.valid && (row.warnings?.length ?? 0) > 0;
    if (tab === 'error') return !row.valid;
    return true;
  });

  return (
    <div className="space-y-3">
      {/* KPI summary */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-lg border bg-emerald-500/8 px-3 py-2">
          <span className="block text-[11px] text-muted-foreground">
            Hợp lệ (sẽ lưu)
          </span>
          <span className="text-lg font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
            {preview.validCount}
          </span>
        </div>
        <div className="rounded-lg border bg-primary/6 px-3 py-2">
          <span className="block text-[11px] text-muted-foreground">
            Tạo tài khoản mới
          </span>
          <span className="text-lg font-bold tabular-nums text-primary">
            {preview.newAccountsCount}
          </span>
        </div>
        <div className="rounded-lg border bg-amber-500/8 px-3 py-2">
          <span className="block text-[11px] text-muted-foreground">
            Cảnh báo / Đã có
          </span>
          <span className="text-lg font-bold tabular-nums text-amber-600 dark:text-amber-400">
            {preview.warningCount}
          </span>
        </div>
        <div className="rounded-lg border bg-destructive/8 px-3 py-2">
          <span className="block text-[11px] text-muted-foreground">
            Dòng lỗi (bỏ qua)
          </span>
          <span className="text-lg font-bold tabular-nums text-destructive">
            {preview.errorCount}
          </span>
        </div>
      </div>

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

        {preview.errorCount > 0 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => exportErrorRowsCsv(preview.rows)}
          >
            <Download className="size-3.5" />
            Tải file lỗi (.csv)
          </Button>
        )}
      </div>

      {preview.errorCount > 0 && (
        <p className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>
            Các dòng lỗi sẽ bị bỏ qua. Hệ thống chỉ lưu{' '}
            <strong>{preview.validCount} sinh viên hợp lệ</strong> vào đợt đăng
            ký.
          </span>
        </p>
      )}

      {/* Preview rows table */}
      <div className="max-h-72 overflow-auto rounded-lg border text-xs">
        <table className="min-w-full">
          <thead className="sticky top-0 z-10 border-b bg-muted/90 backdrop-blur text-muted-foreground">
            <tr>
              <th className="px-2.5 py-2 text-left font-medium">Dòng</th>
              <th className="px-2.5 py-2 text-left font-medium">Trạng thái</th>
              <th className="px-2.5 py-2 text-left font-medium">MSSV</th>
              <th className="px-2.5 py-2 text-left font-medium">Họ và tên</th>
              <th className="px-2.5 py-2 text-left font-medium">Lớp / Ngành</th>
              <th className="px-2.5 py-2 text-left font-medium">Chi tiết</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredRows.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-3 py-6 text-center text-muted-foreground"
                >
                  Không có dòng nào trong mục này.
                </td>
              </tr>
            ) : (
              filteredRows.map((row) => {
                const hasWarnings = (row.warnings?.length ?? 0) > 0;
                return (
                  <tr
                    key={row.row}
                    className={cn(
                      row.valid
                        ? hasWarnings
                          ? 'bg-amber-500/5 hover:bg-amber-500/10'
                          : 'hover:bg-emerald-500/5'
                        : 'bg-destructive/5 hover:bg-destructive/10',
                    )}
                  >
                    <td className="px-2.5 py-2 tabular-nums text-muted-foreground">
                      {row.row}
                    </td>
                    <td className="px-2.5 py-2 whitespace-nowrap">
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
                    </td>
                    <td className="px-2.5 py-2 font-mono font-medium">
                      {row.studentCode ?? '—'}
                    </td>
                    <td className="px-2.5 py-2 font-medium">
                      {row.fullName ?? '—'}
                    </td>
                    <td className="px-2.5 py-2 whitespace-nowrap">
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
                    </td>
                    <td className="px-2.5 py-2">
                      {!row.valid ? (
                        <span className="text-destructive">{row.reason}</span>
                      ) : hasWarnings ? (
                        <span className="text-amber-700 dark:text-amber-400">
                          {row.warnings!.join(' · ')}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">
                          {row.effectiveEmail}
                          {row.note ? ` · ${row.note}` : ''}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

