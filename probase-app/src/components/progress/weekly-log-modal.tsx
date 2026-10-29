'use client';

import { useState } from 'react';
import { GitBranch, Loader2, Plus, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { useCreateWeeklyLog, useUpdateWeeklyLog } from '@/lib/api/progress';
import type { WeeklyLogItem } from '@/lib/api/types';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Textarea } from '@/components/ui/textarea';

interface WeeklyLogModalProps {
  initialLog?: WeeklyLogItem | null;
  trigger?: React.ReactNode;
  suggestedWeek?: number;
  currentPercentage?: number;
}

export function WeeklyLogModal({
  initialLog,
  trigger,
  suggestedWeek = 1,
  currentPercentage = 0,
}: WeeklyLogModalProps) {
  const [open, setOpen] = useState(false);
  const [weekNumber, setWeekNumber] = useState(
    initialLog?.weekNumber ?? suggestedWeek,
  );
  const [title, setTitle] = useState(initialLog?.title ?? '');
  const [percentage, setPercentage] = useState(
    initialLog?.completionPercentage ?? currentPercentage,
  );
  const [gitUrl, setGitUrl] = useState(initialLog?.gitCommitUrl ?? '');
  const [summary, setSummary] = useState(initialLog?.summaryNotes ?? '');
  const [blockers, setBlockers] = useState(initialLog?.blockers ?? '');

  const createMutation = useCreateWeeklyLog();
  const updateMutation = useUpdateWeeklyLog();
  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!summary.trim()) {
      toast.error('Vui lòng nhập công việc đã hoàn thành.');
      return;
    }

    try {
      if (initialLog) {
        await updateMutation.mutateAsync({
          id: initialLog.id,
          title: title.trim() || undefined,
          completionPercentage: percentage,
          gitCommitUrl: gitUrl.trim() || undefined,
          summaryNotes: summary.trim(),
          blockers: blockers.trim() || undefined,
        });
        toast.success('Đã cập nhật nhật ký tiến độ.');
      } else {
        await createMutation.mutateAsync({
          weekNumber,
          title: title.trim() || undefined,
          completionPercentage: percentage,
          gitCommitUrl: gitUrl.trim() || undefined,
          summaryNotes: summary.trim(),
          blockers: blockers.trim() || undefined,
        });
        toast.success(`Đã lưu tiến độ Tuần ${weekNumber}.`);
      }
      setOpen(false);
    } catch (err: any) {
      toast.error(err?.message || 'Có lỗi xảy ra, vui lòng thử lại.');
    }
  };

  return (
    <>
      {trigger ? (
        <span onClick={() => setOpen(true)} className="inline-block cursor-pointer">
          {trigger}
        </span>
      ) : (
        <Button size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
          <Plus className="size-4" />
          Ghi nhận tiến độ
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {initialLog ? 'Cập nhật tiến độ' : 'Ghi nhận tiến độ với GVHD'}
          </DialogTitle>
          <DialogDescription>
            Cập nhật khối lượng đã làm để GVHD theo dõi và phản hồi góp ý.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="weekNumber">Mốc thời gian</Label>
              <Select
                value={String(weekNumber)}
                onValueChange={(val) => setWeekNumber(Number(val))}
                disabled={!!initialLog}
              >
                <SelectTrigger id="weekNumber">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 15 }, (_, i) => i + 1).map((w) => (
                    <SelectItem key={w} value={String(w)}>
                      Tuần {w}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="percentage">Tiến độ tổng thể</Label>
                <span className="text-xs font-semibold text-primary">
                  {percentage}%
                </span>
              </div>
              <Input
                id="percentage"
                type="number"
                min={0}
                max={100}
                value={percentage}
                onChange={(e) => setPercentage(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="logTitle">Nội dung chính (tùy chọn)</Label>
            <Input
              id="logTitle"
              placeholder="VD: Thiết kế CSDL & Dựng giao diện mẫu"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="summary">
              Công việc đã thực hiện <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="summary"
              rows={3}
              placeholder="Mô tả các tính năng/nhiệm vụ đã hoàn thành..."
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="gitUrl" className="flex items-center gap-1.5">
              <GitBranch className="size-3.5" />
              Link mã nguồn / Commit minh chứng
            </Label>
            <Input
              id="gitUrl"
              placeholder="https://github.com/.../commit/..."
              value={gitUrl}
              onChange={(e) => setGitUrl(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="blockers">Khó khăn / Vướng mắc cần GVHD hỗ trợ</Label>
            <Textarea
              id="blockers"
              rows={2}
              placeholder="Ghi chú vướng mắc kỹ thuật hoặc câu hỏi..."
              value={blockers}
              onChange={(e) => setBlockers(e.target.value)}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Hủy
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-1.5 size-4 animate-spin" />}
              {initialLog ? 'Lưu thay đổi' : 'Gửi cập nhật'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    </>
  );
}
