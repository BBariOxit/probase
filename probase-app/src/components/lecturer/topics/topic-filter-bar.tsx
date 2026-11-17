'use client';

import React from 'react';
import { RotateCcw, Search, X } from 'lucide-react';
import type { Major, ProjectType, Semester } from '@/lib/api/types';
import { Input } from '@/components/ui/input';
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

export interface FilterOption {
  value: string;
  label: string;
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
  // Determine whether any filter is actively applied
  const hasSearch = search.trim().length > 0;
  const hasProjectType = projectTypeId > 0;
  const hasMajor = majorId > 0;
  const hasSemester = semesterId > 0;
  const hasLecturer = lecturerId !== defaultLecturerId;
  const hasStatus = status !== 'ALL';

  const hasAnyFilter =
    hasSearch ||
    hasProjectType ||
    hasMajor ||
    hasSemester ||
    hasLecturer ||
    hasStatus;

  // Selected names for chips
  const selectedProjectTypeName = projectTypes?.find(
    (pt) => pt.id === projectTypeId,
  )?.name;
  const selectedMajorName = majors?.find((m) => m.id === majorId)?.name;
  const selectedSemesterName = semesters?.find(
    (s) => s.id === semesterId,
  )?.name;
  const selectedLecturer = lecturers?.find((l) => l.id === lecturerId);
  const selectedStatusName = statusOptions?.find(
    (opt) => opt.value === status,
  )?.label;

  return (
    <div className="space-y-3">
      {/* HÀNG BỘ LỌC CHÍNH */}
      <div className="flex flex-wrap items-center gap-2.5">
        {/* Tìm kiếm */}
        <div className="relative min-w-56 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Tìm theo tên đề tài..."
            className="h-9 pl-8 pr-7 text-xs rounded-lg border-slate-300 dark:border-neutral-700 bg-white dark:bg-[#18181b]"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute top-1/2 right-2.5 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-neutral-200 cursor-pointer"
              title="Xóa tìm kiếm"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {/* Học kỳ (nếu có) */}
        {semesters && onSemesterChange && (
          <Select
            value={String(semesterId)}
            onValueChange={(val) => onSemesterChange(Number(val) || 0)}
          >
            <SelectTrigger className="w-48 h-9 text-xs rounded-lg border-slate-300 dark:border-neutral-700 bg-white dark:bg-[#18181b]">
              <SelectValue>
                {(v) =>
                  v === '0'
                    ? 'Tất cả học kỳ trước'
                    : semesters.find((s) => String(s.id) === v)?.name ??
                      'Học kỳ'
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Tất cả học kỳ trước</SelectItem>
              {semesters.map((s) => (
                <SelectItem key={s.id} value={String(s.id)}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Giảng viên combobox (nếu có) */}
        {lecturers && onLecturerChange && (
          <LecturerCombobox
            lecturers={lecturers}
            value={lecturerId}
            onChange={onLecturerChange}
            allLabel={allLecturerLabel}
            placeholder="Chọn giảng viên..."
            searchPlaceholder="Tìm tên giảng viên..."
            className="w-52 h-9 text-xs shrink-0"
            triggerClassName="h-9 text-xs rounded-lg border-slate-300 dark:border-neutral-700 bg-white dark:bg-[#18181b]"
          />
        )}

        {/* Loại đồ án */}
        {projectTypes && onProjectTypeChange && (
          <Select
            value={String(projectTypeId)}
            onValueChange={(val) => onProjectTypeChange(Number(val) || 0)}
          >
            <SelectTrigger className="w-44 h-9 text-xs rounded-lg border-slate-300 dark:border-neutral-700 bg-white dark:bg-[#18181b]">
              <SelectValue>
                {(v) =>
                  v === '0'
                    ? 'Mọi loại đồ án'
                    : projectTypes.find((pt) => String(pt.id) === v)?.name ??
                      'Mọi loại đồ án'
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Mọi loại đồ án</SelectItem>
              {projectTypes.map((pt) => (
                <SelectItem key={pt.id} value={String(pt.id)}>
                  {pt.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Chuyên ngành */}
        {majors && onMajorChange && (
          <Select
            value={String(majorId)}
            onValueChange={(val) => onMajorChange(Number(val) || 0)}
          >
            <SelectTrigger className="w-44 h-9 text-xs rounded-lg border-slate-300 dark:border-neutral-700 bg-white dark:bg-[#18181b]">
              <SelectValue>
                {(v) =>
                  v === '0'
                    ? 'Mọi chuyên ngành'
                    : majors.find((m) => String(m.id) === v)?.name ??
                      'Mọi chuyên ngành'
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Mọi chuyên ngành</SelectItem>
              {majors.map((m) => (
                <SelectItem key={m.id} value={String(m.id)}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Trạng thái */}
        {statusOptions && onStatusChange && (
          <Select
            value={status}
            onValueChange={(val) => onStatusChange((val as string) || 'ALL')}
          >
            <SelectTrigger className="w-44 h-9 text-xs rounded-lg border-slate-300 dark:border-neutral-700 bg-white dark:bg-[#18181b]">
              <SelectValue>
                {(v) =>
                  statusOptions.find((opt) => opt.value === v)?.label ??
                  'Trạng thái'
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Cụm nút phải (Tổng số & Actions) */}
        <div className="ml-auto flex items-center gap-3">
          {totalCount !== undefined && (
            <span className="text-xs font-medium text-slate-500 dark:text-neutral-400">
              {totalCount} đề tài
            </span>
          )}
          {rightActions}
        </div>
      </div>

      {/* HÀNG ACTIVE FILTER CHIPS (LỌC GỘP THEO STYLE ADMIN/STUDENTS) */}
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

          {hasSemester && selectedSemesterName && onSemesterChange && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/30">
              <span>Kỳ: {selectedSemesterName}</span>
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
