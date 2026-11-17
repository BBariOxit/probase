'use client';

import React, { useState } from 'react';
import { RotateCcw, Search, X } from 'lucide-react';
import type { Major, ProjectType, Semester } from '@/lib/api/types';
import { formatSemesterShort } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  LecturerCombobox,
  type LecturerLike,
} from '@/components/shared/lecturer-combobox';
import { AdvancedFilterPopover } from '@/components/shared/advanced-filter-popover';

export interface FilterOption {
  readonly value: string;
  readonly label: string;
}

export interface TopicFilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  // Project type filter
  projectTypeId?: number;
  onProjectTypeChange?: (value: number) => void;
  projectTypes?: ProjectType[];
  // Major filter
  majorId?: number;
  onMajorChange?: (value: number) => void;
  majors?: Major[];
  // Semester filter (for past topics archive)
  semesterId?: number;
  onSemesterChange?: (value: number) => void;
  semesters?: Semester[];
  // Lecturer filter (for archive & colleague topics)
  lecturerId?: number;
  onLecturerChange?: (value: number) => void;
  lecturers?: LecturerLike[];
  allLecturerLabel?: string;
  defaultLecturerId?: number;
  // Status filter
  status?: string;
  onStatusChange?: (value: string) => void;
  statusOptions?: readonly FilterOption[];
  // Clear all
  onResetFilters: () => void;
  // Total count & right actions
  totalCount?: number;
  rightActions?: React.ReactNode;
}

