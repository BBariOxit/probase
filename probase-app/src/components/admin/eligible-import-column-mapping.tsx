'use client';

import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Loader2,
  Sparkles,
} from 'lucide-react';
import type {
  EligibleCandidateHeaderRow,
  EligibleColumnMapping,
  EligibleField,
  EligibleFieldSuggestion,
  EligibleImportColumnDescriptor,
  EligibleMatchReason,
  EligibleNameMode,
} from '@/lib/api/types';
import { cn } from '@/lib/utils';

type MappingKey = keyof EligibleColumnMapping;

interface FieldConfig {
  field: EligibleField;
  mappingKey: MappingKey;
  label: string;
  hint: string;
  required: boolean;
}

const MATCH_REASON_LABELS: Record<EligibleMatchReason, string> = {
  exact: 'Khớp chuẩn',
  synonym: 'Đồng nghĩa',
  phrase: 'Chứa từ khóa',
  fuzzy: 'Khớp gần đúng',
  content: 'Suy luận từ dữ liệu',
  none: 'Chưa nhận diện',
};

function getFieldConfigs(nameMode: EligibleNameMode): FieldConfig[] {
  const nameFields: FieldConfig[] =
    nameMode === 'full'
      ? [
          {
            field: 'fullName',
            mappingKey: 'fullNameCol',
            label: 'Họ và tên',
            hint: '1 cột gộp họ tên đầy đủ (2–150 ký tự)',
            required: true,
          },
        ]
      : [
          {
            field: 'surname',
            mappingKey: 'surnameCol',
            label: 'Họ / Họ đệm',
            hint: 'Phần họ & tên lót (VD: Nguyễn Văn)',
            required: true,
          },
          {
            field: 'givenName',
            mappingKey: 'givenNameCol',
            label: 'Tên',
            hint: 'Tên gọi (VD: An) — tự ghép với Họ đệm',
            required: true,
          },
        ];

  return [
    {
      field: 'studentCode',
      mappingKey: 'studentCodeCol',
      label: 'MSSV',
      hint: 'Đúng 7 chữ số — dùng tạo khóa (cohort) & email DLU',
      required: true,
    },
    ...nameFields,
    {
      field: 'class',
      mappingKey: 'classCol',
      label: 'Lớp',
      hint: 'Tùy chọn — tự suy ra chuyên ngành nếu dạng CTK46PM',
      required: false,
    },
    {
      field: 'email',
      mappingKey: 'emailCol',
      label: 'Email DLU',
      hint: 'Tùy chọn — tự sinh <MSSV>@dlu.edu.vn nếu để trống',
      required: false,
    },
    {
      field: 'note',
      mappingKey: 'noteCol',
      label: 'Ghi chú (PĐT)',
      hint: 'Tùy chọn — lưu ghi chú cho đợt đồ án',
      required: false,
    },
  ];
}

export function findDuplicateMappedColumns(
  mapping: EligibleColumnMapping,
  nameMode: EligibleNameMode,
): Set<number> {
  const configs = getFieldConfigs(nameMode);
  const counts = new Map<number, number>();
  for (const cfg of configs) {
    const col = mapping[cfg.mappingKey];
    if (col !== null) {
      counts.set(col, (counts.get(col) ?? 0) + 1);
    }
  }
  const dups = new Set<number>();
  for (const [col, count] of counts) {
    if (count > 1) dups.add(col);
  }
  return dups;
}

export function hasMissingRequiredMapping(
  mapping: EligibleColumnMapping,
  nameMode: EligibleNameMode,
): boolean {
  const configs = getFieldConfigs(nameMode);
  return configs.some((cfg) => cfg.required && mapping[cfg.mappingKey] === null);
}

