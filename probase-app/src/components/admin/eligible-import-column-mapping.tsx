'use client';

import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Loader2,
} from 'lucide-react';
import type {
  EligibleCandidateHeaderRow,
  EligibleColumnMapping,
  EligibleField,
  EligibleFieldSuggestion,
  EligibleImportColumnDescriptor,
  EligibleNameMode,
} from '@/lib/api/types';
import { cn } from '@/lib/utils';

type MappingKey = keyof EligibleColumnMapping;

interface FieldConfig {
  field: EligibleField;
  mappingKey: MappingKey;
  label: string;
  hint?: string;
  required: boolean;
}

function getFieldConfigs(nameMode: EligibleNameMode): FieldConfig[] {
  const nameFields: FieldConfig[] =
    nameMode === 'full'
      ? [
          {
            field: 'fullName',
            mappingKey: 'fullNameCol',
            label: 'Họ và tên',
            required: true,
          },
        ]
      : [
          {
            field: 'surname',
            mappingKey: 'surnameCol',
            label: 'Họ đệm',
            hint: 'VD: Nguyễn Văn',
            required: true,
          },
          {
            field: 'givenName',
            mappingKey: 'givenNameCol',
            label: 'Tên',
            hint: 'VD: An',
            required: true,
          },
        ];

  return [
    {
      field: 'studentCode',
      mappingKey: 'studentCodeCol',
      label: 'MSSV',
      hint: '7 chữ số',
      required: true,
    },
    ...nameFields,
    {
      field: 'class',
      mappingKey: 'classCol',
      label: 'Lớp (tùy chọn)',
      required: false,
    },
    {
      field: 'email',
      mappingKey: 'emailCol',
      label: 'Email (tùy chọn)',
      hint: 'Mặc định <MSSV>@dlu.edu.vn',
      required: false,
    },
    {
      field: 'note',
      mappingKey: 'noteCol',
      label: 'Ghi chú (tùy chọn)',
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
    <div className="space-y-3">
      {/* Toolbar: Header row selector + Name mode toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/30 px-3 py-2 text-xs">
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
            <option value={0}>Không có tiêu đề</option>
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
          <span className="font-medium text-muted-foreground">Họ tên:</span>
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
              Gộp 1 cột
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
            Thiếu cột bắt buộc:{' '}
            <strong>{missingRequired.map((f) => f.label).join(', ')}</strong>.
          </span>
        </p>
      )}

      {duplicateCols.size > 0 && (
        <p className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>Có trường đang chọn trùng cùng một cột trong file.</span>
        </p>
      )}

      {/* Mapping table */}
      <div className="overflow-hidden rounded-lg border text-sm">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50 text-xs text-muted-foreground">
              <th className="px-3 py-2 text-left font-medium">Hệ thống cần</th>
              <th className="px-3 py-2 text-left font-medium">
                Cột trong file
              </th>
              <th className="hidden px-3 py-2 text-left font-medium sm:table-cell">
                Mẫu dữ liệu
              </th>
              <th className="w-12 px-2 py-2 text-center font-medium" />
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

              return (
                <tr
                  key={cfg.field}
                  className={cn(
                    'transition-colors hover:bg-muted/30',
                    isDuplicate && 'bg-destructive/5',
                  )}
                >
                  <td className="px-3 py-2 align-middle">
                    <div className="font-medium">
                      {cfg.label}
                      {cfg.required && (
                        <span className="ml-1 text-destructive">*</span>
                      )}
                    </div>
                    {cfg.hint && (
                      <p className="text-[11px] text-muted-foreground">
                        {cfg.hint}
                      </p>
                    )}
                  </td>

                  <td className="px-3 py-2 align-middle">
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

                  <td className="hidden max-w-[180px] px-3 py-2 align-middle text-xs text-muted-foreground sm:table-cell">
                    {selectedCol && selectedCol.samples.length > 0 ? (
                      <div
                        className="truncate"
                        title={selectedCol.samples.join(' · ')}
                      >
                        {selectedCol.samples.slice(0, 2).join(', ')}
                      </div>
                    ) : (
                      <span className="text-muted-foreground/50">—</span>
                    )}
                  </td>

                  <td className="px-2 py-2 text-center align-middle">
                    {isDuplicate ? (
                      <AlertTriangle
                        className="mx-auto size-4 text-destructive"
                        aria-label="Trùng cột"
                      />
                    ) : isHighConf ? (
                      <CheckCircle2
                        className="mx-auto size-4 text-green-500"
                        aria-label={`Tự khớp (${Math.round(suggestion.confidence * 100)}%)`}
                      />
                    ) : isMediumConf ? (
                      <AlertCircle
                        className="mx-auto size-4 text-amber-500"
                        aria-label={`Cần kiểm tra (${Math.round(suggestion.confidence * 100)}%)`}
                      />
                    ) : selectedColIdx === null ? (
                      <HelpCircle
                        className="mx-auto size-4 text-muted-foreground/40"
                        aria-label="Chưa chọn cột"
                      />
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
