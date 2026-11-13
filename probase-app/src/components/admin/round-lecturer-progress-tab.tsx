'use client';

import { useMemo, useState } from 'react';
import {
  ArrowRight,
  Loader2,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  useRoundCapacity,
  useRoundsForSemester,
  useUpdateRound,
} from '@/lib/api/master-data';
import { useMajors } from '@/lib/api/majors';
import { sanitizeLecturerName } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  const updateRound = useUpdateRound();

  const [selectedRoundId, setSelectedRoundId] = useState<number | undefined>(
    undefined,
  );
  const [search, setSearch] = useState('');
  const [majorFilter, setMajorFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Quota adjustment dialog state
  const [quotaDialogOpen, setQuotaDialogOpen] = useState(false);
  const [editMaxStudents, setEditMaxStudents] = useState<number>(2);
  const [editMinTopics, setEditMinTopics] = useState<string>('1');

  // Default to first round once loaded
  const effectiveRoundId = selectedRoundId ?? rounds?.[0]?.id;

  const { data: capacity, isPending: isCapacityPending } =
    useRoundCapacity(effectiveRoundId);

  function handleOpenQuotaDialog() {
    if (!capacity) return;
    setEditMaxStudents(capacity.round.maxStudentsPerTopic || 2);
    setEditMinTopics(
      capacity.round.minTopicsPerLecturer !== null &&
        capacity.round.minTopicsPerLecturer !== undefined
        ? String(capacity.round.minTopicsPerLecturer)
        : '',
    );
    setQuotaDialogOpen(true);
  }

  async function handleSaveQuota(e: React.FormEvent) {
    e.preventDefault();
    if (!effectiveRoundId) return;

    const parsedMinTopics =
      editMinTopics.trim() === ''
        ? null
        : Math.max(1, Number(editMinTopics) || 1);

    try {
      await updateRound.mutateAsync({
        roundId: effectiveRoundId,
        data: {
          maxStudentsPerTopic: Math.max(1, Number(editMaxStudents) || 1),
          minTopicsPerLecturer: parsedMinTopics,
        },
      });
      toast.success('Đã cập nhật chỉ tiêu đợt');
      setQuotaDialogOpen(false);
    } catch {
      toast.error('Không thể cập nhật chỉ tiêu. Vui lòng thử lại.');
    }
  }

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

  const currentMax = Math.max(1, Number(editMaxStudents) || 1);
  const calculatedGroupsNeeded = capacity
    ? Math.ceil(capacity.eligibleStudentCount / currentMax)
    : 0;
  const parsedMin =
    editMinTopics.trim() === '' ? 1 : Math.max(1, Number(editMinTopics) || 1);
  const totalFromLecturers = (capacity?.lecturersCount ?? 0) * parsedMin;

  return (
    <div className="space-y-4">
      {/* ── Chọn đợt đánh giá & Nút cài đặt chỉ tiêu ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
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

          {capacity && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleOpenQuotaDialog}
              className="h-9 gap-1.5 text-xs rounded-lg border-slate-300 dark:border-neutral-700 bg-white dark:bg-[#1e1e1e] hover:bg-slate-50 dark:hover:bg-neutral-800 text-slate-700 dark:text-neutral-200 cursor-pointer shadow-2xs"
            >
              <SlidersHorizontal className="size-3.5 text-primary" />
              <span>Cài đặt chỉ tiêu đợt</span>
            </Button>
          )}
        </div>

        {capacity && (
          <div className="text-xs text-slate-600 dark:text-neutral-400">
            Chỉ tiêu: <strong className="text-slate-900 dark:text-neutral-100 font-semibold">{capacity.targetQuota} đề tài</strong> / GV
            {' • '}
            Đạt chỉ tiêu: <strong className="text-emerald-600 dark:text-emerald-400 font-semibold">{capacity.lecturersMetQuotaCount}</strong>/{capacity.lecturersCount} GV
          </div>
        )}
      </div>

      {/* ── Băng tổng quan chỉ tiêu & Cân đối đợt (Thanh mảnh, tập trung số liệu) ── */}
      {isCapacityPending ? (
        <div className="flex justify-center py-6">
          <Loader2 className="size-5 animate-spin text-primary" />
        </div>
      ) : capacity ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-300 dark:border-neutral-700 bg-white dark:bg-[#1e1e1e] px-4 py-2.5 shadow-2xs">
          <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1 text-xs text-slate-700 dark:text-neutral-300">
            <span className="font-semibold text-slate-900 dark:text-neutral-100">
              {capacity.round.projectTypeName}:
            </span>
            <span>
              <strong className="text-slate-900 dark:text-neutral-100 font-semibold">
                {capacity.eligibleStudentCount}
              </strong>{' '}
              SV đủ ĐK ({capacity.round.maxStudentsPerTopic} SV/đề tài)
            </span>
            <span className="text-slate-300 dark:text-neutral-700">•</span>
            <span>
              Mục tiêu:{' '}
              <strong className="text-slate-900 dark:text-neutral-100 font-semibold">
                ~{capacity.estimatedGroupsNeeded} nhóm
              </strong>{' '}
              ({capacity.estimatedGroupsNeeded} - {capacity.targetTopicsWithBuffer} đề tài)
            </span>
            <span className="text-slate-300 dark:text-neutral-700">•</span>
            <span>
              Đã nộp:{' '}
              <strong className="text-slate-900 dark:text-neutral-100 font-semibold">
                {capacity.totalTopicsSubmitted} đề tài
              </strong>{' '}
              ({capacity.approvedTopicsCount} đã duyệt
              {capacity.pendingTopicsCount > 0
                ? `, ${capacity.pendingTopicsCount} chờ duyệt`
                : ''}
              {capacity.draftTopicsCount > 0
                ? `, ${capacity.draftTopicsCount} nháp`
                : ''}
              )
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs">
            {capacity.deficit > 0 ? (
              <span className="font-semibold text-amber-600 dark:text-amber-400">
                Còn thiếu {capacity.deficit} đề tài
              </span>
            ) : (
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                Đủ đáp ứng ({capacity.approvedTopicsCount}/{capacity.estimatedGroupsNeeded})
              </span>
            )}
            <span className="text-slate-300 dark:text-neutral-700">•</span>
            <span className="text-slate-500 dark:text-neutral-400">
              {capacity.assignedStudentsCount}/{capacity.eligibleStudentCount} SV đã có nhóm
            </span>
          </div>
        </div>
      ) : null}

      {/* ── Bảng tiến độ nộp đề tài của từng Giảng viên ── */}
      <div className="space-y-3 pt-1">
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
                <SelectValue placeholder="Mọi bộ môn">
                  {(val) => {
                    if (!val || val === 'ALL') return 'Mọi bộ môn';
                    return (
                      majors?.find((m) => String(m.id) === String(val))?.name ??
                      'Mọi bộ môn'
                    );
                  }}
                </SelectValue>
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
                <SelectValue placeholder="Mọi tình trạng">
                  {(val) => {
                    if (!val || val === 'ALL') return 'Mọi tình trạng';
                    if (val === 'MET') return 'Đạt chỉ tiêu';
                    if (val === 'IN_PROGRESS') return 'Đang nộp';
                    if (val === 'NOT_STARTED') return 'Chưa nộp';
                    return 'Mọi tình trạng';
                  }}
                </SelectValue>
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

        {/* Bảng danh sách chuẩn mực, đồng bộ header với các trang khác */}
        <div className="overflow-hidden rounded-xl border border-slate-300 dark:border-neutral-700 bg-white dark:bg-[#1e1e1e] shadow-2xs">
          <Table containerClassName="overflow-visible" className="relative w-full text-left text-sm">
            <TableHeader sticky>
              <TableRow>
                <TableHead className="w-12 text-center">STT</TableHead>
                <TableHead className="min-w-48 px-4">Giảng viên</TableHead>
                <TableHead className="px-4">Bộ môn / Chuyên ngành</TableHead>
                <TableHead className="text-center px-3">Đã nộp</TableHead>
                <TableHead className="text-center px-3">Đã duyệt</TableHead>
                <TableHead className="text-center px-3">Chờ duyệt</TableHead>
                <TableHead className="text-center px-3">Bản nháp</TableHead>
                <TableHead className="text-center px-3">Chỉ tiêu</TableHead>
                <TableHead className="text-center px-4">Trạng thái</TableHead>
                <TableHead className="w-24 text-right px-4">Thao tác</TableHead>
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
                    <TableCell className="text-center text-xs font-mono text-slate-500 py-3.5">
                      {index + 1}
                    </TableCell>

                    <TableCell className="px-4 py-3.5">
                      <div>
                        <p className="font-semibold text-xs text-slate-900 dark:text-neutral-100">
                          {
                            sanitizeLecturerName(
                              lecturer.fullName,
                              lecturer.academicTitle,
                            ).displayName
                          }
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-neutral-400 font-mono">
                          {lecturer.email}
                        </p>
                      </div>
                    </TableCell>

                    <TableCell className="px-4 py-3.5 text-xs text-slate-700 dark:text-neutral-300">
                      {lecturer.majorName ?? 'Chưa phân bộ môn'}
                    </TableCell>

                    <TableCell className="text-center font-mono font-semibold text-xs text-slate-900 dark:text-neutral-100 px-3 py-3.5">
                      {lecturer.topicsCount}
                    </TableCell>

                    <TableCell className="text-center font-mono font-semibold text-xs text-emerald-600 dark:text-emerald-400 px-3 py-3.5">
                      {lecturer.approvedCount}
                    </TableCell>

                    <TableCell className="text-center font-mono font-semibold text-xs text-amber-600 dark:text-amber-400 px-3 py-3.5">
                      {lecturer.pendingCount}
                    </TableCell>

                    <TableCell className="text-center font-mono text-xs text-slate-400 px-3 py-3.5">
                      {lecturer.draftCount}
                    </TableCell>

                    <TableCell className="text-center font-mono text-xs text-slate-600 dark:text-neutral-400 px-3 py-3.5">
                      {lecturer.targetQuota}
                    </TableCell>

                    <TableCell className="text-center px-4 py-3.5">
                      {lecturer.status === 'MET' ? (
                        <span className="font-semibold text-xs text-emerald-600 dark:text-emerald-400">
                          Đạt chỉ tiêu
                        </span>
                      ) : lecturer.status === 'IN_PROGRESS' ? (
                        <span className="font-semibold text-xs text-amber-600 dark:text-amber-400">
                          Đang nộp ({lecturer.approvedCount}/{lecturer.targetQuota})
                        </span>
                      ) : (
                        <span className="font-semibold text-xs text-rose-600 dark:text-rose-400">
                          Chưa nộp
                        </span>
                      )}
                    </TableCell>

                    <TableCell className="text-right px-4 py-3.5">
                      {onFilterByLecturer && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs text-primary hover:text-primary hover:bg-primary/10 cursor-pointer gap-1"
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

      {/* ── Dialog Cài đặt chỉ tiêu đợt đồ án ── */}
      <Dialog open={quotaDialogOpen} onOpenChange={setQuotaDialogOpen}>
        {/* Nền form: dùng màu đen sâu (#141414) theo đúng yêu cầu */}
        <DialogContent className="sm:max-w-md bg-white dark:bg-[#141414] border border-slate-300 dark:border-neutral-800 shadow-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-neutral-100">
              <SlidersHorizontal className="size-4 text-primary" />
              <span>Chỉ tiêu đợt — {capacity?.round.projectTypeName}</span>
            </DialogTitle>
            <DialogDescription className="sr-only">
              Cài đặt chỉ tiêu đợt đồ án
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveQuota} className="space-y-3.5 pt-1">
            <div className="space-y-1">
              <Label htmlFor="quota-max-students" className="text-xs font-medium text-slate-700 dark:text-neutral-300">
                Sĩ số tối đa / đề tài
              </Label>
              <Input
                id="quota-max-students"
                type="number"
                min={1}
                max={10}
                required
                value={editMaxStudents}
                onChange={(e) => setEditMaxStudents(Number(e.target.value) || 1)}
                className="h-9 text-xs rounded-lg bg-slate-100/80 dark:bg-[#1e1e1e] border-slate-300 dark:border-neutral-700/80 text-slate-900 dark:text-neutral-100"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="quota-min-topics" className="text-xs font-medium text-slate-700 dark:text-neutral-300">
                Chỉ tiêu đề tài / giảng viên
              </Label>
              <Input
                id="quota-min-topics"
                type="number"
                min={1}
                max={50}
                placeholder="Để trống = tự động"
                value={editMinTopics}
                onChange={(e) => setEditMinTopics(e.target.value)}
                className="h-9 text-xs rounded-lg bg-slate-100/80 dark:bg-[#1e1e1e] border-slate-300 dark:border-neutral-700/80 text-slate-900 dark:text-neutral-100 placeholder:text-slate-400 dark:placeholder:text-neutral-500"
              />
            </div>

            {/* Ô Cung - Cầu: Nền xám nổi (#1e1e1e) trên nền đen form (#141414), gọn gàng & thuần số liệu */}
            {capacity && (
              <div className="rounded-lg border border-slate-300 dark:border-neutral-800 bg-slate-100/80 dark:bg-[#1e1e1e] p-2.5 text-xs">
                <div className="grid grid-cols-3 gap-2 text-center divide-x divide-slate-200 dark:divide-neutral-800">
                  <div className="space-y-0.5">
                    <span className="text-[11px] text-slate-500 dark:text-neutral-400 block">
                      SV đủ ĐK
                    </span>
                    <p className="text-sm font-bold text-slate-900 dark:text-neutral-100">
                      {capacity.eligibleStudentCount}
                    </p>
                  </div>
                  <div className="space-y-0.5 pl-2">
                    <span className="text-[11px] text-slate-500 dark:text-neutral-400 block">
                      Nhu cầu
                    </span>
                    <p className="text-sm font-bold text-slate-900 dark:text-neutral-100">
                      ~{calculatedGroupsNeeded} đề tài
                    </p>
                  </div>
                  <div className="space-y-0.5 pl-2">
                    <span className="text-[11px] text-slate-500 dark:text-neutral-400 block">
                      Cung ({capacity.lecturersCount} GV)
                    </span>
                    <p className="text-sm font-bold text-slate-900 dark:text-neutral-100">
                      ~{totalFromLecturers} đề tài
                    </p>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setQuotaDialogOpen(false)}
                className="h-9 text-xs cursor-pointer border-slate-300 dark:border-neutral-700 bg-white dark:bg-[#1e1e1e] hover:bg-slate-50 dark:hover:bg-neutral-800 text-slate-700 dark:text-neutral-200"
              >
                Hủy
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={updateRound.isPending}
                className="h-9 text-xs bg-primary text-white hover:bg-primary/90 font-semibold cursor-pointer shadow-xs"
              >
                {updateRound.isPending && (
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                )}
                Lưu cài đặt
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
