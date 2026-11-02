'use client';

import { useState } from 'react';
import { Calendar, Gavel, Loader2, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { useCreateCouncil } from '@/lib/api/councils';
import { useMajors } from '@/lib/api/majors';
import { useSemesters } from '@/lib/api/master-data';
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

interface CouncilCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultSemesterId?: number;
}

export function CouncilCreateDialog({
  open,
  onOpenChange,
  defaultSemesterId,
}: CouncilCreateDialogProps) {
  const { data: semesters } = useSemesters();
  const { data: majors } = useMajors();
  const createMutation = useCreateCouncil();

  const [name, setName] = useState('');
  const [semesterId, setSemesterId] = useState<number | undefined>(
    defaultSemesterId,
  );
  const [majorId, setMajorId] = useState<number | null>(null);
  const [location, setLocation] = useState('');
  const [defenseDate, setDefenseDate] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const semId =
      semesterId ||
      semesters?.find((s) => s.isActive)?.id ||
      semesters?.[0]?.id;

    if (!semId) {
      toast.error('Vui lòng chọn học kỳ');
      return;
    }

    if (!name.trim()) {
      toast.error('Vui lòng nhập tên hội đồng');
      return;
    }

    if (!location.trim()) {
      toast.error('Vui lòng nhập phòng / địa điểm bảo vệ');
      return;
    }

    if (!defenseDate) {
      toast.error('Vui lòng chọn ngày giờ bảo vệ');
      return;
    }

    try {
      await createMutation.mutateAsync({
        name: name.trim(),
        semesterId: semId,
        majorId: majorId || null,
        location: location.trim(),
        defenseDate: new Date(defenseDate).toISOString(),
      });

      toast.success('Khởi tạo Hội đồng bảo vệ thành công');
      onOpenChange(false);
      setName('');
      setLocation('');
      setDefenseDate('');
    } catch (err: any) {
      toast.error(err?.message || 'Có lỗi xảy ra khi tạo hội đồng');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary">
            <Gavel className="size-5" />
            <DialogTitle>Thành lập Hội đồng Bảo vệ</DialogTitle>
          </div>
          <DialogDescription>
            Tạo hội đồng chấm bảo vệ Khóa luận tốt nghiệp theo quy định Khoa CNTT.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="council-name" className="text-xs font-semibold">
              Tên Hội đồng <span className="text-destructive">*</span>
            </Label>
            <Input
              id="council-name"
              placeholder="Ví dụ: Hội đồng KLTN 01 - Chuyên ngành Phần mềm"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="council-sem" className="text-xs font-semibold">
                Học kỳ <span className="text-destructive">*</span>
              </Label>
              <select
                id="council-sem"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                value={semesterId ?? ''}
                onChange={(e) => setSemesterId(Number(e.target.value))}
              >
                {semesters?.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.isActive ? '(Hiện tại)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="council-major" className="text-xs font-semibold">
                Chuyên ngành
              </Label>
              <select
                id="council-major"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                value={majorId ?? ''}
                onChange={(e) =>
                  setMajorId(e.target.value ? Number(e.target.value) : null)
                }
              >
                <option value="">Toàn khoa / Chung</option>
                {majors?.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="council-location" className="text-xs font-semibold">
              Địa điểm / Phòng bảo vệ <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <MapPin className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                id="council-location"
                className="pl-8"
                placeholder="Ví dụ: Phòng A11.204"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="council-date" className="text-xs font-semibold">
              Ngày giờ bảo vệ <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Calendar className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
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

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Hủy
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending && (
                <Loader2 className="mr-1.5 size-4 animate-spin" />
              )}
              Tạo Hội đồng
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
