'use client';

import { useMemo, useState } from 'react';
import {
  Calendar,
  Loader2,
  Lock,
  MapPin,
  Pencil,
  Plus,
  Trash2,
  Unlock,
  UserPlus,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  type CouncilListItem,
  type CouncilMemberItem,
  type CouncilMemberRole,
  type CouncilStatus,
  type CouncilTopicItem,
  useAddCouncilMember,
  useCouncilDetail,
  useEligibleGroupsForCouncil,
  useFinalizeCouncilTopic,
  useRemoveCouncilMember,
  useRemoveCouncilTopic,
  useScheduleCouncilTopic,
} from '@/lib/api/councils';
import { useLecturerDirectory } from '@/lib/api/lecturers';
import { sanitizeLecturerName } from '@/lib/utils';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { StatusPill, type StatusLabel } from '@/components/shared/status-pill';
import { Button } from '@/components/ui/button';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

const MEMBER_ROLE_OPTIONS: Array<{ value: CouncilMemberRole; label: string }> =
  [
    { value: 'PRESIDENT', label: 'Chủ tịch' },
    { value: 'SECRETARY', label: 'Thư ký' },
    { value: 'MEMBER', label: 'Ủy viên' },
  ];

function getCouncilStatusLabel(status?: CouncilStatus): StatusLabel {
  switch (status) {
    case 'COMPLETED':
      return { label: 'Đã hoàn thành', tone: 'success' };
    case 'IN_PROGRESS':
      return { label: 'Đang diễn ra', tone: 'active' };
    default:
      return { label: 'Chuẩn bị', tone: 'waiting' };
  }
}

function getMemberRoleLabel(role: CouncilMemberRole): StatusLabel {
  switch (role) {
    case 'PRESIDENT':
      return { label: 'Chủ tịch', tone: 'waiting' };
    case 'SECRETARY':
      return { label: 'Thư ký', tone: 'active' };
    default:
      return { label: 'Ủy viên', tone: 'idle' };
  }
}

interface CouncilManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  councilId: number | null;
  onEditCouncil?: (council: CouncilListItem) => void;
}

