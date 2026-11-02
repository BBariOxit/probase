'use client';

import { useState } from 'react';
import {
  AlertCircle,
  Award,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Gavel,
  Loader2,
  Lock,
  MapPin,
  Plus,
  Trash2,
  Unlock,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  type CouncilDetailResponse,
  type CouncilMemberRole,
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface CouncilManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  councilId: number | null;
}

export function CouncilManagementDialog({
  open,
  onOpenChange,
  councilId,
}: CouncilManagementDialogProps) {
  const [activeTab, setActiveTab] = useState<'members' | 'topics'>('topics');

  const { data: council, isLoading, refetch } = useCouncilDetail(councilId);
  const { data: directory } = useLecturerDirectory({ limit: 100 });

  // Add member state
  const [selectedLecturerId, setSelectedLecturerId] = useState<number | ''>('');
  const [selectedRole, setSelectedRole] = useState<CouncilMemberRole>('MEMBER');

  // Schedule topic state
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<number | ''>('');
  const [timeSlot, setTimeSlot] = useState('');
  const [defenseOrder, setDefenseOrder] = useState('1');

  const addMemberMutation = useAddCouncilMember(councilId || 0);
  const removeMemberMutation = useRemoveCouncilMember(councilId || 0);
  const scheduleTopicMutation = useScheduleCouncilTopic(councilId || 0);
  const removeTopicMutation = useRemoveCouncilTopic(councilId || 0);
  const finalizeTopicMutation = useFinalizeCouncilTopic();

  const { data: eligibleGroups } = useEligibleGroupsForCouncil(
    council?.semester.id,
    council?.major?.id,
  );

  if (!councilId) return null;

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLecturerId) {
      toast.error('Vui lòng chọn giảng viên');
      return;
    }

    try {
      await addMemberMutation.mutateAsync({
        lecturerId: Number(selectedLecturerId),
        councilRole: selectedRole,
      });
      toast.success('Đã thêm thành viên vào hội đồng');
      setSelectedLecturerId('');
      refetch();
    } catch (err: any) {
      toast.error(err?.message || 'Không thể thêm thành viên');
    }
  };

  const handleRemoveMember = async (lecturerId: number) => {
    if (!confirm('Bạn có chắc muốn gỡ giảng viên này khỏi hội đồng?')) return;
    try {
      await removeMemberMutation.mutateAsync(lecturerId);
      toast.success('Đã gỡ thành viên khỏi hội đồng');
      refetch();
    } catch (err: any) {
      toast.error(err?.message || 'Không thể gỡ thành viên');
    }
  };

  const handleScheduleTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroupId) {
      toast.error('Vui lòng chọn nhóm đồ án');
      return;
    }

    try {
      await scheduleTopicMutation.mutateAsync({
        groupId: Number(selectedGroupId),
        timeSlot: timeSlot.trim() || null,
        defenseOrder: parseInt(defenseOrder) || 1,
      });
      toast.success('Đã xếp lịch nhóm vào hội đồng');
      setSelectedGroupId('');
      setTimeSlot('');
      setShowScheduleForm(false);
      refetch();
    } catch (err: any) {
      toast.error(err?.message || 'Không thể xếp lịch');
    }
  };

  const handleRemoveTopic = async (councilTopicId: number) => {
    if (!confirm('Bạn có chắc muốn gỡ nhóm này khỏi lịch bảo vệ của hội đồng?'))
      return;
    try {
      await removeTopicMutation.mutateAsync(councilTopicId);
      toast.success('Đã gỡ nhóm khỏi hội đồng');
      refetch();
    } catch (err: any) {
      toast.error(err?.message || 'Không thể gỡ nhóm');
    }
  };

  const handleToggleLock = async (topicItem: CouncilTopicItem) => {
    const nextLocked = !topicItem.isLocked;
    const msg = nextLocked
      ? 'Chốt sổ và khóa điểm bảo vệ của nhóm này?'
      : 'Mở khóa bảng điểm để giảng viên có thể sửa lại điểm?';
    if (!confirm(msg)) return;

    try {
      await finalizeTopicMutation.mutateAsync({
        councilTopicId: topicItem.id,
        data: { isLocked: nextLocked },
      });
      toast.success(
        nextLocked ? 'Đã khóa điểm bảo vệ' : 'Đã mở khóa điểm bảo vệ',
      );
      refetch();
    } catch (err: any) {
      toast.error(err?.message || 'Thao tác thất bại');
    }
  };

  const roleBadge = (role: CouncilMemberRole) => {
    switch (role) {
      case 'PRESIDENT':
        return <Badge className="bg-amber-600 hover:bg-amber-700">Chủ tịch</Badge>;
      case 'SECRETARY':
        return <Badge variant="secondary">Thư ký</Badge>;
      case 'MEMBER':
        return <Badge variant="outline">Ủy viên</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                   • Hội đồng Bảo vệ
                </span>
                {council?.major && (
                  <Badge variant="outline" className="text-xs">
                    {council.major.name}
                  </Badge>
                )}
                <Badge
                  variant={council?.status === 'COMPLETED' ? 'default' : 'secondary'}
                  className="text-xs"
                >
                  {council?.status === 'COMPLETED'
                    ? 'Đã hoàn thành'
                    : council?.status === 'IN_PROGRESS'
                      ? 'Đang diễn ra'
                      : 'Chuẩn bị'}
                </Badge>
              </div>
              <DialogTitle className="mt-1 text-xl font-bold">
                {council?.name}
              </DialogTitle>
              <div className="mt-1 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="size-3.5 text-primary" />
                  {council?.location || 'Chưa xếp phòng'}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Calendar className="size-3.5 text-primary" />
                  {council?.defenseDate
                    ? new Date(council.defenseDate).toLocaleString('vi-VN')
                    : ''}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="size-3.5 text-primary" />
                  {council?.semester.name}
                </span>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Tab switch */}
        <div className="flex items-center gap-2 border-b">
          <button
            type="button"
            className={`border-b-2 px-4 py-2 text-sm font-semibold transition-colors ${
              activeTab === 'topics'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setActiveTab('topics')}
          >
            Lịch Bảo vệ Nhóm ({council?.topics.length || 0})
          </button>
          <button
            type="button"
            className={`border-b-2 px-4 py-2 text-sm font-semibold transition-colors ${
              activeTab === 'members'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setActiveTab('members')}
          >
            Thành viên Hội đồng ({council?.members.length || 0})
          </button>
        </div>

        {isLoading ? (
          <div className="flex h-48 items-center justify-center">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
        ) : activeTab === 'members' ? (
          /* TAB 1: THÀNH VIÊN HỘI ĐỒNG */
          <div className="space-y-4 py-2">
            {/* Form thêm thành viên */}
            <form
              onSubmit={handleAddMember}
              className="flex flex-wrap items-end gap-3 rounded-lg border bg-muted/30 p-3"
            >
              <div className="flex-1 min-w-[200px] space-y-1">
                <Label htmlFor="member-lecturer" className="text-xs font-semibold">
                  Chọn Giảng viên
                </Label>
                <select
                  id="member-lecturer"
                  className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  value={selectedLecturerId}
                  onChange={(e) =>
                    setSelectedLecturerId(
                      e.target.value ? Number(e.target.value) : '',
                    )
                  }
                  required
                >
                  <option value="">-- Chọn giảng viên từ danh sách --</option>
                  {directory?.items.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.academicTitle ? `${l.academicTitle} ` : ''}
                      {l.fullName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="w-40 space-y-1">
                <Label htmlFor="member-role" className="text-xs font-semibold">
                  Vai trò
                </Label>
                <select
                  id="member-role"
                  className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  value={selectedRole}
                  onChange={(e) =>
                    setSelectedRole(e.target.value as CouncilMemberRole)
                  }
                >
                  <option value="PRESIDENT">Chủ tịch</option>
                  <option value="SECRETARY">Thư ký</option>
                  <option value="MEMBER">Ủy viên</option>
                </select>
              </div>

              <Button
                type="submit"
                size="sm"
                disabled={addMemberMutation.isPending}
                className="gap-1.5"
              >
                {addMemberMutation.isPending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <UserPlus className="size-3.5" />
                )}
                Thêm vào HĐ
              </Button>
            </form>

            {/* Danh sách thành viên hiện tại */}
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 text-xs font-semibold uppercase text-muted-foreground border-b">
                  <tr>
                    <th className="px-4 py-3">Giảng viên</th>
                    <th className="px-4 py-3">Mã GV</th>
                    <th className="px-4 py-3">Vai trò trong HĐ</th>
                    <th className="px-4 py-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-xs">
                  {council?.members.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-muted-foreground">
                        Chưa có thành viên nào trong hội đồng. Vui lòng thêm từ form trên.
                      </td>
                    </tr>
                  ) : (
                    council?.members.map((m) => (
                      <tr key={m.id} className="hover:bg-muted/20">
                        <td className="px-4 py-3 font-semibold text-foreground">
                          {m.lecturer.academicTitle
                            ? `${m.lecturer.academicTitle} `
                            : ''}
                          {m.lecturer.fullName}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {m.lecturer.lecturerCode || '—'}
                        </td>
                        <td className="px-4 py-3">{roleBadge(m.councilRole)}</td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:bg-destructive/10"
                            onClick={() => handleRemoveMember(m.lecturerId)}
                            disabled={removeMemberMutation.isPending}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* TAB 2: LỊCH BẢO VỆ CÁC NHÓM */
          <div className="space-y-4 py-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Tổng cộng {council?.topics.length || 0} đề tài được xếp lịch bảo vệ trong hội đồng này.
              </span>
              <Button
                size="sm"
                variant={showScheduleForm ? 'outline' : 'default'}
                className="gap-1.5 text-xs"
                onClick={() => setShowScheduleForm(!showScheduleForm)}
              >
                <Plus className="size-3.5" />
                {showScheduleForm ? 'Đóng xếp lịch' : 'Xếp thêm Nhóm'}
              </Button>
            </div>

            {/* Form xếp thêm nhóm */}
            {showScheduleForm && (
              <form
                onSubmit={handleScheduleTopic}
                className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-3"
              >
                <div className="font-semibold text-xs text-primary flex items-center gap-1.5">
                  <UserCheck className="size-4" />
                  Xếp nhóm sinh viên ĐỦ ĐIỀU KIỆN vào Hội đồng
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-2 space-y-1">
                    <Label htmlFor="sched-group" className="text-xs font-semibold">
                      Chọn Nhóm đồ án đủ điều kiện
                    </Label>
                    <select
                      id="sched-group"
                      className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                      value={selectedGroupId}
                      onChange={(e) =>
                        setSelectedGroupId(
                          e.target.value ? Number(e.target.value) : '',
                        )
                      }
                      required
                    >
                      <option value="">
                        -- Chọn nhóm (Chỉ hiện các nhóm đã đạt thẩm định M02/M04/M05) --
                      </option>
                      {eligibleGroups?.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.topic.title} (Trưởng nhóm: {g.members[0]?.fullName || 'Chưa rõ'})
                        </option>
                      ))}
                    </select>
                    {eligibleGroups?.length === 0 && (
                      <p className="text-[11px] text-amber-600 mt-1">
                        Hiện không có nhóm nào đủ điều kiện chờ xếp lịch trong học kỳ/bộ môn này.
                      </p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="sched-slot" className="text-xs font-semibold">
                      Ca giờ (Time Slot)
                    </Label>
                    <Input
                      id="sched-slot"
                      placeholder="VD: 08:00 - 08:45"
                      value={timeSlot}
                      onChange={(e) => setTimeSlot(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowScheduleForm(false)}
                  >
                    Hủy
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
                    Xếp vào Hội đồng
                  </Button>
                </div>
              </form>
            )}

            {/* Bảng danh sách các nhóm trong hội đồng */}
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 text-xs font-semibold uppercase text-muted-foreground border-b">
                  <tr>
                    <th className="px-3 py-3 text-center w-12">Thứ tự</th>
                    <th className="px-3 py-3 w-32">Ca giờ</th>
                    <th className="px-4 py-3">Đề tài & Thành viên</th>
                    <th className="px-3 py-3 text-center">Tiến độ chấm</th>
                    <th className="px-3 py-3 text-center">TB Hội đồng (50%)</th>
                    <th className="px-3 py-3 text-center">Điểm Tổng kết</th>
                    <th className="px-3 py-3 text-right">Khóa sổ / Gỡ</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-xs">
                  {council?.topics.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-muted-foreground">
                        Chưa có nhóm nào được xếp vào hội đồng này. Bấm &quot;Xếp thêm Nhóm&quot; để xếp lịch.
                      </td>
                    </tr>
                  ) : (
                    council?.topics.map((t, idx) => {
                      const evaluated = t.evaluationSummary?.evaluatedCount || 0;
                      const totalMem = t.evaluationSummary?.totalMembers || council.members.length;
                      const avgScore = t.evaluationSummary?.avgScore;
                      const grades = t.group.studentGrades?.[0];

                      return (
                        <tr
                          key={t.id}
                          className={`hover:bg-muted/20 ${t.isLocked ? 'bg-muted/10' : ''}`}
                        >
                          <td className="px-3 py-3 text-center font-bold text-muted-foreground">
                            {idx + 1}
                          </td>
                          <td className="px-3 py-3 font-medium text-foreground">
                            {t.timeSlot || 'Chưa định ca'}
                          </td>
                          <td className="px-4 py-3 space-y-1">
                            <div className="font-semibold text-foreground leading-snug">
                              {t.topic.title}
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                              <span>
                                GVHD:{' '}
                                <strong>{t.topic.lecturer.fullName}</strong>
                              </span>
                              <span>•</span>
                              <span>
                                GVPB:{' '}
                                <strong>{t.reviewer?.fullName || 'Chưa gán'}</strong>
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1 pt-0.5">
                              {t.group.members.map((m) => (
                                <span
                                  key={m.id}
                                  className="rounded bg-background px-1.5 py-0.5 border text-[10px]"
                                >
                                  {m.fullName} ({m.studentCode})
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-3 py-3 text-center">
                            <Badge
                              variant={
                                evaluated >= totalMem && totalMem > 0
                                  ? 'default'
                                  : 'outline'
                              }
                              className="text-[11px]"
                            >
                              {evaluated} / {totalMem} GV
                            </Badge>
                          </td>
                          <td className="px-3 py-3 text-center font-bold text-primary text-sm">
                            {avgScore !== null && avgScore !== undefined
                              ? `${avgScore}`
                              : '—'}
                          </td>
                          <td className="px-3 py-3 text-center">
                            {grades?.finalGradeNum !== null &&
                            grades?.finalGradeNum !== undefined ? (
                              <div className="inline-flex flex-col items-center">
                                <span className="font-bold text-foreground">
                                  {grades.finalGradeNum}
                                </span>
                                <Badge variant="secondary" className="text-[10px] px-1 py-0">
                                  {grades.finalGradeLetter}
                                </Badge>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="px-3 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                size="sm"
                                variant={t.isLocked ? 'secondary' : 'outline'}
                                className={`text-[11px] gap-1 h-7 ${
                                  t.isLocked
                                    ? 'text-muted-foreground'
                                    : 'text-primary font-semibold'
                                }`}
                                onClick={() => handleToggleLock(t)}
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
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                                  onClick={() => handleRemoveTopic(t.id)}
                                  disabled={removeTopicMutation.isPending}
                                >
                                  <Trash2 className="size-3.5" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
