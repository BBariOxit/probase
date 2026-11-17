'use client';

import { useMemo, useState } from 'react';
import {
  ArrowRight,
  Loader2,
  Pencil,
  RotateCcw,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  useRoundCapacity,
  useRoundsForSemester,
  useUpdateLecturerQuota,
  useUpdateRound,
} from '@/lib/api/master-data';
import { useMajors } from '@/lib/api/majors';
import { LecturerRoundProgress } from '@/lib/api/types';
import { sanitizeLecturerName } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
  defaultMajorId?: number;
  onFilterByLecturer?: (lecturerId: number) => void;
}

export function RoundLecturerProgressTab({
  semesterId,
  defaultMajorId,
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
  const [majorFilter, setMajorFilter] = useState<string>(
    defaultMajorId ? String(defaultMajorId) : 'ALL',
  );
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Quota adjustment dialog state
  const [quotaDialogOpen, setQuotaDialogOpen] = useState(false);
  const [editMaxStudents, setEditMaxStudents] = useState<number>(2);
  const [editMinTopics, setEditMinTopics] = useState<string>('1');

  // Individual Lecturer Quota Dialog State
  const [editingLecturer, setEditingLecturer] =
    useState<LecturerRoundProgress | null>(null);
  const [customQuotaInput, setCustomQuotaInput] = useState<string>('');
  const [isExemptChecked, setIsExemptChecked] = useState(false);
  const [exemptReasonInput, setExemptReasonInput] = useState('');
  const updateLecturerQuota = useUpdateLecturerQuota();

  // Default to first round once loaded
  const effectiveRoundId = selectedRoundId ?? rounds?.[0]?.id;

  const { data: capacity } = useRoundCapacity(effectiveRoundId);

  function handleOpenLecturerQuota(lecturer: LecturerRoundProgress) {
    setEditingLecturer(lecturer);
    setCustomQuotaInput(
      lecturer.hasCustomQuota
        ? String(lecturer.targetQuota)
        : String(capacity?.targetQuota ?? 5),
    );
    setIsExemptChecked(Boolean(lecturer.isExempt));
    setExemptReasonInput(lecturer.exemptReason ?? '');
  }

  async function handleSaveLecturerQuota(e: React.FormEvent) {
    e.preventDefault();
    if (!effectiveRoundId || !editingLecturer) return;

    try {
      if (isExemptChecked) {
        await updateLecturerQuota.mutateAsync({
          roundId: effectiveRoundId,
          lecturerId: editingLecturer.lecturerId,
          data: {
            isExempt: true,
            exemptReason:
              exemptReasonInput.trim() || 'Miễn trừ theo kế hoạch công tác',
            targetQuota: 0,
          },
        });
        toast.success(`Đã cập nhật miễn trừ cho ${editingLecturer.fullName}`);
      } else {
        const quotaNum = Math.max(0, Number(customQuotaInput) || 0);
        await updateLecturerQuota.mutateAsync({
          roundId: effectiveRoundId,
          lecturerId: editingLecturer.lecturerId,
          data: {
            isExempt: false,
            exemptReason: null,
            targetQuota: quotaNum,
          },
        });
        toast.success(
          `Đã cập nhật chỉ tiêu cho ${editingLecturer.fullName}: ${quotaNum} đề tài`,
        );
      }
      setEditingLecturer(null);
    } catch {
      toast.error('Không thể cập nhật chỉ tiêu giảng viên.');
    }
  }

  async function handleResetToDefault() {
    if (!effectiveRoundId || !editingLecturer) return;
    try {
      await updateLecturerQuota.mutateAsync({
        roundId: effectiveRoundId,
        lecturerId: editingLecturer.lecturerId,
        data: {
          isExempt: false,
          exemptReason: null,
          targetQuota: null,
        },
      });
      toast.success(
        `Đã khôi phục chỉ tiêu mặc định cho ${editingLecturer.fullName}`,
      );
      setEditingLecturer(null);
    } catch {
      toast.error('Không thể khôi phục chỉ tiêu mặc định.');
    }
  }

  function handleOpenQuotaDialog() {
    if (!capacity) return;
    setEditMaxStudents(capacity.round.maxStudentsPerTopic || 2);
    const initialMinTopics =
      capacity.round.minTopicsPerLecturer !== null &&
      capacity.round.minTopicsPerLecturer !== undefined
        ? capacity.round.minTopicsPerLecturer
        : capacity.targetQuota || 1;
    setEditMinTopics(String(initialMinTopics));
    setQuotaDialogOpen(true);
  }

  async function handleSaveQuota(e: React.FormEvent) {
    e.preventDefault();
    if (!effectiveRoundId) return;

    const parsedMinTopics = Math.max(1, Number(editMinTopics) || 1);

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
              className="h-9 gap-1.5 text-sm rounded-lg border-slate-300 dark:border-neutral-700 bg-white dark:bg-[#1e1e1e] hover:bg-slate-50 dark:hover:bg-neutral-800 text-slate-700 dark:text-neutral-200 cursor-pointer shadow-2xs"
            >
              <SlidersHorizontal className="size-3.5 text-primary" />
              <span>Cài đặt chỉ tiêu đợt</span>
            </Button>
          )}
        </div>

        {capacity && (
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600 dark:text-neutral-400">
            <span>
              Đề tài đã duyệt:{' '}
              <strong className="text-slate-900 dark:text-neutral-100 font-semibold font-mono">
                {capacity.approvedTopicsCount}
              </strong>{' '}
              / ~{capacity.estimatedGroupsNeeded} cần thiết
              {capacity.deficit > 0 ? (
                <span className="ml-1 text-amber-600 dark:text-amber-400 font-semibold">
                  (Còn thiếu {capacity.deficit})
                </span>
              ) : (
                <span className="ml-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                  (Đủ mở đợt)
                </span>
              )}
            </span>
            <span className="text-slate-300 dark:text-neutral-700">•</span>
            <span>
              Giảng viên đạt chỉ tiêu:{' '}
              <strong className="text-slate-900 dark:text-neutral-100 font-semibold font-mono">
                {capacity.lecturersMetQuotaCount}
              </strong>
              /{capacity.activeLecturersCount ?? capacity.lecturersCount} GV
              {Boolean(capacity.exemptLecturersCount) && (
                <span className="ml-1 text-slate-500 dark:text-neutral-400">
                  ({capacity.exemptLecturersCount} miễn trừ)
                </span>
              )}
            </span>
            <span className="text-slate-300 dark:text-neutral-700">•</span>
            <span>
              Chỉ tiêu chung:{' '}
              <strong className="text-slate-900 dark:text-neutral-100 font-semibold font-mono">
                {capacity.targetQuota}
              </strong>{' '}
              đề tài / GV
            </span>
          </div>
        )}
      </div>

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
                className="h-9 pl-8.5 text-sm rounded-lg border-slate-300 dark:border-neutral-700 bg-white dark:bg-[#1e1e1e]"
              />
            </div>

            <Select
              value={majorFilter}
              onValueChange={(val) => setMajorFilter(val ?? 'ALL')}
            >
              <SelectTrigger className="h-9 w-44 text-sm rounded-lg border-slate-300 dark:border-neutral-700 bg-white dark:bg-[#1e1e1e]">
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
                <SelectItem value="ALL" className="text-sm">Mọi bộ môn</SelectItem>
                {(majors ?? []).map((m) => (
                  <SelectItem key={m.id} value={String(m.id)} className="text-sm">
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={statusFilter}
              onValueChange={(val) => setStatusFilter(val ?? 'ALL')}
            >
              <SelectTrigger className="h-9 w-42 text-sm rounded-lg border-slate-300 dark:border-neutral-700 bg-white dark:bg-[#1e1e1e]">
                <SelectValue placeholder="Mọi tình trạng">
                  {(val) => {
                    if (!val || val === 'ALL') return 'Mọi tình trạng';
                    if (val === 'MET') return 'Đạt chỉ tiêu';
                    if (val === 'IN_PROGRESS') return 'Chưa đủ chỉ tiêu';
                    if (val === 'NOT_STARTED') return 'Chưa nộp';
                    if (val === 'EXEMPT') return 'Được miễn trừ';
                    return 'Mọi tình trạng';
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL" className="text-sm">Mọi tình trạng</SelectItem>
                <SelectItem value="MET" className="text-sm">Đạt chỉ tiêu</SelectItem>
                <SelectItem value="IN_PROGRESS" className="text-sm">Chưa đủ chỉ tiêu</SelectItem>
                <SelectItem value="NOT_STARTED" className="text-sm">Chưa nộp</SelectItem>
                <SelectItem value="EXEMPT" className="text-sm">Được miễn trừ</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <span className="text-sm text-slate-500 dark:text-neutral-400">
            {filteredLecturers.length} giảng viên
          </span>
        </div>

        {/* Bảng danh sách chuẩn mực, có cuộn ngang mượt mà khi thu nhỏ màn hình */}
        <div className="overflow-hidden rounded-xl border border-slate-300 dark:border-neutral-800 bg-white dark:bg-[#18181b] shadow-xs">
          <div className="w-full overflow-x-auto">
            <Table className="relative w-full min-w-[960px] text-left text-sm">
              <TableHeader sticky>
                <TableRow>
                  <TableHead className="w-12 text-center">
                    STT
                  </TableHead>
                  <TableHead className="min-w-48 px-4">
                    Giảng viên
                  </TableHead>
                  <TableHead className="px-4">
                    Bộ môn / Chuyên ngành
                  </TableHead>
                  <TableHead className="text-center px-3">
                    Đã nộp
                  </TableHead>
                  <TableHead className="text-center px-3">
                    Đã duyệt
                  </TableHead>
                  <TableHead className="text-center px-3">
                    Chờ duyệt
                  </TableHead>
                  <TableHead className="text-center px-3">
                    Bản nháp
                  </TableHead>
                  <TableHead className="text-center px-3">
                    Chỉ tiêu
                  </TableHead>
                  <TableHead className="text-center px-4">
                    Trạng thái
                  </TableHead>
                  <TableHead className="w-24 text-right px-4">
                    Thao tác
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLecturers.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={10}
                      className="py-12 text-center text-xs text-slate-500 dark:text-neutral-400"
                    >
                      Không tìm thấy giảng viên phù hợp với bộ lọc.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLecturers.map((lecturer, index) => (
                    <TableRow
                      key={lecturer.lecturerId}
                      className="hover:bg-slate-50/80 dark:hover:bg-neutral-800/40 transition-colors"
                    >
                      <TableCell className="text-center text-sm font-mono text-slate-400 dark:text-neutral-500 py-3.5">
                        {index + 1}
                      </TableCell>

                      <TableCell className="px-4 py-3.5">
                        <div>
                          <p className="font-semibold text-sm text-slate-900 dark:text-neutral-100">
                            {
                              sanitizeLecturerName(
                                lecturer.fullName,
                                lecturer.academicTitle,
                              ).displayName
                            }
                          </p>
                          <p className="text-xs text-slate-500 dark:text-neutral-400 font-mono">
                            {lecturer.email}
                          </p>
                        </div>
                      </TableCell>

                      <TableCell className="px-4 py-3.5 text-sm text-slate-700 dark:text-neutral-300">
                        {lecturer.majorName ?? 'Chưa phân bộ môn'}
                      </TableCell>

                      {/* Tổng đề tài: số tổng */}
                      <TableCell className="text-center font-mono font-semibold text-sm text-slate-800 dark:text-neutral-200 px-3 py-3.5">
                        {lecturer.topicsCount}
                      </TableCell>

                      {/* Đã duyệt: chỉ xanh khi > 0 */}
                      <TableCell className="text-center font-mono text-sm px-3 py-3.5">
                        {lecturer.approvedCount > 0 ? (
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                            {lecturer.approvedCount}
                          </span>
                        ) : (
                          <span className="text-slate-400 dark:text-neutral-500">
                            0
                          </span>
                        )}
                      </TableCell>

                      {/* Chờ duyệt: chỉ cam khi > 0 */}
                      <TableCell className="text-center font-mono text-sm px-3 py-3.5">
                        {lecturer.pendingCount > 0 ? (
                          <span className="font-semibold text-amber-600 dark:text-amber-400">
                            {lecturer.pendingCount}
                          </span>
                        ) : (
                          <span className="text-slate-400 dark:text-neutral-500">
                            0
                          </span>
                        )}
                      </TableCell>

                      {/* Bản nháp: số mờ */}
                      <TableCell className="text-center font-mono text-sm text-slate-400 dark:text-neutral-500 px-3 py-3.5">
                        {lecturer.draftCount}
                      </TableCell>

                      {/* Chỉ tiêu: Có thể bấm sửa riêng hoặc miễn trừ */}
                      <TableCell className="text-center px-3 py-3.5">
                        <button
                          type="button"
                          onClick={() => handleOpenLecturerQuota(lecturer)}
                          className="group/quota inline-flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-slate-100 dark:hover:bg-neutral-800/80 transition-colors cursor-pointer text-sm"
                          title="Bấm để chỉnh chỉ tiêu riêng hoặc miễn trừ cho giảng viên này"
                        >
                          {lecturer.isExempt ? (
                            <span className="text-slate-400 dark:text-neutral-500 font-medium">
                              Miễn trừ
                            </span>
                          ) : (
                            <div className="flex items-baseline gap-0.5">
                              <span className="font-mono font-semibold text-slate-800 dark:text-neutral-200">
                                {lecturer.targetQuota}
                              </span>
                              {lecturer.hasCustomQuota && (
                                <span
                                  className="text-xs text-primary font-bold"
                                  title="Chỉ tiêu riêng được thiết lập riêng"
                                >
                                  *
                                </span>
                              )}
                            </div>
                          )}
                          <Pencil className="size-3.5 text-primary -translate-y-0.5 shrink-0 transition-transform group-hover/quota:scale-110" />
                        </button>
                      </TableCell>

                      {/* Trạng thái: Đúng chuẩn nghiệp vụ đào tạo, chỉ đổi màu chữ */}
                      <TableCell className="text-center px-4 py-3.5 text-sm font-medium">
                        {lecturer.isExempt ? (
                          <span className="text-slate-400 dark:text-neutral-500">
                            Miễn trừ{lecturer.exemptReason ? ` (${lecturer.exemptReason})` : ''}
                          </span>
                        ) : lecturer.status === 'MET' ? (
                          <span className="text-emerald-600 dark:text-emerald-400">
                            Đạt chỉ tiêu
                          </span>
                        ) : lecturer.status === 'IN_PROGRESS' ? (
                          <span className="text-amber-600 dark:text-amber-400">
                            Thiếu {Math.max(1, lecturer.targetQuota - lecturer.approvedCount)} đề tài
                          </span>
                        ) : (
                          <span className="text-rose-600 dark:text-rose-400">
                            Chưa nộp
                          </span>
                        )}
                      </TableCell>

                      <TableCell className="text-right px-4 py-3.5">
                        {onFilterByLecturer && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2.5 text-xs text-primary hover:text-primary hover:bg-primary/10 cursor-pointer gap-1"
                            onClick={() => onFilterByLecturer(lecturer.lecturerId)}
                          >
                            <span>Xem đề tài</span>
                            <ArrowRight className="size-3.5" />
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

      {/* ── Dialog Cài đặt chỉ tiêu đợt đồ án ── */}
      <Dialog open={quotaDialogOpen} onOpenChange={setQuotaDialogOpen}>
        {/* Nền form: dùng màu đen sâu (#141414) theo đúng yêu cầu */}
        <DialogContent className="sm:max-w-md bg-white dark:bg-[#141414] border border-slate-300 dark:border-neutral-800 shadow-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-neutral-100">
              <SlidersHorizontal className="size-4 text-primary" />
              <span>Chỉ tiêu đợt — {capacity?.round.projectTypeName}</span>
            </DialogTitle>
            <DialogDescription className="sr-only">
              Cài đặt chỉ tiêu đợt đồ án
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveQuota} className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label htmlFor="quota-max-students" className="text-sm font-medium text-slate-700 dark:text-neutral-300">
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
                className="h-9 text-sm rounded-lg bg-slate-100/80 dark:bg-[#1e1e1e] border-slate-300 dark:border-neutral-700/80 text-slate-900 dark:text-neutral-100"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="quota-min-topics" className="text-sm font-medium text-slate-700 dark:text-neutral-300">
                Chỉ tiêu đề tài / giảng viên
              </Label>
              <Input
                id="quota-min-topics"
                type="number"
                min={1}
                max={50}
                required
                value={editMinTopics}
                onChange={(e) => setEditMinTopics(e.target.value)}
                className="h-9 text-sm rounded-lg bg-slate-100/80 dark:bg-[#1e1e1e] border-slate-300 dark:border-neutral-700/80 text-slate-900 dark:text-neutral-100"
              />
            </div>

            {/* Thống kê tính toán định mức chuẩn đào tạo */}
            {capacity && (
              <div className="rounded-lg border border-slate-300 dark:border-neutral-800 bg-slate-100/80 dark:bg-[#1e1e1e] p-3 text-xs">
                <div className="grid grid-cols-3 gap-2 text-center divide-x divide-slate-200 dark:divide-neutral-800">
                  <div className="space-y-0.5">
                    <span className="text-xs text-slate-500 dark:text-neutral-400 block">
                      SV dự kiến tham gia
                    </span>
                    <p className="text-sm font-bold text-slate-900 dark:text-neutral-100 font-mono">
                      {capacity.eligibleStudentCount} SV
                    </p>
                  </div>
                  <div className="space-y-0.5 pl-2">
                    <span className="text-xs text-slate-500 dark:text-neutral-400 block">
                      Nhu cầu tối thiểu
                    </span>
                    <p className="text-sm font-bold text-slate-900 dark:text-neutral-100 font-mono">
                      ~{calculatedGroupsNeeded} đề tài
                    </p>
                  </div>
                  <div className="space-y-0.5 pl-2">
                    <span className="text-xs text-slate-500 dark:text-neutral-400 block">
                      Tổng chỉ tiêu huy động
                    </span>
                    <p className="text-sm font-bold text-slate-900 dark:text-neutral-100 font-mono">
                      ~{capacity.totalTargetQuota ?? totalFromLecturers} đề tài
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
                className="h-9 text-sm cursor-pointer border-slate-300 dark:border-neutral-700 bg-white dark:bg-[#1e1e1e] hover:bg-slate-50 dark:hover:bg-neutral-800 text-slate-700 dark:text-neutral-200"
              >
                Hủy
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={updateRound.isPending}
                className="h-9 text-sm bg-primary text-white hover:bg-primary/90 font-semibold cursor-pointer shadow-xs"
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

      {/* ── Dialog chỉnh chỉ tiêu / Miễn trừ cho Giảng viên cá nhân ── */}
      <Dialog
        open={Boolean(editingLecturer)}
        onOpenChange={(open) => {
          if (!open) setEditingLecturer(null);
        }}
      >
        <DialogContent className="sm:max-w-md bg-white dark:bg-[#141414] border border-slate-300 dark:border-neutral-800 shadow-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-neutral-100">
              <Pencil className="size-4 text-primary" />
              <span>
                Chỉ tiêu —{' '}
                {editingLecturer
                  ? sanitizeLecturerName(
                      editingLecturer.fullName,
                      editingLecturer.academicTitle,
                    ).displayName
                  : ''}
              </span>
            </DialogTitle>
            <DialogDescription className="sr-only">
              Điều chỉnh định mức đề tài hoặc miễn trừ cho giảng viên
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveLecturerQuota} className="space-y-4 pt-1">
            <div className="space-y-3.5">
              <label className="flex items-center gap-3 cursor-pointer rounded-lg border border-slate-200 dark:border-neutral-800 p-3 hover:bg-slate-50 dark:hover:bg-neutral-800/40 transition-colors">
                <Checkbox
                  checked={isExemptChecked}
                  onCheckedChange={(checked) =>
                    setIsExemptChecked(Boolean(checked))
                  }
                />
                <span className="text-sm font-medium text-slate-900 dark:text-neutral-100">
                  Miễn trừ ra đề tài trong đợt này
                </span>
              </label>

              {isExemptChecked ? (
                <div className="space-y-1.5">
                  <Label
                    htmlFor="exempt-reason"
                    className="text-sm font-medium text-slate-700 dark:text-neutral-300"
                  >
                    Lý do miễn trừ (tùy chọn)
                  </Label>
                  <Input
                    id="exempt-reason"
                    placeholder="Ví dụ: Công tác nước ngoài, làm NCS..."
                    value={exemptReasonInput}
                    onChange={(e) => setExemptReasonInput(e.target.value)}
                    className="h-9 text-sm rounded-lg bg-slate-100/80 dark:bg-[#1e1e1e] border-slate-300 dark:border-neutral-700 text-slate-900 dark:text-neutral-100"
                  />
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label
                      htmlFor="custom-quota"
                      className="text-sm font-medium text-slate-700 dark:text-neutral-300"
                    >
                      Chỉ tiêu đề tài riêng
                    </Label>
                    <span className="text-xs text-slate-500 dark:text-neutral-400">
                      Mặc định đợt: {capacity?.targetQuota ?? 5} đề tài
                    </span>
                  </div>
                  <Input
                    id="custom-quota"
                    type="number"
                    min={0}
                    max={50}
                    required
                    value={customQuotaInput}
                    onChange={(e) => setCustomQuotaInput(e.target.value)}
                    className="h-9 text-sm rounded-lg bg-slate-100/80 dark:bg-[#1e1e1e] border-slate-300 dark:border-neutral-700 text-slate-900 dark:text-neutral-100 font-mono"
                  />
                </div>
              )}
            </div>

            <DialogFooter className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-neutral-800">
              {editingLecturer?.hasCustomQuota || editingLecturer?.isExempt ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleResetToDefault}
                  disabled={updateLecturerQuota.isPending}
                  className="h-9 text-sm text-slate-600 dark:text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer mr-auto"
                >
                  <RotateCcw className="size-3.5 mr-1" />
                  <span>Khôi phục mặc định</span>
                </Button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingLecturer(null)}
                  className="h-9 text-sm cursor-pointer border-slate-300 dark:border-neutral-700 bg-white dark:bg-[#1e1e1e] hover:bg-slate-50 dark:hover:bg-neutral-800 text-slate-700 dark:text-neutral-200"
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={updateLecturerQuota.isPending}
                  className="h-9 text-sm bg-primary text-white hover:bg-primary/90 font-semibold cursor-pointer shadow-xs"
                >
                  {updateLecturerQuota.isPending && (
                    <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                  )}
                  Lưu thay đổi
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