export function CouncilManagementDialog({
  open,
  onOpenChange,
  councilId,
  onEditCouncil,
}: CouncilManagementDialogProps) {
  const [activeTab, setActiveTab] = useState<'topics' | 'members'>('topics');

  const { data: council, isLoading, refetch } = useCouncilDetail(councilId);
  const { data: directory } = useLecturerDirectory({ limit: 100 });

  // Member add state
  const [selectedLecturerId, setSelectedLecturerId] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<CouncilMemberRole>('MEMBER');

  // Schedule topic state
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [timeSlot, setTimeSlot] = useState('');
  const [defenseOrder, setDefenseOrder] = useState<string>('');

  // Confirmations & Finalize dialog state
  const [memberToRemove, setMemberToRemove] =
    useState<CouncilMemberItem | null>(null);
  const [topicToRemove, setTopicToRemove] = useState<CouncilTopicItem | null>(
    null,
  );
  const [finalizeTarget, setFinalizeTarget] = useState<CouncilTopicItem | null>(
    null,
  );
  const [minuteNotesInput, setMinuteNotesInput] = useState('');

  const addMemberMutation = useAddCouncilMember(councilId || 0);
  const removeMemberMutation = useRemoveCouncilMember(councilId || 0);
  const scheduleTopicMutation = useScheduleCouncilTopic(councilId || 0);
  const removeTopicMutation = useRemoveCouncilTopic(councilId || 0);
  const finalizeTopicMutation = useFinalizeCouncilTopic();

  const { data: eligibleGroups } = useEligibleGroupsForCouncil(
    council?.semester.id,
    council?.major?.id,
  );

  const existingMemberIds = useMemo(
    () => new Set(council?.members.map((m) => m.lecturerId) ?? []),
    [council?.members],
  );

  const lecturerOptions: ComboboxOption[] = useMemo(() => {
    return (directory?.items ?? [])
      .filter((l) => !existingMemberIds.has(l.id))
      .map((l) => ({
        value: String(l.id),
        label: sanitizeLecturerName(l.fullName, l.academicTitle).displayName,
        subLabel: l.researchInterests ?? undefined,
      }));
  }, [directory?.items, existingMemberIds]);

  const eligibleGroupOptions: ComboboxOption[] = useMemo(() => {
    return (eligibleGroups ?? []).map((g) => {
      const sup = g.topic.lecturer
        ? sanitizeLecturerName(
            g.topic.lecturer.fullName,
            g.topic.lecturer.academicTitle,
          ).displayName
        : '';
      const memberList = g.members.map((m) => m.fullName).join(', ');
      return {
        value: String(g.id),
        label: g.topic.title,
        subLabel: [memberList, sup ? `GVHD: ${sup}` : '']
          .filter(Boolean)
          .join(' · '),
      };
    });
  }, [eligibleGroups]);

  if (!councilId) return null;

  const nextDefaultOrder =
    (council?.topics.reduce((max, t) => Math.max(max, t.defenseOrder), 0) ??
      0) + 1;

  const statusPill = getCouncilStatusLabel(council?.status);

  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedLecturerId) {
      toast.error('Vui lòng chọn giảng viên.');
      return;
    }

    try {
      await addMemberMutation.mutateAsync({
        lecturerId: Number(selectedLecturerId),
        councilRole: selectedRole,
      });
      toast.success('Đã thêm thành viên vào hội đồng.');
      setSelectedLecturerId('');
      refetch();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Không thêm được thành viên.',
      );
    }
  }

  async function handleScheduleTopic(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedGroupId) {
      toast.error('Vui lòng chọn nhóm đồ án đủ điều kiện.');
      return;
    }

    const parsedOrder = parseInt(defenseOrder, 10);
    try {
      await scheduleTopicMutation.mutateAsync({
        groupId: Number(selectedGroupId),
        timeSlot: timeSlot.trim() || null,
        defenseOrder:
          !isNaN(parsedOrder) && parsedOrder >= 1
            ? parsedOrder
            : nextDefaultOrder,
      });
      toast.success('Đã xếp lịch nhóm vào hội đồng.');
      setSelectedGroupId('');
      setTimeSlot('');
      setDefenseOrder('');
      setShowScheduleForm(false);
      refetch();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Không thể xếp lịch nhóm.',
      );
    }
  }

  function openFinalizeDialog(topicItem: CouncilTopicItem) {
    setFinalizeTarget(topicItem);
    setMinuteNotesInput(topicItem.minuteNotes ?? '');
  }

  async function handleConfirmFinalize() {
    if (!finalizeTarget) return;
    const nextLocked = !finalizeTarget.isLocked;
    try {
      await finalizeTopicMutation.mutateAsync({
        councilTopicId: finalizeTarget.id,
        data: {
          isLocked: nextLocked,
          ...(nextLocked
            ? { minuteNotes: minuteNotesInput.trim() || null }
            : {}),
        },
      });
      toast.success(
        nextLocked ? 'Đã chốt sổ và khóa điểm bảo vệ.' : 'Đã mở khóa điểm.',
      );
      setFinalizeTarget(null);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Thao tác thất bại.');
    }
  }

  function triggerEditCouncil() {
    if (!council || !onEditCouncil) return;
    const summaryItem: CouncilListItem = {
      id: council.id,
      name: council.name,
      location: council.location,
      defenseDate: council.defenseDate,
      status: council.status,
      semester: council.semester,
      major: council.major,
      members: council.members,
      stats: {
        totalTopics: council.topics.length,
        completedTopics: council.topics.filter((t) => t.isLocked).length,
      },
    };
    onEditCouncil(summaryItem);
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto sm:max-w-4xl">
          <DialogHeader className="border-b pb-3">
            <div className="flex flex-wrap items-center justify-between gap-2 pr-8">
              <div className="flex flex-wrap items-center gap-2">
                <StatusPill
                  variant="tag"
                  label={statusPill.label}
                  tone={statusPill.tone}
                />
                <span className="text-xs font-medium text-muted-foreground">
                  {council?.major?.name ?? 'Toàn khoa'}
                </span>
                {council?.semester.name && (
                  <span className="text-xs text-muted-foreground">
                    · {council.semester.name}
                  </span>
                )}
              </div>

              {council && onEditCouncil && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7.5 text-xs gap-1 cursor-pointer"
                  onClick={triggerEditCouncil}
                >
                  <Pencil className="size-3.5" />
                  Sửa thông tin
                </Button>
              )}
            </div>

            <DialogTitle className="mt-1.5 text-lg font-semibold">
              {council?.name ?? 'Chi tiết hội đồng'}
            </DialogTitle>
            <DialogDescription className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3.5" />
                {council?.location || 'Chưa định phòng'}
              </span>
              {council?.defenseDate && (
                <span className="inline-flex items-center gap-1">
                  <Calendar className="size-3.5" />
                  {new Date(council.defenseDate).toLocaleString('vi-VN', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Tabs
              value={activeTab}
              onValueChange={(val) => setActiveTab(val as 'topics' | 'members')}
            >
              <TabsList className="w-full sm:w-auto">
                <TabsTrigger value="topics">
                  Lịch bảo vệ ({council?.topics.length ?? 0})
                </TabsTrigger>
                <TabsTrigger value="members">
                  Thành viên ({council?.members.length ?? 0})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="topics" className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">
                    {council?.topics.length ?? 0} nhóm đã xếp lịch trong hội
                    đồng
                  </span>
                  <Button
                    size="sm"
                    variant={showScheduleForm ? 'outline' : 'default'}
                    className="gap-1.5 cursor-pointer"
                    onClick={() => {
                      const nextOpen = !showScheduleForm;
                      setShowScheduleForm(nextOpen);
                      if (nextOpen && !defenseOrder) {
                        setDefenseOrder(String(nextDefaultOrder));
                      }
                    }}
                  >
                    <Plus className="size-3.5" />
                    {showScheduleForm ? 'Đóng form xếp lịch' : 'Xếp thêm nhóm'}
                  </Button>
                </div>

                {showScheduleForm && (
                  <form
                    onSubmit={handleScheduleTopic}
                    className="rounded-xl border border-slate-200 dark:border-neutral-700 bg-slate-50/70 dark:bg-neutral-900/40 p-3.5 space-y-3"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                      <div className="md:col-span-7 space-y-1.5">
                        <Label className="text-xs font-medium">
                          Nhóm đủ điều kiện bảo vệ
                        </Label>
                        <Combobox
                          options={eligibleGroupOptions}
                          value={selectedGroupId}
                          onChange={setSelectedGroupId}
                          placeholder="Chọn nhóm đồ án…"
                          searchPlaceholder="Tìm đề tài, sinh viên, GVHD…"
                          emptyText="Không có nhóm đủ điều kiện chưa xếp lịch"
                        />
                      </div>

                      <div className="md:col-span-2 space-y-1.5">
                        <Label
                          htmlFor="sched-order"
                          className="text-xs font-medium"
                        >
                          Thứ tự
                        </Label>
                        <Input
                          id="sched-order"
                          type="number"
                          min={1}
                          value={defenseOrder}
                          onChange={(e) => setDefenseOrder(e.target.value)}
                          placeholder={String(nextDefaultOrder)}
                        />
                      </div>

                      <div className="md:col-span-3 space-y-1.5">
                        <Label
                          htmlFor="sched-slot"
                          className="text-xs font-medium"
                        >
                          Ca giờ
                        </Label>
                        <Input
                          id="sched-slot"
                          placeholder="VD: 08:00 - 08:45"
                          value={timeSlot}
                          onChange={(e) => setTimeSlot(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowScheduleForm(false)}
                      >
                        Huỷ
                      </Button>
                      <Button
                        type="submit"
                        size="sm"
                        disabled={
                          scheduleTopicMutation.isPending || !selectedGroupId
                        }
                      >
                        {scheduleTopicMutation.isPending && (
                          <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                        )}
                        Xếp vào hội đồng
                      </Button>
                    </div>
                  </form>
                )}

                <div className="isolate w-full min-w-0 overflow-hidden rounded-xl border border-slate-300 dark:border-neutral-700 bg-white dark:bg-[#1e1e1e] shadow-2xs">
                  <Table
                    containerClassName="w-full overflow-x-auto"
                    className="w-full min-w-[720px] table-fixed text-left text-xs"
                  >
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12 px-3 text-center">
                          STT
                        </TableHead>
                        <TableHead className="w-[105px] px-3">Ca giờ</TableHead>
                        <TableHead className="min-w-[230px] px-3">
                          Đề tài &amp; Thành viên
                        </TableHead>
                        <TableHead className="w-[95px] px-3 text-center">
                          Đã chấm
                        </TableHead>
                        <TableHead className="w-[85px] px-3 text-center">
                          TB HĐ
                        </TableHead>
                        <TableHead className="w-[85px] px-3 text-center">
                          Tổng kết
                        </TableHead>
                        <TableHead className="w-[130px] px-3 text-right">
                          Thao tác
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {!council || council.topics.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={7}
                            className="py-8 text-center text-muted-foreground"
                          >
                            Chưa có nhóm nào được xếp vào hội đồng này.
                          </TableCell>
                        </TableRow>
                      ) : (
                        council.topics.map((t) => {
                          const evaluated =
                            t.evaluationSummary?.evaluatedCount ?? 0;
                          const totalMem =
                            t.evaluationSummary?.totalMembers ??
                            council.members.length;
                          const avgScore = t.evaluationSummary?.avgScore;
                          const grades = t.group.studentGrades?.[0];
                          const sup = sanitizeLecturerName(
                            t.topic.lecturer.fullName,
                            t.topic.lecturer.academicTitle,
                          ).displayName;
                          const rev = t.reviewer
                            ? sanitizeLecturerName(
                                t.reviewer.fullName,
                                t.reviewer.academicTitle,
                              ).displayName
                            : 'Chưa gán';

                          return (
                            <TableRow key={t.id}>
                              <TableCell className="align-top px-3 py-3 text-center font-semibold tabular-nums text-muted-foreground">
                                {t.defenseOrder}
                              </TableCell>
                              <TableCell className="align-top px-3 py-3 font-medium">
                                {t.timeSlot || '—'}
                              </TableCell>
                              <TableCell className="align-top px-3 py-3 whitespace-normal space-y-1">
                                <p className="font-semibold text-foreground leading-snug">
                                  {t.topic.title}
                                </p>
                                <p className="text-[11px] text-muted-foreground">
                                  HD: {sup} · PB: {rev}
                                </p>
                                <p className="text-[11px] text-slate-600 dark:text-neutral-400">
                                  {t.group.members
                                    .map(
                                      (m) => `${m.fullName} (${m.studentCode})`,
                                    )
                                    .join(', ')}
                                </p>
                                {t.minuteNotes && (
                                  <p className="text-[11px] italic text-muted-foreground border-l-2 border-slate-300 dark:border-neutral-600 pl-2">
                                    Biên bản: {t.minuteNotes}
                                  </p>
                                )}
                              </TableCell>
                              <TableCell className="align-top px-3 py-3 text-center tabular-nums">
                                <StatusPill
                                  variant="tag"
                                  label={`${evaluated}/${totalMem}`}
                                  tone={
                                    evaluated >= totalMem && totalMem > 0
                                      ? 'success'
                                      : 'idle'
                                  }
                                />
                              </TableCell>
                              <TableCell className="align-top px-3 py-3 text-center font-semibold tabular-nums">
                                {avgScore !== null && avgScore !== undefined
                                  ? avgScore
                                  : '—'}
                              </TableCell>
                              <TableCell className="align-top px-3 py-3 text-center tabular-nums">
                                {grades?.finalGradeNum !== null &&
                                grades?.finalGradeNum !== undefined ? (
                                  <span className="font-semibold">
                                    {grades.finalGradeNum}
                                    {grades.finalGradeLetter
                                      ? ` (${grades.finalGradeLetter})`
                                      : ''}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">
                                    —
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="align-top px-3 py-3 text-right">
                                <div className="inline-flex items-center justify-end gap-1">
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant={
                                      t.isLocked ? 'secondary' : 'outline'
                                    }
                                    className="h-7 px-2 text-[11px] gap-1 cursor-pointer"
                                    onClick={() => openFinalizeDialog(t)}
                                    disabled={finalizeTopicMutation.isPending}
                                  >
                                    {t.isLocked ? (
                                      <>
                                        <Lock className="size-3" />
                                        Đã khóa
                                      </>
                                    ) : (
                                      <>
                                        <Unlock className="size-3" />
                                        Chốt điểm
                                      </>
                                    )}
                                  </Button>

                                  {!t.isLocked && (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon-xs"
                                      className="size-7 text-muted-foreground hover:text-destructive cursor-pointer"
                                      onClick={() => setTopicToRemove(t)}
                                      disabled={removeTopicMutation.isPending}
                                      aria-label="Gỡ nhóm khỏi hội đồng"
                                    >
                                      <Trash2 className="size-3.5" />
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              <TabsContent value="members" className="space-y-4">
                <form
                  onSubmit={handleAddMember}
                  className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 dark:border-neutral-700 bg-slate-50/70 dark:bg-neutral-900/40 p-3.5"
                >
                  <div className="flex-1 min-w-[220px] space-y-1.5">
                    <Label className="text-xs font-medium">
                      Chọn giảng viên
                    </Label>
                    <Combobox
                      options={lecturerOptions}
                      value={selectedLecturerId}
                      onChange={setSelectedLecturerId}
                      placeholder="Chọn giảng viên…"
                      searchPlaceholder="Tìm tên giảng viên…"
                      emptyText="Không còn giảng viên khả dụng"
                    />
                  </div>

                  <div className="w-40 space-y-1.5">
                    <Label className="text-xs font-medium">Vai trò</Label>
                    <Select
                      value={selectedRole}
                      onValueChange={(val) =>
                        setSelectedRole((val ?? 'MEMBER') as CouncilMemberRole)
                      }
                    >
                      <SelectTrigger
                        className="w-full"
                        aria-label="Chọn vai trò"
                      >
                        <SelectValue>
                          {(val) =>
                            MEMBER_ROLE_OPTIONS.find((opt) => opt.value === val)
                              ?.label ?? 'Ủy viên'
                          }
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {MEMBER_ROLE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    type="submit"
                    size="sm"
                    disabled={
                      addMemberMutation.isPending || !selectedLecturerId
                    }
                    className="gap-1.5 cursor-pointer"
                  >
                    {addMemberMutation.isPending ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <UserPlus className="size-3.5" />
                    )}
                    Thêm thành viên
                  </Button>
                </form>

                <div className="isolate w-full min-w-0 overflow-hidden rounded-xl border border-slate-300 dark:border-neutral-700 bg-white dark:bg-[#1e1e1e] shadow-2xs">
                  <Table className="w-full text-left text-xs">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="px-4">Giảng viên</TableHead>
                        <TableHead className="w-28 px-3">Mã GV</TableHead>
                        <TableHead className="w-32 px-3">Vai trò</TableHead>
                        <TableHead className="w-20 px-4 text-right">
                          Thao tác
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {!council || council.members.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={4}
                            className="py-8 text-center text-muted-foreground"
                          >
                            Chưa có thành viên nào trong hội đồng.
                          </TableCell>
                        </TableRow>
                      ) : (
                        council.members.map((m) => {
                          const name = sanitizeLecturerName(
                            m.lecturer.fullName,
                            m.lecturer.academicTitle,
                          );
                          const rolePill = getMemberRoleLabel(m.councilRole);

                          return (
                            <TableRow key={m.id}>
                              <TableCell className="px-4 py-3 font-medium">
                                <p>{name.displayName}</p>
                                {name.departmentRole && (
                                  <p className="text-[11px] text-muted-foreground">
                                    {name.departmentRole}
                                  </p>
                                )}
                              </TableCell>
                              <TableCell className="px-3 py-3 font-mono text-muted-foreground">
                                {m.lecturer.lecturerCode || '—'}
                              </TableCell>
                              <TableCell className="px-3 py-3">
                                <StatusPill
                                  variant="tag"
                                  label={rolePill.label}
                                  tone={rolePill.tone}
                                />
                              </TableCell>
                              <TableCell className="px-4 py-3 text-right">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-xs"
                                  className="size-7 text-muted-foreground hover:text-destructive cursor-pointer"
                                  onClick={() => setMemberToRemove(m)}
                                  disabled={removeMemberMutation.isPending}
                                  aria-label="Gỡ thành viên khỏi hội đồng"
                                >
                                  <Trash2 className="size-3.5" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={memberToRemove !== null}
        onOpenChange={(next) => {
          if (!next) setMemberToRemove(null);
        }}
        title="Gỡ thành viên khỏi hội đồng"
        description={
          memberToRemove
            ? `Gỡ ${
                sanitizeLecturerName(
                  memberToRemove.lecturer.fullName,
                  memberToRemove.lecturer.academicTitle,
                ).displayName
              } khỏi hội đồng?`
            : ''
        }
        confirmLabel="Gỡ thành viên"
        onConfirm={async () => {
          if (!memberToRemove) return;
          await removeMemberMutation.mutateAsync(memberToRemove.lecturerId);
          toast.success('Đã gỡ thành viên khỏi hội đồng.');
          refetch();
        }}
      />

      <ConfirmDialog
        open={topicToRemove !== null}
        onOpenChange={(next) => {
          if (!next) setTopicToRemove(null);
        }}
        title="Gỡ nhóm khỏi lịch bảo vệ"
        description={
          topicToRemove
            ? `Gỡ đề tài "${topicToRemove.topic.title}" khỏi lịch bảo vệ của hội đồng?`
            : ''
        }
        confirmLabel="Gỡ khỏi lịch"
        onConfirm={async () => {
          if (!topicToRemove) return;
          await removeTopicMutation.mutateAsync(topicToRemove.id);
          toast.success('Đã gỡ nhóm khỏi hội đồng.');
          refetch();
        }}
      />

      {/* Finalize / Unlock dialog with optional minuteNotes */}
      <Dialog
        open={finalizeTarget !== null}
        onOpenChange={(next) => {
          if (!next && !finalizeTopicMutation.isPending) {
            setFinalizeTarget(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {finalizeTarget?.isLocked
                ? 'Mở khóa điểm bảo vệ'
                : 'Chốt sổ & khóa điểm bảo vệ'}
            </DialogTitle>
            <DialogDescription>
              {finalizeTarget?.isLocked
                ? 'Mở khóa để thành viên hội đồng có thể cập nhật lại điểm của đề tài này.'
                : 'Sau khi khóa, giảng viên hội đồng không thể sửa điểm và kết quả sẽ gửi tới sinh viên.'}
            </DialogDescription>
          </DialogHeader>

          {finalizeTarget && !finalizeTarget.isLocked && (
            <div className="space-y-1.5 py-1">
              <Label htmlFor="minute-notes" className="text-xs font-medium">
                Ghi chú biên bản hội đồng (tuỳ chọn)
              </Label>
              <Textarea
                id="minute-notes"
                rows={3}
                value={minuteNotesInput}
                onChange={(e) => setMinuteNotesInput(e.target.value)}
                placeholder="Nhập nhận xét kết luận hoặc yêu cầu chỉnh sửa sau bảo vệ..."
              />
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={finalizeTopicMutation.isPending}
              onClick={() => setFinalizeTarget(null)}
            >
              Huỷ
            </Button>
            <Button
              type="button"
              disabled={finalizeTopicMutation.isPending}
              onClick={handleConfirmFinalize}
            >
              {finalizeTopicMutation.isPending && (
                <Loader2 className="mr-1.5 size-4 animate-spin" />
              )}
              {finalizeTarget?.isLocked ? 'Mở khóa' : 'Xác nhận chốt điểm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
