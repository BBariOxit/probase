'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Calendar,
  Gavel,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  X,
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
import { useDebouncedValue } from '@/lib/use-debounced-value';
import { formatDate, sanitizeLecturerName } from '@/lib/utils';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { EmptyState } from '@/components/shared/empty-state';
import { StatusPill, type StatusLabel } from '@/components/shared/status-pill';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CouncilCreateDialog } from './council-create-dialog';
import { CouncilManagementDialog } from './council-management-dialog';

const STATUS_FILTER_OPTIONS: Array<{
  value: 'ALL' | CouncilStatus;
  label: string;
}> = [
  { value: 'ALL', label: 'Mọi trạng thái' },
  { value: 'PREP', label: 'Chuẩn bị' },
  { value: 'IN_PROGRESS', label: 'Đang diễn ra' },
  { value: 'COMPLETED', label: 'Đã hoàn thành' },
];

function getCouncilStatusLabel(status: CouncilStatus): StatusLabel {
  switch (status) {
    case 'COMPLETED':
      return { label: 'Đã hoàn thành', tone: 'success' };
    case 'IN_PROGRESS':
      return { label: 'Đang diễn ra', tone: 'active' };
    default:
      return { label: 'Chuẩn bị', tone: 'waiting' };
  }
}

export function AdminCouncilsView() {
  const { data: semesters } = useSemesters();
  const { data: majors } = useMajors();

  const defaultSemesterId = useMemo(
    () => semesters?.find((s) => s.isActive)?.id ?? semesters?.[0]?.id,
    [semesters],
  );

  const [semesterId, setSemesterId] = useState<number | undefined>(undefined);
  const [majorId, setMajorId] = useState<string>('ALL');
  const [status, setStatus] = useState<'ALL' | CouncilStatus>('ALL');
  const [search, setSearch] = useState('');

  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [editingCouncil, setEditingCouncil] = useState<CouncilListItem | null>(
    null,
  );
  const [managingCouncilId, setManagingCouncilId] = useState<number | null>(
    null,
  );
  const [deleteTarget, setDeleteTarget] = useState<CouncilListItem | null>(
    null,
  );

  const currentSemesterId = semesterId ?? defaultSemesterId;
  const parsedMajorId = majorId === 'ALL' ? undefined : Number(majorId);
  const debouncedSearch = useDebouncedValue(search);

  const {
    data: councils,
    isPending,
    error,
  } = useCouncils(
    {
      semesterId: currentSemesterId,
      majorId: parsedMajorId,
      status,
      search: debouncedSearch.trim() || undefined,
    },
    { enabled: currentSemesterId !== undefined },
  );

  const deleteMutation = useDeleteCouncil();

  const totalCouncils = councils?.length ?? 0;
  const totalScheduled =
    councils?.reduce((sum, c) => sum + c.stats.totalTopics, 0) ?? 0;
  const totalCompleted =
    councils?.reduce((sum, c) => sum + c.stats.completedTopics, 0) ?? 0;

  function openCreateDialog() {
    setEditingCouncil(null);
    setFormDialogOpen(true);
  }

  function openEditDialog(council: CouncilListItem) {
    setEditingCouncil(council);
    setFormDialogOpen(true);
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-lg font-semibold">Hội đồng bảo vệ</h1>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 cursor-pointer"
            render={<Link href="/admin/defense-eligibility" />}
          >
            <ShieldCheck className="size-3.5" />
            Điều kiện bảo vệ
          </Button>

          <Button
            size="sm"
            className="gap-1.5 cursor-pointer"
            onClick={openCreateDialog}
          >
            <Plus className="size-4" />
            Tạo hội đồng
          </Button>
        </div>
      </div>

      {/* Summary Strip */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-slate-300 dark:border-neutral-700 bg-white dark:bg-[#1e1e1e] px-5 py-3 shadow-2xs text-sm">
        <SummaryFigure value={totalCouncils} label="hội đồng" />
        <div className="h-4 w-px bg-slate-200 dark:bg-neutral-700 hidden sm:block" />
        <SummaryFigure value={totalScheduled} label="nhóm đã xếp lịch" />
        <div className="h-4 w-px bg-slate-200 dark:bg-neutral-700 hidden sm:block" />
        <SummaryFigure
          value={totalCompleted}
          label="đã khóa điểm"
          valueClass="text-emerald-600 dark:text-emerald-400"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Tìm tên hội đồng, phòng bảo vệ…"
            className="pl-8 pr-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Tìm kiếm hội đồng"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground cursor-pointer"
              aria-label="Xóa từ khóa"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {semesters && semesters.length > 0 && (
          <Select
            value={currentSemesterId ? String(currentSemesterId) : ''}
            onValueChange={(val) =>
              setSemesterId(val ? Number(val) : undefined)
            }
          >
            <SelectTrigger className="w-52" aria-label="Chọn học kỳ">
              <SelectValue>
                {(val) => {
                  const sem = semesters.find(
                    (s) => String(s.id) === String(val),
                  );
                  return sem
                    ? `${sem.name}${sem.isActive ? ' (Hiện tại)' : ''}`
                    : 'Chọn học kỳ';
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {semesters.map((s) => (
                <SelectItem key={s.id} value={String(s.id)}>
                  {s.name}
                  {s.isActive ? ' (Hiện tại)' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Select
          value={majorId}
          onValueChange={(val) => setMajorId(val ?? 'ALL')}
        >
          <SelectTrigger className="w-48" aria-label="Lọc theo chuyên ngành">
            <SelectValue>
              {(val) => {
                if (val === 'ALL') return 'Mọi chuyên ngành';
                return (
                  majors?.find((m) => String(m.id) === String(val))?.name ??
                  'Mọi chuyên ngành'
                );
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Mọi chuyên ngành</SelectItem>
            {majors?.map((m) => (
              <SelectItem key={m.id} value={String(m.id)}>
                {m.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={status}
          onValueChange={(val) =>
            setStatus((val ?? 'ALL') as 'ALL' | CouncilStatus)
          }
        >
          <SelectTrigger className="w-44" aria-label="Lọc theo trạng thái">
            <SelectValue>
              {(val) =>
                STATUS_FILTER_OPTIONS.find((opt) => opt.value === val)?.label ??
                'Mọi trạng thái'
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {STATUS_FILTER_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error && (
        <p className="text-sm text-destructive">
          Không tải được danh sách hội đồng bảo vệ.
        </p>
      )}

      {/* Councils List */}
      {isPending ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : !councils || councils.length === 0 ? (
        <div className="isolate overflow-hidden rounded-xl border border-slate-300 dark:border-neutral-700 bg-white dark:bg-[#1e1e1e] shadow-2xs">
          <EmptyState icon={Gavel} title="Chưa có hội đồng bảo vệ nào." />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {councils.map((c) => {
            const president = c.members.find(
              (m) => m.councilRole === 'PRESIDENT',
            );
            const secretary = c.members.find(
              (m) => m.councilRole === 'SECRETARY',
            );
            const otherMembers = c.members.filter(
              (m) => m.councilRole === 'MEMBER',
            );
            const statusLabel = getCouncilStatusLabel(c.status);

            return (
              <div
                key={c.id}
                className="flex flex-col justify-between rounded-xl border border-slate-300 dark:border-neutral-700 bg-white dark:bg-[#1e1e1e] p-4 shadow-2xs space-y-4"
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusPill
                          variant="tag"
                          label={statusLabel.label}
                          tone={statusLabel.tone}
                        />
                        <span className="text-xs font-medium text-muted-foreground">
                          {c.major?.name ?? 'Toàn khoa'}
                        </span>
                      </div>
                      <h2 className="font-semibold text-base text-slate-900 dark:text-neutral-100 leading-snug">
                        {c.name}
                      </h2>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        className="size-7.5 text-muted-foreground hover:text-foreground cursor-pointer"
                        onClick={() => openEditDialog(c)}
                        title="Sửa thông tin hội đồng"
                        aria-label="Sửa thông tin hội đồng"
                      >
                        <Pencil className="size-3.5" />
                      </Button>

                      {c.stats.totalTopics === 0 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          className="size-7.5 text-muted-foreground hover:text-destructive cursor-pointer"
                          onClick={() => setDeleteTarget(c)}
                          title="Xóa hội đồng"
                          aria-label="Xóa hội đồng"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5 min-w-0">
                      <MapPin className="size-3.5 shrink-0" />
                      <span className="truncate">
                        {c.location || 'Chưa định phòng'}
                      </span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 tabular-nums">
                      <Calendar className="size-3.5 shrink-0" />
                      <span>{formatDate(c.defenseDate)}</span>
                    </span>
                  </div>

                  <div className="rounded-lg border border-slate-200 dark:border-neutral-700 bg-slate-50/70 dark:bg-neutral-900/40 p-3 text-xs space-y-1">
                    <p className="font-medium text-muted-foreground">
                      Thành phần ({c.members.length} GV)
                    </p>
                    {c.members.length === 0 ? (
                      <p className="text-muted-foreground">
                        Chưa phân công thành viên
                      </p>
                    ) : (
                      <div className="space-y-0.5 text-slate-700 dark:text-neutral-300">
                        {president && (
                          <p>
                            <span className="font-medium">Chủ tịch: </span>
                            {
                              sanitizeLecturerName(
                                president.lecturer.fullName,
                                president.lecturer.academicTitle,
                              ).displayName
                            }
                          </p>
                        )}
                        {secretary && (
                          <p>
                            <span className="font-medium">Thư ký: </span>
                            {
                              sanitizeLecturerName(
                                secretary.lecturer.fullName,
                                secretary.lecturer.academicTitle,
                              ).displayName
                            }
                          </p>
                        )}
                        {otherMembers.length > 0 && (
                          <p>
                            <span className="font-medium">Ủy viên: </span>
                            {otherMembers
                              .map(
                                (m) =>
                                  sanitizeLecturerName(
                                    m.lecturer.fullName,
                                    m.lecturer.academicTitle,
                                  ).displayName,
                              )
                              .join(', ')}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-200 dark:border-neutral-700 pt-3 text-xs">
                  <span className="text-muted-foreground tabular-nums">
                    Đã khóa điểm:{' '}
                    <strong className="text-foreground">
                      {c.stats.completedTopics}/{c.stats.totalTopics}
                    </strong>{' '}
                    nhóm
                  </span>

                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs cursor-pointer"
                    onClick={() => setManagingCouncilId(c.id)}
                  >
                    Quản lý &amp; Xếp lịch
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <CouncilCreateDialog
        open={formDialogOpen}
        onOpenChange={(next) => {
          setFormDialogOpen(next);
          if (!next) setEditingCouncil(null);
        }}
        defaultSemesterId={currentSemesterId}
        council={editingCouncil}
      />

      <CouncilManagementDialog
        open={managingCouncilId !== null}
        onOpenChange={(next) => {
          if (!next) setManagingCouncilId(null);
        }}
        councilId={managingCouncilId}
        onEditCouncil={(council) => {
          openEditDialog(council);
        }}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(next) => {
          if (!next) setDeleteTarget(null);
        }}
        title="Xóa hội đồng bảo vệ"
        description={
          deleteTarget
            ? `Bạn có chắc muốn xóa hội đồng "${deleteTarget.name}"?`
            : ''
        }
        confirmLabel="Xóa hội đồng"
        onConfirm={async () => {
          if (!deleteTarget) return;
          await deleteMutation.mutateAsync(deleteTarget.id);
          toast.success('Đã xóa hội đồng.');
        }}
      />
    </div>
  );
}

function SummaryFigure({
  value,
  label,
  valueClass,
}: {
  value: number;
  label: string;
  valueClass?: string;
}) {
  return (
    <span className="inline-flex items-baseline gap-2">
      <span
        className={`text-xl font-bold tabular-nums ${
          valueClass ?? 'text-slate-900 dark:text-neutral-100'
        }`}
      >
        {value}
      </span>
      <span className="text-sm font-medium text-slate-600 dark:text-neutral-400">
        {label}
      </span>
    </span>
  );
}