interface Props {
  columns: EligibleImportColumnDescriptor[];
  suggestions: Record<EligibleField, EligibleFieldSuggestion>;
  mapping: EligibleColumnMapping;
  nameMode: EligibleNameMode;
  headerRowIndex: number;
  candidateHeaderRows: EligibleCandidateHeaderRow[];
  isReanalyzing?: boolean;
  onChangeMapping: (next: EligibleColumnMapping) => void;
  onChangeNameMode: (next: EligibleNameMode) => void;
  onChangeHeaderRow: (rowIndex: number) => void;
}

export function EligibleImportColumnMapping({
  columns,
  suggestions,
  mapping,
  nameMode,
  headerRowIndex,
  candidateHeaderRows,
  isReanalyzing = false,
  onChangeMapping,
  onChangeNameMode,
  onChangeHeaderRow,
}: Props) {
  const fieldConfigs = getFieldConfigs(nameMode);
  const duplicateCols = findDuplicateMappedColumns(mapping, nameMode);
  const missingRequired = fieldConfigs.filter(
    (cfg) => cfg.required && mapping[cfg.mappingKey] === null,
  );

  const columnByIndex = new Map<number, EligibleImportColumnDescriptor>();
  for (const col of columns) {
    columnByIndex.set(col.index, col);
  }

  return (
    <div className="space-y-3.5">
      {/* Toolbar: Header row selector + Name mode toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/30 px-3 py-2.5 text-xs">
        <div className="flex items-center gap-2">
          <label
            htmlFor="eligible-header-row-select"
            className="font-medium text-muted-foreground"
          >
            Dòng tiêu đề:
          </label>
          <select
            id="eligible-header-row-select"
            value={headerRowIndex}
            disabled={isReanalyzing}
            onChange={(e) => onChangeHeaderRow(Number(e.target.value))}
            className="max-w-[260px] rounded-md border bg-background px-2 py-1 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value={0}>Không có tiêu đề (dữ liệu từ dòng 1)</option>
            {candidateHeaderRows.map((cand) => (
              <option key={cand.rowIndex} value={cand.rowIndex}>
                Dòng {cand.rowIndex}: {cand.preview.slice(0, 3).join(' | ')}
              </option>
            ))}
          </select>
          {isReanalyzing && (
            <Loader2 className="size-3.5 animate-spin text-primary" />
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <span className="font-medium text-muted-foreground">Cột họ tên:</span>
          <div className="inline-flex rounded-md border bg-background p-0.5">
            <button
              type="button"
              onClick={() => onChangeNameMode('full')}
              className={cn(
                'cursor-pointer rounded px-2.5 py-1 text-xs font-medium transition-colors',
                nameMode === 'full'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              1 cột gộp
            </button>
            <button
              type="button"
              onClick={() => onChangeNameMode('split')}
              className={cn(
                'cursor-pointer rounded px-2.5 py-1 text-xs font-medium transition-colors',
                nameMode === 'split'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              Tách Họ + Tên
            </button>
          </div>
        </div>
      </div>

      {/* Validation banners */}
      {missingRequired.length > 0 && (
        <p className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>
            Vui lòng chọn cột trong file cho các trường bắt buộc:{' '}
            <strong>{missingRequired.map((f) => f.label).join(', ')}</strong>.
          </span>
        </p>
      )}

      {duplicateCols.size > 0 && (
        <p className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>
            Có trường dữ liệu đang ánh xạ trùng cùng một cột trong file. Vui
            lòng chọn lại để mỗi trường gắn với một cột riêng biệt.
          </span>
        </p>
      )}

      {/* Mapping table */}
      <div className="overflow-hidden rounded-lg border text-sm">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50 text-xs text-muted-foreground">
              <th className="px-3 py-2 text-left font-medium">
                Trường hệ thống
              </th>
              <th className="px-3 py-2 text-left font-medium">
                Cột trong file của bạn
              </th>
              <th className="hidden px-3 py-2 text-left font-medium sm:table-cell">
                Dữ liệu mẫu
              </th>
              <th className="w-28 px-3 py-2 text-center font-medium">
                Nhận diện
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {fieldConfigs.map((cfg) => {
              const selectedColIdx = mapping[cfg.mappingKey];
              const selectedCol =
                selectedColIdx !== null
                  ? columnByIndex.get(selectedColIdx)
                  : undefined;
              const suggestion = suggestions[cfg.field];
              const isDuplicate =
                selectedColIdx !== null && duplicateCols.has(selectedColIdx);
              const isUsingSuggestion =
                selectedColIdx !== null &&
                suggestion.columnIndex === selectedColIdx;

              const isHighConf =
                isUsingSuggestion && suggestion.confidence >= 0.9;
              const isMediumConf =
                isUsingSuggestion &&
                suggestion.confidence >= 0.72 &&
                suggestion.confidence < 0.9;
              const isManual =
                selectedColIdx !== null && !isUsingSuggestion;

              return (
                <tr
                  key={cfg.field}
                  className={cn(
                    'transition-colors hover:bg-muted/30',
                    isDuplicate && 'bg-destructive/5',
                  )}
                >
                  <td className="px-3 py-2.5 align-top">
                    <div className="font-medium">
                      {cfg.label}
                      {cfg.required && (
                        <span className="ml-1 text-destructive">*</span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {cfg.hint}
                    </p>
                  </td>

                  <td className="px-3 py-2.5 align-middle">
                    <select
                      id={`eligible-mapping-${cfg.field}`}
                      value={selectedColIdx ?? ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        onChangeMapping({
                          ...mapping,
                          [cfg.mappingKey]: val ? Number(val) : null,
                        });
                      }}
                      className={cn(
                        'w-full rounded-md border bg-background px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring',
                        isDuplicate && 'border-destructive',
                      )}
                    >
                      <option value="">— Không ánh xạ —</option>
                      {columns.map((col) => (
                        <option key={col.index} value={col.index}>
                          Cột {col.letter}: {col.header}
                        </option>
                      ))}
                    </select>
                  </td>

                  <td className="hidden max-w-[180px] px-3 py-2.5 align-middle text-xs text-muted-foreground sm:table-cell">
                    {selectedCol && selectedCol.samples.length > 0 ? (
                      <div className="truncate" title={selectedCol.samples.join(' · ')}>
                        {selectedCol.samples.slice(0, 2).join(', ')}
                      </div>
                    ) : (
                      <span className="text-muted-foreground/50">—</span>
                    )}
                  </td>

                  <td className="px-3 py-2.5 text-center align-middle">
                    {isDuplicate ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-destructive/15 px-2 py-0.5 text-[11px] font-medium text-destructive">
                        <AlertTriangle className="size-3" />
                        Trùng cột
                      </span>
                    ) : isHighConf ? (
                      <span
                        className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400"
                        title={`${MATCH_REASON_LABELS[suggestion.matchReason]} (${Math.round(suggestion.confidence * 100)}%)`}
                      >
                        <CheckCircle2 className="size-3" />
                        {Math.round(suggestion.confidence * 100)}%
                      </span>
                    ) : isMediumConf ? (
                      <span
                        className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-400"
                        title={`${MATCH_REASON_LABELS[suggestion.matchReason]} (${Math.round(suggestion.confidence * 100)}%) — vui lòng kiểm tra`}
                      >
                        <Sparkles className="size-3" />
                        {suggestion.matchReason === 'content'
                          ? 'Theo dữ liệu'
                          : `${Math.round(suggestion.confidence * 100)}%`}
                      </span>
                    ) : isManual ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                        Chọn tay
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground/70">
                        <HelpCircle className="size-3" />
                        Chưa khớp
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <CheckCircle2 className="size-3 text-emerald-600 dark:text-emerald-400" />
          Xanh = khớp chuẩn / đồng nghĩa
        </span>
        <span className="inline-flex items-center gap-1">
          <Sparkles className="size-3 text-amber-600 dark:text-amber-400" />
          Vàng = khớp gần đúng / suy luận từ dữ liệu (nên kiểm tra lại)
        </span>
      </p>
    </div>
  );
}

