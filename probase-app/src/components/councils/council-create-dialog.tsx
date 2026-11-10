'use client';

import { useState } from 'react';
import { Calendar, Loader2, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import {
  type CouncilListItem,
  type CouncilStatus,
  useCreateCouncil,
  useUpdateCouncil,
} from '@/lib/api/councils';
import { useMajors } from '@/lib/api/majors';
import { useSemesters } from '@/lib/api/master-data';
import type { Major, Semester } from '@/lib/api/types';
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

const COUNCIL_STATUS_OPTIONS: Array<{ value: CouncilStatus; label: string }> = [
  { value: 'PREP', label: 'Chuẩn bị' },
  { value: 'IN_PROGRESS', label: 'Đang diễn ra' },
  { value: 'COMPLETED', label: 'Đã hoàn thành' },
];

function toLocalDateTimeInput(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

interface CouncilCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultSemesterId?: number;
  council?: CouncilListItem | null;
}

export function CouncilCreateDialog({
  open,
  onOpenChange,
  defaultSemesterId,
  council,
}: CouncilCreateDialogProps) {
  const { data: semesters } = useSemesters();
  const { data: majors } = useMajors();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {open && (
          <CouncilFormBody
            key={
              council
                ? `edit-${council.id}`
                : `create-${defaultSemesterId ?? 'new'}`
            }
            council={council}
            defaultSemesterId={defaultSemesterId}
            semesters={semesters}
            majors={majors}
            onOpenChange={onOpenChange}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function CouncilFormBody({
  council,
  defaultSemesterId,
  semesters,
  majors,
  onOpenChange,
}: {
  council?: CouncilListItem | null;
  defaultSemesterId?: number;
  semesters?: Semester[];
  majors?: Major[];
  onOpenChange: (open: boolean) => void;
}) {
  const isEdit = Boolean(council);
  const createMutation = useCreateCouncil();
  const updateMutation = useUpdateCouncil(council?.id ?? 0);

  const [name, setName] = useState(() => council?.name ?? '');
  const [semesterId, setSemesterId] = useState<string>(() =>
    council ? String(council.semester.id) : '',
  );
  const [majorId, setMajorId] = useState<string>(() =>
    council?.major ? String(council.major.id) : 'ALL',
  );
  const [location, setLocation] = useState(() => council?.location ?? '');
  const [defenseDate, setDefenseDate] = useState(() =>
    council ? toLocalDateTimeInput(council.defenseDate) : '',
  );
  const [status, setStatus] = useState<CouncilStatus>(
    () => council?.status ?? 'PREP',
  );

  const effectiveSemesterId =
    semesterId ||
    String(
      defaultSemesterId ??
        semesters?.find((s) => s.isActive)?.id ??
        semesters?.[0]?.id ??
        '',
    );

  const isPending = createMutation.isPending || updateMutation.isPending;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!name.trim() || name.trim().length < 3) {
      toast.error('Tên hội đồng cần ít nhất 3 ký tự.');
      return;
    }

    if (!location.trim()) {
      toast.error('Vui lòng nhập phòng hoặc địa điểm bảo vệ.');
      return;
    }

    if (!defenseDate || isNaN(Date.parse(defenseDate))) {
      toast.error('Vui lòng chọn ngày giờ bảo vệ hợp lệ.');
      return;
    }

    const parsedMajorId = majorId === 'ALL' ? null : Number(majorId);
    const isoDate = new Date(defenseDate).toISOString();

    try {
      if (isEdit && council) {
        await updateMutation.mutateAsync({
          name: name.trim(),
          majorId: parsedMajorId,
          location: location.trim(),
          defenseDate: isoDate,
          status,
        });
        toast.success('Đã cập nhật thông tin hội đồng.');
      } else {
        const semId = Number(effectiveSemesterId);
        if (!semId) {
          toast.error('Vui lòng chọn học kỳ.');
          return;
        }
        await createMutation.mutateAsync({
          name: name.trim(),
          semesterId: semId,
          majorId: parsedMajorId,
          location: location.trim(),
          defenseDate: isoDate,
        });
        toast.success('Đã tạo hội đồng bảo vệ mới.');
      }
      onOpenChange(false);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : 'Không thể lưu thông tin hội đồng.',
      );
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {isEdit ? 'Cập nhật hội đồng bảo vệ' : 'Tạo hội đồng bảo vệ'}
        </DialogTitle>
        <DialogDescription>
          {isEdit
            ? 'Chỉnh sửa thông tin tổ chức và trạng thái của hội đồng.'
            : 'Nhập thông tin chung trước khi gán thành viên và xếp lịch bảo vệ.'}
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4 py-1">
        <div className="space-y-1.5">
          <Label htmlFor="council-name" className="text-xs font-medium">
            Tên hội đồng <span className="text-destructive">*</span>
          </Label>
          <Input
            id="council-name"
            placeholder="VD: Hội đồng KLTN 01 - KTPM"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">
              Học kỳ <span className="text-destructive">*</span>
            </Label>
            {isEdit && council ? (
              <div className="flex h-9 items-center rounded-lg border border-slate-200 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-900/50 px-3 text-sm text-muted-foreground">
                <span className="truncate">{council.semester.name}</span>
              </div>
            ) : (
              <Select
                value={effectiveSemesterId}
                onValueChange={(val) => setSemesterId(val ?? '')}
              >
                <SelectTrigger className="w-full" aria-label="Chọn học kỳ">
                  <SelectValue>
                    {(val) => {
                      const s = semesters?.find(
                        (item) => String(item.id) === String(val),
                      );
                      return s ? s.name : 'Chọn học kỳ';
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {semesters?.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.name}
                      {s.isActive ? ' (Hiện tại)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Chuyên ngành</Label>
            <Select
              value={majorId}
              onValueChange={(val) => setMajorId(val ?? 'ALL')}
            >
              <SelectTrigger className="w-full" aria-label="Chọn chuyên ngành">
                <SelectValue>
                  {(val) => {
                    if (val === 'ALL') return 'Toàn khoa';
                    return (
                      majors?.find((m) => String(m.id) === String(val))?.name ??
                      'Toàn khoa'
                    );
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Toàn khoa</SelectItem>
                {majors?.map((m) => (
                  <SelectItem key={m.id} value={String(m.id)}>
                    {m.name} ({m.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="council-location" className="text-xs font-medium">
            Địa điểm / Phòng bảo vệ <span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <MapPin className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="council-location"
              className="pl-8"
              placeholder="VD: Phòng A11.204"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="council-date" className="text-xs font-medium">
              Ngày giờ bảo vệ <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Calendar className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="council-date"
                type="datetime-local"
                className="pl-8"
                value={defenseDate}
                onChange={(e) => setDefenseDate(e.target.value)}
                required
              />
            </div>
          </div>

          {isEdit && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Trạng thái</Label>
              <Select
                value={status}
                onValueChange={(val) =>
                  setStatus((val ?? 'PREP') as CouncilStatus)
                }
              >
                <SelectTrigger className="w-full" aria-label="Chọn trạng thái">
                  <SelectValue>
                    {(val) =>
                      COUNCIL_STATUS_OPTIONS.find((opt) => opt.value === val)
                        ?.label ?? 'Chuẩn bị'
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {COUNCIL_STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter className="pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Huỷ
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="mr-1.5 size-4 animate-spin" />}
            {isEdit ? 'Lưu thay đổi' : 'Tạo hội đồng'}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}
