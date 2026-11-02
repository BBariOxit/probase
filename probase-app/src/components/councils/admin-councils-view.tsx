'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Gavel,
  Layers,
  Loader2,
  MapPin,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  type CouncilListItem,
  type CouncilStatus,
  useCouncils,
  useDeleteCouncil,
} from '@/lib/api/councils';
import { useMajors } from '@/lib/api/majors';
import { useSemesters } from '@/lib/api/master-data';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CouncilCreateDialog } from './council-create-dialog';
import { CouncilManagementDialog } from './council-management-dialog';

export function AdminCouncilsView() {
  const { data: semesters } = useSemesters();
  const { data: majors } = useMajors();

  const activeSemester = useMemo(
    () => semesters?.find((s) => s.isActive) || semesters?.[0],
    [semesters],
  );

  const [semesterId, setSemesterId] = useState<number | undefined>(
    activeSemester?.id,
  );
  const [majorId, setMajorId] = useState<number | undefined>(undefined);
  const [status, setStatus] = useState<'ALL' | CouncilStatus>('ALL');
  const [search, setSearch] = useState('');

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [managingCouncilId, setManagingCouncilId] = useState<number | null>(null);

  const currentSemesterId = semesterId || activeSemester?.id;

  const { data: councils, isLoading, refetch } = useCouncils({
    semesterId: currentSemesterId,
    majorId,
    status,
    search: search.trim() || undefined,
  });

  const deleteMutation = useDeleteCouncil();

  const handleDeleteCouncil = async (c: CouncilListItem) => {
    if (c.stats.totalTopics > 0) {
      toast.error('Không thể xóa Hội đồng đã có nhóm sinh viên được xếp lịch');
      return;
    }
    if (!confirm(`Bạn có chắc muốn xóa hội đồng "${c.name}"?`)) return;

    try {
      await deleteMutation.mutateAsync(c.id);
      toast.success('Đã xóa hội đồng thành công');
      refetch();
    } catch (err: any) {
      toast.error(err?.message || 'Không thể xóa hội đồng');
    }
  };

  // Stats calculation
  const totalCouncils = councils?.length || 0;
  const totalScheduled =
    councils?.reduce((sum, c) => sum + c.stats.totalTopics, 0) || 0;
  const totalCompleted =
    councils?.reduce((sum, c) => sum + c.stats.completedTopics, 0) || 0;

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
              BR-18 • Đánh giá cuối kỳ
            </span>
          </div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">
            Hội đồng Bảo vệ & Điểm cuối kỳ
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Thành lập Hội đồng, xếp lịch bảo vệ Khóa luận tốt nghiệp và tổng hợp điểm 50% theo quy chế Khoa CNTT - DLU.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            className="gap-1.5 text-xs"
            render={<Link href="/admin/defense-eligibility" />}
          >
            <ShieldCheck className="size-3.5 text-primary" />
            Thẩm định điều kiện
          </Button>

          <Button
            className="gap-1.5 text-xs font-semibold"
            onClick={() => setCreateDialogOpen(true)}
          >
            <Plus className="size-3.5" />
            Tạo Hội đồng mới
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <Gavel className="size-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Tổng số Hội đồng
              </p>
              <p className="text-2xl font-bold">{totalCouncils}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-500/10 p-2 text-blue-600 dark:text-blue-400">
              <Users className="size-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Nhóm đã xếp lịch
              </p>
              <p className="text-2xl font-bold">{totalScheduled}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Đã chốt điểm bảo vệ
              </p>
              <p className="text-2xl font-bold">{totalCompleted}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-card p-3 shadow-sm">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Tìm theo tên hội đồng, phòng bảo vệ..."
            className="pl-8 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className="rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          value={currentSemesterId ?? ''}
          onChange={(e) => setSemesterId(Number(e.target.value))}
        >
          {semesters?.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} {s.isActive ? '(Hiện tại)' : ''}
            </option>
          ))}
        </select>

        <select
          className="rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          value={majorId ?? ''}
          onChange={(e) =>
            setMajorId(e.target.value ? Number(e.target.value) : undefined)
          }
        >
          <option value="">Tất cả chuyên ngành</option>
          {majors?.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} ({m.code})
            </option>
          ))}
        </select>

        <select
          className="rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          value={status}
          onChange={(e) => setStatus(e.target.value as any)}
        >
          <option value="ALL">Tất cả trạng thái</option>
          <option value="PREP">Chuẩn bị</option>
          <option value="IN_PROGRESS">Đang diễn ra</option>
          <option value="COMPLETED">Đã hoàn thành</option>
        </select>
      </div>

      {/* Councils List */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      ) : councils?.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center">
          <Gavel className="mx-auto size-10 text-muted-foreground/50" />
          <h3 className="mt-4 font-semibold text-foreground">
            Chưa có Hội đồng bảo vệ nào
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Bấm nút &quot;Tạo Hội đồng mới&quot; phía trên để thành lập hội đồng chấm bảo vệ Khóa luận tốt nghiệp.
          </p>
          <Button
            size="sm"
            className="mt-4 gap-1.5"
            onClick={() => setCreateDialogOpen(true)}
          >
            <Plus className="size-3.5" />
            Tạo Hội đồng đầu tiên
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {councils?.map((c) => {
            const president = c.members.find((m) => m.councilRole === 'PRESIDENT');
            const secretary = c.members.find((m) => m.councilRole === 'SECRETARY');
            const otherMembers = c.members.filter(
              (m) => m.councilRole === 'MEMBER',
            );

            return (
              <div
                key={c.id}
                className="flex flex-col justify-between rounded-xl border bg-card p-4 shadow-sm hover:border-primary/40 transition-all space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        {c.major ? (
                          <Badge variant="outline" className="text-[11px]">
                            {c.major.name}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[11px]">
                            Toàn khoa
                          </Badge>
                        )}
                        <Badge
                          variant={
                            c.status === 'COMPLETED'
                              ? 'default'
                              : c.status === 'IN_PROGRESS'
                                ? 'secondary'
                                : 'outline'
                          }
                          className="text-[11px]"
                        >
                          {c.status === 'COMPLETED'
                            ? 'Đã hoàn thành'
                            : c.status === 'IN_PROGRESS'
                              ? 'Đang diễn ra'
                              : 'Chuẩn bị'}
                        </Badge>
                      </div>
                      <h3 className="mt-1 font-bold text-base text-foreground leading-snug">
                        {c.name}
                      </h3>
                    </div>

                    {c.stats.totalTopics === 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDeleteCouncil(c)}
                        title="Xóa hội đồng"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground pt-1">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="size-3.5 text-primary shrink-0" />
                      <span className="truncate">{c.location || 'Chưa định phòng'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="size-3.5 text-primary shrink-0" />
                      <span>
                        {new Date(c.defenseDate).toLocaleDateString('vi-VN')}
                      </span>
                    </div>
                  </div>

                  {/* Thành phần Hội đồng */}
                  <div className="rounded-lg border bg-muted/30 p-2.5 text-xs space-y-1">
                    <div className="font-semibold text-muted-foreground text-[11px]">
                      Thành phần Hội đồng ({c.members.length} GV):
                    </div>
                    <div className="space-y-0.5 text-[11px]">
                      {president && (
                        <div>
                          <span className="text-amber-600 font-medium">Chủ tịch: </span>
                          <span>
                            {president.lecturer.academicTitle ? `${president.lecturer.academicTitle} ` : ''}
                            {president.lecturer.fullName}
                          </span>
                        </div>
                      )}
                      {secretary && (
                        <div>
                          <span className="text-blue-600 font-medium">Thư ký: </span>
                          <span>
                            {secretary.lecturer.academicTitle ? `${secretary.lecturer.academicTitle} ` : ''}
                            {secretary.lecturer.fullName}
                          </span>
                        </div>
                      )}
                      {otherMembers.length > 0 && (
                        <div>
                          <span className="text-muted-foreground font-medium">Ủy viên: </span>
                          <span>
                            {otherMembers
                              .map((m) => m.lecturer.fullName)
                              .join(', ')}
                          </span>
                        </div>
                      )}
                      {c.members.length === 0 && (
                        <span className="text-amber-600 italic">
                          Chưa phân công thành viên
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer action */}
                <div className="flex items-center justify-between pt-2 border-t text-xs">
                  <div className="font-medium text-muted-foreground">
                    Đề tài bảo vệ:{' '}
                    <strong className="text-foreground">
                      {c.stats.completedTopics} / {c.stats.totalTopics}
                    </strong>{' '}
                    hoàn thành
                  </div>

                  <Button
                    size="sm"
                    className="gap-1.5 text-xs font-semibold"
                    onClick={() => setManagingCouncilId(c.id)}
                  >
                    Chi tiết & Xếp lịch
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Dialogs */}
      <CouncilCreateDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        defaultSemesterId={currentSemesterId}
      />

      <CouncilManagementDialog
        open={managingCouncilId !== null}
        onOpenChange={(open) => !open && setManagingCouncilId(null)}
        councilId={managingCouncilId}
      />
    </div>
  );
}
