'use client';

import { CheckCircle2, Download, XCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { PreviewImportResult, PreviewImportRow } from '@/lib/api/types';

// ---------------------------------------------------------------------------
// Error file export
// ---------------------------------------------------------------------------

function exportErrorRows(rows: PreviewImportRow[]) {
  const invalid = rows.filter((r) => !r.valid);
  if (invalid.length === 0) return;

  const headers = ['Dòng', 'Email', 'Lý do lỗi'];
  const csvRows = [
    headers.join(','),
    ...invalid.map((r) =>
      [r.row, r.email ?? '', `"${(r.reason ?? '').replace(/"/g, '""')}"`].join(
        ',',
      ),
    ),
  ];

  const blob = new Blob(['\uFEFF' + csvRows.join('\r\n')], {
    type: 'text/csv;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'import-errors.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface ImportPreviewTableProps {
  preview: PreviewImportResult;
}

export function ImportPreviewTable({ preview }: ImportPreviewTableProps) {
  const { rows, validCount, invalidCount, total } = preview;

  return (
    <div className="space-y-3">
      {/* Summary */}
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <span className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
          <CheckCircle2 className="size-4" />
          <strong className="tabular-nums">{validCount}</strong> dòng hợp lệ
        </span>
        {invalidCount > 0 && (
          <span className="flex items-center gap-1.5 text-destructive">
            <XCircle className="size-4" />
            <strong className="tabular-nums">{invalidCount}</strong> dòng lỗi
          </span>
        )}
        <span className="ml-auto text-muted-foreground">
          Tổng: {total} dòng
        </span>
        {invalidCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportErrorRows(rows)}
          >
            <Download className="size-3.5" />
            Tải file lỗi về
          </Button>
        )}
      </div>

      {invalidCount > 0 && (
        <p className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          Các dòng lỗi sẽ bị bỏ qua. Hệ thống chỉ tạo tài khoản cho{' '}
          <strong>{validCount} dòng hợp lệ</strong>. Bạn có thể tải file lỗi về,
          sửa và import lại sau.
        </p>
      )}

      {/* Table */}
      <div className="max-h-80 overflow-y-auto overflow-x-auto rounded-lg border text-sm">
        <table className="min-w-full">
          <thead className="sticky top-0 z-10 border-b bg-muted/80 backdrop-blur text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Dòng</th>
              <th className="px-3 py-2 text-left font-medium">Trạng thái</th>
              <th className="px-3 py-2 text-left font-medium">Email</th>
              <th className="px-3 py-2 text-left font-medium">Họ tên</th>
              <th className="px-3 py-2 text-left font-medium">Chi tiết</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((row) => (
              <tr
                key={row.row}
                className={
                  row.valid
                    ? 'hover:bg-green-500/5'
                    : 'bg-destructive/5 hover:bg-destructive/10'
                }
              >
                <td className="px-3 py-2 tabular-nums text-muted-foreground">
                  {row.row}
                </td>
                <td className="px-3 py-2">
                  {row.valid ? (
                    <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
                      <CheckCircle2 className="size-3.5" />
                      Hợp lệ
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-destructive">
                      <XCircle className="size-3.5" />
                      Lỗi
                    </span>
                  )}
                </td>
                <td className="px-3 py-2">
                  {row.email ?? (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  {row.fullName ?? (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  {row.valid ? (
                    row.warnings?.length ? (
                      <span className="text-amber-600 dark:text-amber-400">
                        ⚠ {row.warnings.join(' · ')}
                      </span>
                    ) : null
                  ) : (
                    <span className="text-destructive">{row.reason}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
