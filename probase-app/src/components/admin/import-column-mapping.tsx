'use client';

import { AlertCircle, CheckCircle2, HelpCircle } from 'lucide-react';
import type {
  ColumnMapping,
  FieldSuggestion,
  SystemField,
} from '@/lib/api/types';

// ---------------------------------------------------------------------------
// Field metadata (mirrors backend FIELD_LABELS and REQUIRED_FIELDS)
// ---------------------------------------------------------------------------

const FIELD_LABELS: Record<SystemField, string> = {
  role: 'Vai trò',
  email: 'Email',
  fullName: 'Họ và tên',
  code: 'Mã số (SV bắt buộc, GV tùy chọn)',
  majorCode: 'Mã ngành (SV)',
  class: 'Mã lớp (SV, tùy chọn)',
  academicTitle: 'Học hàm / học vị (GV, tùy chọn)',
  researchInterests: 'Hướng nghiên cứu (GV, tùy chọn)',
  phone: 'Số điện thoại (tùy chọn)',
  bio: 'Giới thiệu bản thân (tùy chọn)',
};

const REQUIRED_FIELDS: SystemField[] = ['role', 'email', 'fullName'];

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
// Component
// ---------------------------------------------------------------------------

interface ImportColumnMappingProps {
  headers: string[];
  suggestions: Record<SystemField, FieldSuggestion>;
  mapping: ColumnMapping;
  onChange: (mapping: ColumnMapping) => void;
}

export function ImportColumnMapping({
  headers,
  suggestions,
  mapping,
  onChange,
}: ImportColumnMappingProps) {
  function setField(field: SystemField, value: string | null) {
    onChange({ ...mapping, [field]: value });
  }

  const unmappedRequired = REQUIRED_FIELDS.filter((f) => !mapping[f]);
  const hasErrors = unmappedRequired.length > 0;

  return (
    <div className="space-y-3">
      {/* Summary banner */}
      {hasErrors && (
        <p className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          Vui lòng chọn cột cho các trường bắt buộc:{' '}
          {unmappedRequired.map((f) => FIELD_LABELS[f]).join(', ')}.
        </p>
      )}

      {/* Mapping table */}
      <div className="overflow-hidden rounded-lg border text-sm">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50 text-muted-foreground">
              <th className="px-3 py-2 text-left font-medium">Hệ thống cần</th>
              <th className="px-3 py-2 text-left font-medium">
                Cột trong file của bạn
              </th>
              <th className="w-8 px-2 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {ALL_FIELDS.map((field) => {
              const isRequired = REQUIRED_FIELDS.includes(field);
              const suggestion = suggestions[field];
              const currentValue = mapping[field];
              const confidence = suggestion.confidence;

              // Confidence badge color
              const isAutoMapped = confidence >= 0.9;
              const isPartialMatch = confidence >= 0.72 && confidence < 0.9;
              const hasNoMatch = confidence === 0 || !suggestion.fileColumn;

              return (
                <tr key={field} className="hover:bg-muted/30">
                  {/* System field label */}
                  <td className="px-3 py-2.5">
                    <span className="font-medium">{FIELD_LABELS[field]}</span>
                    {isRequired && (
                      <span className="ml-1 text-destructive">*</span>
                    )}
                  </td>

                  {/* Dropdown */}
                  <td className="px-3 py-2.5">
                    <select
                      id={`mapping-${field}`}
                      value={currentValue ?? ''}
                      onChange={(e) => setField(field, e.target.value || null)}
                      className="w-full rounded-md border bg-background px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="">— Không ánh xạ —</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* Confidence indicator */}
                  <td className="px-2 py-2.5 text-center">
                    {isAutoMapped && currentValue ? (
                      <CheckCircle2
                        className="mx-auto size-4 text-green-500"
                        aria-label={`Khớp tự động (${Math.round(confidence * 100)}%)`}
                      />
                    ) : isPartialMatch && currentValue ? (
                      <AlertCircle
                        className="mx-auto size-4 text-amber-500"
                        aria-label={`Khớp gần đúng (${Math.round(confidence * 100)}%)`}
                      />
                    ) : hasNoMatch ? (
                      <HelpCircle
                        className="mx-auto size-4 text-muted-foreground/40"
                        aria-label="Không tự động nhận diện được"
                      />
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">
        <CheckCircle2 className="mr-1 inline-block size-3 text-green-500" />
        Xanh = hệ thống tự nhận diện tốt.{' '}
        <AlertCircle className="mr-1 inline-block size-3 text-amber-500" />
        Vàng = khớp gần đúng, vui lòng kiểm tra.{' '}
        <HelpCircle className="mr-1 inline-block size-3 text-muted-foreground/60" />
        Xám = chưa nhận diện được, cần chọn tay.
      </p>
    </div>
  );
}
