'use client';

import { useMemo } from 'react';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import { sanitizeLecturerName } from '@/lib/utils';

export interface LecturerLike {
  id: number;
  fullName: string;
  academicTitle?: string | null;
  departmentRole?: string | null;
}

export interface LecturerComboboxProps {
  lecturers: LecturerLike[];
  value: number;
  onChange: (value: number) => void;
  allLabel?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  className?: string;
  triggerClassName?: string;
  listClassName?: string;
  disabled?: boolean;
}

export function LecturerCombobox({
  lecturers,
  value,
  onChange,
  allLabel = 'Mọi giảng viên',
  placeholder = 'Chọn giảng viên...',
  searchPlaceholder = 'Tìm theo tên giảng viên...',
  emptyText = 'Không tìm thấy giảng viên nào.',
  className = 'w-52 shrink-0',
  triggerClassName,
  listClassName,
  disabled,
}: LecturerComboboxProps) {
  const options: ComboboxOption[] = useMemo(() => {
    return lecturers.map((l) => {
      const sanitized = sanitizeLecturerName(l.fullName, l.academicTitle);
      return {
        value: String(l.id),
        label: sanitized.displayName,
        subLabel: sanitized.departmentRole || undefined,
      };
    });
  }, [lecturers]);

  return (
    <Combobox
      options={options}
      value={String(value)}
      onChange={(val) => onChange(Number(val) || 0)}
      allLabel={allLabel}
      allValue="0"
      placeholder={placeholder}
      searchPlaceholder={searchPlaceholder}
      emptyText={emptyText}
      className={className}
      triggerClassName={triggerClassName}
      listClassName={listClassName}
      disabled={disabled}
      size="sm"
    />
  );
}

