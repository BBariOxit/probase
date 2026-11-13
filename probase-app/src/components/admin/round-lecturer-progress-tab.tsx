'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  FileText,
  GraduationCap,
  Layers,
  Loader2,
  Search,
  Users,
} from 'lucide-react';
import { useRoundCapacity, useRoundsForSemester } from '@/lib/api/master-data';
import { useMajors } from '@/lib/api/majors';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface RoundLecturerProgressTabProps {
  semesterId: number | undefined;
  onFilterByLecturer?: (lecturerId: number) => void;
}

export function RoundLecturerProgressTab({
  semesterId,
  onFilterByLecturer,
}: RoundLecturerProgressTabProps) {
  const { data: rounds, isPending: isRoundsPending } =
    useRoundsForSemester(semesterId);
  const { data: majors } = useMajors();

  const [selectedRoundId, setSelectedRoundId] = useState<number | undefined>(
    undefined,
  );
  const [search, setSearch] = useState('');
  const [majorFilter, setMajorFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Default to first round once loaded
  const effectiveRoundId = selectedRoundId ?? rounds?.[0]?.id;

  const { data: capacity, isPending: isCapacityPending } =
    useRoundCapacity(effectiveRoundId);

  const filteredLecturers = useMemo(() => {
    if (!capacity?.lecturerProgress) return [];
    return capacity.lecturerProgress.filter((lecturer) => {
      if (
        search.trim() &&
        !lecturer.fullName.toLowerCase().includes(search.toLowerCase().trim()) &&
        !lecturer.email.toLowerCase().includes(search.toLowerCase().trim())
      ) {
        return false;
      }
      if (
        majorFilter !== 'ALL' &&
        String(lecturer.majorId) !== majorFilter
      ) {
        return false;
      }
      if (statusFilter !== 'ALL' && lecturer.status !== statusFilter) {
        return false;
      }
      return true;
    });
  }, [capacity?.lecturerProgress, search, majorFilter, statusFilter]);

  if (isRoundsPending) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!rounds || rounds.length === 0) {
    return (
      <div className="rounded-xl border border-slate-300 dark:border-neutral-700 bg-white dark:bg-[#1e1e1e] p-8 text-center space-y-2">
        <p className="text-sm font-medium text-slate-700 dark:text-neutral-300">
          Chưa có đợt đăng ký nào được mở trong học kỳ này.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ── Chọn đợt đánh giá tiến độ ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-600 dark:text-neutral-400">
            Chọn đợt đồ án:
          </span>
          <Select
            value={effectiveRoundId ? String(effectiveRoundId) : undefined}
            onValueChange={(val) => setSelectedRoundId(Number(val))}
          >
            <SelectTrigger className="h-9 min-w-56 text-xs rounded-lg border-slate-300 dark:border-neutral-700 bg-white dark:bg-[#1e1e1e] font-medium">
              <SelectValue placeholder="Chọn đợt">
                {(val) => {
                  const r = rounds.find((x) => String(x.id) === String(val));
                  return r ? r.projectType.name : 'Chọn đợt';
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {rounds.map((r) => (
                <SelectItem key={r.id} value={String(r.id)}>
                  {r.projectType.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {capacity && (
          <div className="text-xs text-slate-600 dark:text-neutral-400">
            Chỉ tiêu: <strong className="text-slate-900 dark:text-neutral-100 font-semibold">{capacity.targetQuota} đề tài</strong> / GV
            {' • '}
            Đạt chỉ tiêu: <strong className="text-emerald-600 dark:text-emerald-400 font-semibold">{capacity.lecturersMetQuotaCount}</strong>/{capacity.lecturersCount} GV
          </div>
        )}
      </div>

      {/* ── Thước đo Cung - Cầu & Sĩ số đợt ── */}
      {isCapacityPending ? (
        <div className="flex justify-center py-8">
          <Loader2 className="size-5 animate-spin text-primary" />
        </div>
      ) : capacity ? (
        <div className="rounded-xl border border-slate-300 dark:border-neutral-700 bg-white dark:bg-[#1e1e1e] p-4.5 shadow-2xs space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {/* 1. Nhu cầu sinh viên */}
            <div className="rounded-lg border border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-[#161616] p-3 space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-neutral-400">
                <Users className="size-3.5 text-primary" />
                <span>Sinh viên đủ điều kiện</span>
              </div>
              <div className="text-xl font-bold text-slate-900 dark:text-neutral-100">
                {capacity.eligibleStudentCount}{' '}
                <span className="text-xs font-normal text-slate-500">SV</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-neutral-400">
                Sĩ số tối đa: {capacity.round.maxStudentsPerTopic} SV / đề tài
              </p>
            </div>

            {/* 2. Mục tiêu số đề tài */}
            <div className="rounded-lg border border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-[#161616] p-3 space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-neutral-400">
                <Layers className="size-3.5 text-primary" />
                <span>Nhu cầu đề tài tối thiểu</span>
              </div>
              <div className="text-xl font-bold text-slate-900 dark:text-neutral-100">
                {capacity.estimatedGroupsNeeded}{' '}
                <span className="text-xs font-normal text-slate-500">đề tài</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-neutral-400">
                Khuyến nghị: {capacity.targetTopicsWithBuffer} đề tài (dự phòng 15%)
              </p>
            </div>

            {/* 3. Đề tài hiện có */}
            <div className="rounded-lg border border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-[#161616] p-3 space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-neutral-400">
                <FileText className="size-3.5 text-primary" />
                <span>Đề tài đã nộp</span>
              </div>
              <div className="text-xl font-bold text-slate-900 dark:text-neutral-100">
                {capacity.totalTopicsSubmitted}{' '}
                <span className="text-xs font-normal text-slate-500">
                  ({capacity.approvedTopicsCount} đã duyệt)
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-neutral-400">
                Chờ duyệt: {capacity.pendingTopicsCount} • Bản nháp: {capacity.draftTopicsCount}
              </p>
            </div>

            {/* 4. Cân đối cung cầu */}
            <div
              className={`rounded-lg border p-3 space-y-1 ${
                capacity.deficit > 0
                  ? 'border-amber-300 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/20'
                  : 'border-emerald-300 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/20'
              }`}
            >
              <div className="flex items-center gap-1.5 text-xs font-medium">
                {capacity.deficit > 0 ? (
                  <>
                    <AlertTriangle className="size-3.5 text-amber-600 dark:text-amber-400" />
                    <span className="text-amber-700 dark:text-amber-300">Cân đối đợt</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-emerald-700 dark:text-emerald-300">Cân đối đợt</span>
                  </>
                )}
              </div>
              <div
                className={`text-xl font-bold ${
                  capacity.deficit > 0
                    ? 'text-amber-700 dark:text-amber-300'
                    : 'text-emerald-700 dark:text-emerald-300'
                }`}
              >
                {capacity.deficit > 0
                  ? `Thiếu ${capacity.deficit} đề tài`
                  : 'Đủ đáp ứng'}
              </div>
              <p className="text-[11px] text-slate-600 dark:text-neutral-400">
                {capacity.assignedStudentsCount}/{capacity.eligibleStudentCount} SV đã có nhóm
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {/* ── Bảng tiến độ nộp đề tài của từng Giảng viên ── */}
      <div className="space-y-3">
        {/* Bộ lọc bảng giảng viên */}
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 size-4 text-slate-400" />
              <Input
                placeholder="Tìm tên hoặc email giảng viên..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 pl-8.5 text-xs rounded-lg border-slate-300 dark:border-neutral-700 bg-white dark:bg-[#1e1e1e]"
              />
            </div>

            <Select
              value={majorFilter}
              onValueChange={(val) => setMajorFilter(val ?? 'ALL')}
            >
              <SelectTrigger className="h-9 w-44 text-xs rounded-lg border-slate-300 dark:border-neutral-700 bg-white dark:bg-[#1e1e1e]">
                <SelectValue placeholder="Mọi bộ môn" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Mọi bộ môn</SelectItem>
                {(majors ?? []).map((m) => (
                  <SelectItem key={m.id} value={String(m.id)}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={statusFilter}
              onValueChange={(val) => setStatusFilter(val ?? 'ALL')}
            >
              <SelectTrigger className="h-9 w-38 text-xs rounded-lg border-slate-300 dark:border-neutral-700 bg-white dark:bg-[#1e1e1e]">
                <SelectValue placeholder="Mọi tình trạng" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Mọi tình trạng</SelectItem>
                <SelectItem value="MET">Đạt chỉ tiêu</SelectItem>
                <SelectItem value="IN_PROGRESS">Đang nộp</SelectItem>
                <SelectItem value="NOT_STARTED">Chưa nộp</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <span className="text-xs text-slate-500 dark:text-neutral-400">
            {filteredLecturers.length} giảng viên
          </span>
        </div>

        {/* Bảng danh sách */}
        <div className="overflow-hidden rounded-xl border border-slate-300 dark:border-neutral-700 bg-white dark:bg-[#1e1e1e] shadow-2xs">
          <Table>
            <TableHeader className="bg-slate-50 dark:bg-[#171717] border-b border-slate-200 dark:border-neutral-800">
              <TableRow>
                <TableHead className="w-12 text-center text-xs font-semibold text-slate-900 dark:text-neutral-100">
                  STT
                </TableHead>
                <TableHead className="text-xs font-semibold text-slate-900 dark:text-neutral-100">
                  Giảng viên
                </TableHead>
                <TableHead className="text-xs font-semibold text-slate-900 dark:text-neutral-100">
                  Bộ môn / Chuyên ngành
                </TableHead>
                <TableHead className="text-center text-xs font-semibold text-slate-900 dark:text-neutral-100">
                  Đã nộp
                </TableHead>
                <TableHead className="text-center text-xs font-semibold text-slate-900 dark:text-neutral-100">
                  Đã duyệt
                </TableHead>
                <TableHead className="text-center text-xs font-semibold text-slate-900 dark:text-neutral-100">
                  Chờ duyệt
                </TableHead>
                <TableHead className="text-center text-xs font-semibold text-slate-900 dark:text-neutral-100">
                  Bản nháp
                </TableHead>
                <TableHead className="text-center text-xs font-semibold text-slate-900 dark:text-neutral-100">
                  Chỉ tiêu
                </TableHead>
                <TableHead className="text-center text-xs font-semibold text-slate-900 dark:text-neutral-100">
                  Trạng thái
                </TableHead>
                <TableHead className="w-24 text-right text-xs font-semibold text-slate-900 dark:text-neutral-100">
                  Thao tác
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLecturers.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={10}
                    className="py-8 text-center text-xs text-slate-500 dark:text-neutral-400"
                  >
                    Không tìm thấy giảng viên phù hợp với bộ lọc.
                  </TableCell>
                </TableRow>
              ) : (
                filteredLecturers.map((lecturer, index) => (
                  <TableRow
                    key={lecturer.lecturerId}
                    className="hover:bg-slate-50/80 dark:hover:bg-neutral-800/40"
                  >
                    <TableCell className="text-center text-xs font-mono text-slate-500">
                      {index + 1}
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <Avatar className="size-7 border border-slate-200 dark:border-neutral-700">
                          {lecturer.avatarUrl && (
                            <AvatarImage
                              src={lecturer.avatarUrl}
                              alt={lecturer.fullName}
                            />
                          )}
                          <AvatarFallback className="text-[10px] font-semibold bg-primary/10 text-primary">
                            {lecturer.fullName.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold text-xs text-slate-900 dark:text-neutral-100">
                            {lecturer.academicTitle
                              ? `${lecturer.academicTitle}. ${lecturer.fullName}`
                              : lecturer.fullName}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-neutral-400 font-mono">
                            {lecturer.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="text-xs text-slate-700 dark:text-neutral-300">
                      {lecturer.majorName ?? 'Chưa phân bộ môn'}
                    </TableCell>

                    <TableCell className="text-center font-mono font-semibold text-xs text-slate-900 dark:text-neutral-100">
                      {lecturer.topicsCount}
                    </TableCell>

                    <TableCell className="text-center font-mono text-xs font-medium text-emerald-600 dark:text-emerald-400">
                      {lecturer.approvedCount}
                    </TableCell>

                    <TableCell className="text-center font-mono text-xs font-medium text-amber-600 dark:text-amber-400">
                      {lecturer.pendingCount}
                    </TableCell>

                    <TableCell className="text-center font-mono text-xs text-slate-400">
                      {lecturer.draftCount}
                    </TableCell>

                    <TableCell className="text-center font-mono text-xs text-slate-600 dark:text-neutral-400">
                      {lecturer.targetQuota}
                    </TableCell>

                    <TableCell className="text-center">
                      {lecturer.status === 'MET' ? (
                        <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">
                          <CheckCircle2 className="size-3" />
                          Đạt chỉ tiêu
                        </span>
                      ) : lecturer.status === 'IN_PROGRESS' ? (
                        <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300">
                          <Clock className="size-3" />
                          Đang nộp ({lecturer.approvedCount}/{lecturer.targetQuota})
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300">
                          <AlertTriangle className="size-3" />
                          Chưa nộp
                        </span>
                      )}
                    </TableCell>

                    <TableCell className="text-right">
                      {onFilterByLecturer && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-[11px] text-primary hover:text-primary hover:bg-primary/10 cursor-pointer gap-1"
                          onClick={() => onFilterByLecturer(lecturer.lecturerId)}
                        >
                          <span>Xem đề tài</span>
                          <ArrowRight className="size-3" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