export function TopicFilterBar({
  search,
  onSearchChange,
  projectTypeId = 0,
  onProjectTypeChange,
  projectTypes,
  majorId = 0,
  onMajorChange,
  majors,
  semesterId = 0,
  onSemesterChange,
  semesters,
  lecturerId = 0,
  onLecturerChange,
  lecturers,
  allLecturerLabel = 'Mọi giảng viên',
  defaultLecturerId = 0,
  status = 'ALL',
  onStatusChange,
  statusOptions,
  onResetFilters,
  totalCount,
  rightActions,
}: TopicFilterBarProps) {
  const [filterPopoverOpen, setFilterPopoverOpen] = useState(false);

  // Active filters count for popover badge
  const hasSemester = semesterId > 0;
  const hasLecturer = lecturerId !== defaultLecturerId;
  const hasProjectType = projectTypeId > 0;
  const hasMajor = majorId > 0;
  const hasStatus = status !== 'ALL';
  const hasSearch = search.trim().length > 0;

  const activeSecondaryCount =
    (hasSemester ? 1 : 0) +
    (hasLecturer ? 1 : 0) +
    (hasProjectType ? 1 : 0) +
    (hasMajor ? 1 : 0) +
    (hasStatus ? 1 : 0);

  const hasAnyFilter = hasSearch || activeSecondaryCount > 0;

  // Selected names for chips
  const selectedSemester = semesters?.find((s) => s.id === semesterId);
  const selectedLecturer = lecturers?.find((l) => l.id === lecturerId);
  const selectedProjectTypeName = projectTypes?.find(
    (pt) => pt.id === projectTypeId,
  )?.name;
  const selectedMajorName = majors?.find((m) => m.id === majorId)?.name;
  const selectedStatusName = statusOptions?.find(
    (opt) => opt.value === status,
  )?.label;

  return (
    <div className="space-y-2.5">
      {/* THANH CÔNG CỤ: Ô TÌM KIẾM + BỘ LỌC POPOVER + TỔNG SỐ VÀ NÚT THAO TÁC */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-2.5 min-w-[300px]">
          {/* 1. Ô tìm kiếm theo tên đề tài */}
          <div className="relative flex-1 max-w-sm">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Tìm theo tên đề tài…"
              className="pl-9 h-9.5 text-sm rounded-lg border-[1.5px] border-slate-300 dark:border-neutral-700 bg-white dark:bg-[#1e1e1e] focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary shadow-2xs"
              aria-label="Tìm đề tài"
            />
            {search && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:text-foreground cursor-pointer"
                title="Xóa tìm kiếm"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {/* 2. Nút "Bộ lọc" gộp với AdvancedFilterPopover chuẩn trang sinh viên */}
          <AdvancedFilterPopover
            open={filterPopoverOpen}
            onOpenChange={setFilterPopoverOpen}
            activeCount={activeSecondaryCount}
            onReset={onResetFilters}
          >
            {/* Lọc theo học kỳ */}
            {semesters && onSemesterChange && (
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-slate-800 dark:text-neutral-200">
                  Học kỳ
                </Label>
                <Select
                  value={String(semesterId)}
                  onValueChange={(val) => onSemesterChange(Number(val) || 0)}
                >
                  <SelectTrigger className="w-full h-9.5 text-sm rounded-lg border-[1.5px] border-slate-300 dark:border-neutral-700">
                    <SelectValue>
                      {(v) =>
                        v === '0'
                          ? 'Tất cả học kỳ trước'
                          : formatSemesterShort(
                              semesters.find((s) => String(s.id) === v),
                            )
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    <SelectItem value="0" className="text-sm">
                      Tất cả học kỳ trước
                    </SelectItem>
                    {semesters.map((s) => (
                      <SelectItem
                        key={s.id}
                        value={String(s.id)}
                        className="text-sm"
                      >
                        {formatSemesterShort(s)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Lọc theo giảng viên */}
            {lecturers && onLecturerChange && (
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-slate-800 dark:text-neutral-200">
                  Giảng viên ra đề
                </Label>
                <LecturerCombobox
                  lecturers={lecturers}
                  value={lecturerId}
                  onChange={onLecturerChange}
                  allLabel={allLecturerLabel}
                  placeholder="Chọn giảng viên..."
                  searchPlaceholder="Tìm theo tên giảng viên..."
                  size="default"
                  className="w-full"
                  triggerClassName="w-full h-9.5 text-sm rounded-lg border-[1.5px] border-slate-300 dark:border-neutral-700"
                />
              </div>
            )}

            {/* Lọc theo loại đồ án */}
            {projectTypes && onProjectTypeChange && (
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-slate-800 dark:text-neutral-200">
                  Loại đồ án
                </Label>
                <Select
                  value={String(projectTypeId)}
                  onValueChange={(val) => onProjectTypeChange(Number(val) || 0)}
                >
                  <SelectTrigger className="w-full h-9.5 text-sm rounded-lg border-[1.5px] border-slate-300 dark:border-neutral-700">
                    <SelectValue>
                      {(v) =>
                        v === '0'
                          ? 'Mọi loại đồ án'
                          : projectTypes.find((pt) => String(pt.id) === v)
                              ?.name ?? 'Mọi loại đồ án'
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    <SelectItem value="0" className="text-sm">
                      Mọi loại đồ án
                    </SelectItem>
                    {projectTypes.map((pt) => (
                      <SelectItem
                        key={pt.id}
                        value={String(pt.id)}
                        className="text-sm"
                      >
                        {pt.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Lọc theo chuyên ngành */}
            {majors && onMajorChange && (
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-slate-800 dark:text-neutral-200">
                  Chuyên ngành
                </Label>
                <Select
                  value={String(majorId)}
                  onValueChange={(val) => onMajorChange(Number(val) || 0)}
                >
                  <SelectTrigger className="w-full h-9.5 text-sm rounded-lg border-[1.5px] border-slate-300 dark:border-neutral-700">
                    <SelectValue>
                      {(v) =>
                        v === '0'
                          ? 'Mọi chuyên ngành'
                          : majors.find((m) => String(m.id) === v)?.name ??
                            'Mọi chuyên ngành'
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    <SelectItem value="0" className="text-sm">
                      Mọi chuyên ngành
                    </SelectItem>
                    {majors.map((m) => (
                      <SelectItem
                        key={m.id}
                        value={String(m.id)}
                        className="text-sm"
                      >
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Lọc theo trạng thái */}
            {statusOptions && onStatusChange && (
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-slate-800 dark:text-neutral-200">
                  Trạng thái
                </Label>
                <Select
                  value={status}
                  onValueChange={(val) =>
                    onStatusChange((val as string) || 'ALL')
                  }
                >
                  <SelectTrigger className="w-full h-9.5 text-sm rounded-lg border-[1.5px] border-slate-300 dark:border-neutral-700">
                    <SelectValue>
                      {(v) =>
                        statusOptions.find((opt) => opt.value === v)?.label ??
                        'Mọi trạng thái'
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {statusOptions.map((opt) => (
                      <SelectItem
                        key={opt.value}
                        value={opt.value}
                        className="text-sm"
                      >
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </AdvancedFilterPopover>
        </div>

        {/* Cụm phải: Tổng số và nút thao tác */}
        <div className="ml-auto flex items-center gap-3">
          {totalCount !== undefined && (
            <span className="text-sm font-medium text-slate-600 dark:text-neutral-400 select-none">
              Tổng cộng:{' '}
              <strong className="font-semibold text-foreground">
                {totalCount}
              </strong>{' '}
              đề tài
            </span>
          )}
          {rightActions}
        </div>
      </div>

      {/* HÀNG ACTIVE FILTER CHIPS (LỌC GỘP CHUẨN TRANG SINH VIÊN) */}
      {hasAnyFilter && (
        <div className="flex flex-wrap items-center gap-2 pt-0.5 pb-0.5 animate-in fade-in-50">
          <span className="text-xs font-semibold text-slate-500 dark:text-neutral-400 select-none">
            Đang lọc:
          </span>

          {hasSearch && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/30">
              <span>Từ khóa: &ldquo;{search}&rdquo;</span>
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="rounded-full p-0.5 hover:bg-blue-200/60 dark:hover:bg-blue-500/30 transition text-blue-700 dark:text-blue-300 cursor-pointer"
                title="Bỏ lọc từ khóa"
              >
                <X className="size-3" />
              </button>
            </span>
          )}

          {hasSemester && selectedSemester && onSemesterChange && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/30">
              <span>Kỳ: {formatSemesterShort(selectedSemester)}</span>
              <button
                type="button"
                onClick={() => onSemesterChange(0)}
                className="rounded-full p-0.5 hover:bg-blue-200/60 dark:hover:bg-blue-500/30 transition text-blue-700 dark:text-blue-300 cursor-pointer"
                title="Bỏ lọc học kỳ"
              >
                <X className="size-3" />
              </button>
            </span>
          )}

          {hasLecturer && onLecturerChange && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/30">
              <span>
                GV:{' '}
                {selectedLecturer
                  ? `${selectedLecturer.academicTitle ? `${selectedLecturer.academicTitle} ` : ''}${selectedLecturer.fullName}`
                  : lecturerId === 0
                    ? allLecturerLabel
                    : 'Giảng viên đã chọn'}
              </span>
              <button
                type="button"
                onClick={() => onLecturerChange(defaultLecturerId)}
                className="rounded-full p-0.5 hover:bg-blue-200/60 dark:hover:bg-blue-500/30 transition text-blue-700 dark:text-blue-300 cursor-pointer"
                title="Bỏ lọc giảng viên"
              >
                <X className="size-3" />
              </button>
            </span>
          )}

          {hasProjectType && selectedProjectTypeName && onProjectTypeChange && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/30">
              <span>Loại: {selectedProjectTypeName}</span>
              <button
                type="button"
                onClick={() => onProjectTypeChange(0)}
                className="rounded-full p-0.5 hover:bg-blue-200/60 dark:hover:bg-blue-500/30 transition text-blue-700 dark:text-blue-300 cursor-pointer"
                title="Bỏ lọc loại đồ án"
              >
                <X className="size-3" />
              </button>
            </span>
          )}

          {hasMajor && selectedMajorName && onMajorChange && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/30">
              <span>Ngành: {selectedMajorName}</span>
              <button
                type="button"
                onClick={() => onMajorChange(0)}
                className="rounded-full p-0.5 hover:bg-blue-200/60 dark:hover:bg-blue-500/30 transition text-blue-700 dark:text-blue-300 cursor-pointer"
                title="Bỏ lọc chuyên ngành"
              >
                <X className="size-3" />
              </button>
            </span>
          )}

          {hasStatus && selectedStatusName && onStatusChange && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/30">
              <span>Trạng thái: {selectedStatusName}</span>
              <button
                type="button"
                onClick={() => onStatusChange('ALL')}
                className="rounded-full p-0.5 hover:bg-blue-200/60 dark:hover:bg-blue-500/30 transition text-blue-700 dark:text-blue-300 cursor-pointer"
                title="Bỏ lọc trạng thái"
              >
                <X className="size-3" />
              </button>
            </span>
          )}

          <button
            type="button"
            onClick={onResetFilters}
            className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-neutral-400 hover:text-slate-800 dark:hover:text-neutral-200 transition cursor-pointer px-1 py-0.5"
          >
            <RotateCcw className="size-3" />
            <span>Xóa hết</span>
          </button>
        </div>
      )}
    </div>
  );
}
