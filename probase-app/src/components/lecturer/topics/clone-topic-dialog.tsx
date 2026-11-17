'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Copy, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Major, ProjectType, Semester, TopicListItem } from '@/lib/api/types';
import { useCloneTopic } from '@/lib/api/topics';
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

interface CloneTopicDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  topic: TopicListItem | null;
  activeSemester?: Semester;
  projectTypes?: ProjectType[];
  majors?: Major[];
  onSuccess?: () => void;
}

export function CloneTopicDialog({
  open,
  onOpenChange,
  topic,
  activeSemester,
  projectTypes = [],
  majors = [],
  onSuccess,
}: CloneTopicDialogProps) {
  const router = useRouter();
  const cloneMutation = useCloneTopic();

  const [title, setTitle] = useState('');
  const [projectTypeId, setProjectTypeId] = useState<number>(0);
  const [majorId, setMajorId] = useState<number>(0);
  const [maxStudents, setMaxStudents] = useState<number>(2);

  useEffect(() => {
    if (topic && open) {
      setTitle(topic.title || '');
      setProjectTypeId(topic.projectType?.id ?? 0);
      setMajorId(topic.majorId ?? topic.major?.id ?? 0);
      setMaxStudents(topic.maxStudents ?? 2);
    }
  }, [topic, open]);

  if (!topic) return null;

  async function handleClone() {
    if (!title.trim()) {
      toast.error('Vui lòng nhập tên đề tài.');
      return;
    }

    try {
      const cloned = await cloneMutation.mutateAsync({
        id: topic!.id,
        input: {
          title: title.trim(),
          projectTypeId: projectTypeId || undefined,
          majorId: majorId || undefined,
          semesterId: activeSemester?.id,
          maxStudents: maxStudents || undefined,
        },
      });

      toast.success('Đã nhân bản đề tài thành công vào kỳ này (Bản nháp).', {
        action: {
          label: 'Chỉnh sửa ngay',
          onClick: () => router.push(`/lecturer/topics/${cloned.id}?edit=true`),
        },
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : 'Không thể nhân bản đề tài.',
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg border-slate-300 dark:border-neutral-700 bg-white dark:bg-[#18181b] p-6">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary dark:bg-primary/20">
              <Copy className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900 dark:text-neutral-100">
                Nhân bản đề tài sang học kỳ này
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5">
                Kỳ áp dụng: <span className="font-semibold text-slate-700 dark:text-neutral-200">{activeSemester?.name ?? 'Học kỳ hiện tại'}</span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2 text-sm">
          {/* Nguồn đề tài gốc */}
          <div className="rounded-lg bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 p-3 space-y-1">
            <div className="text-xs font-medium text-slate-500 dark:text-neutral-400">
              Đề tài gốc ({topic.semester?.name ?? 'Kỳ trước'}):
            </div>
            <div className="font-semibold text-slate-800 dark:text-neutral-200 text-xs line-clamp-2">
              {topic.title}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-neutral-400">
              GV ra đề: {topic.lecturer?.academicTitle ? `${topic.lecturer.academicTitle} ` : ''}{topic.lecturer?.fullName}
            </div>
          </div>

          {/* Tên đề tài mới */}
          <div className="space-y-1.5">
            <Label htmlFor="clone-title" className="text-xs font-semibold text-slate-700 dark:text-neutral-300">
              Tên đề tài mới <span className="text-destructive">*</span>
            </Label>
            <Input
              id="clone-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nhập tên đề tài..."
              className="text-xs border-slate-300 dark:border-neutral-700"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Loại đồ án */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 dark:text-neutral-300">
                Loại đồ án
              </Label>
              <Select
                value={String(projectTypeId)}
                onValueChange={(val) => setProjectTypeId(Number(val) || 0)}
              >
                <SelectTrigger className="w-full text-xs border-slate-300 dark:border-neutral-700">
                  <SelectValue placeholder="Chọn loại đồ án">
                    {(val) =>
                      projectTypes.find((pt) => String(pt.id) === val)?.name ||
                      topic.projectType?.name ||
                      'Chọn loại đồ án'
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {projectTypes.map((pt) => (
                    <SelectItem key={pt.id} value={String(pt.id)}>
                      {pt.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Chuyên ngành */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 dark:text-neutral-300">
                Chuyên ngành
              </Label>
              <Select
                value={String(majorId)}
                onValueChange={(val) => setMajorId(Number(val) || 0)}
              >
                <SelectTrigger className="w-full text-xs border-slate-300 dark:border-neutral-700">
                  <SelectValue placeholder="Chọn chuyên ngành">
                    {(val) =>
                      majors.find((m) => String(m.id) === val)?.name ||
                      topic.major?.name ||
                      'Chung cho khoa'
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Chung cho khoa</SelectItem>
                  {majors.map((m) => (
                    <SelectItem key={m.id} value={String(m.id)}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Số lượng sinh viên tối đa */}
          <div className="space-y-1.5">
            <Label htmlFor="clone-max-students" className="text-xs font-semibold text-slate-700 dark:text-neutral-300">
              Số sinh viên tối đa
            </Label>
            <Input
              id="clone-max-students"
              type="number"
              min={1}
              max={5}
              value={maxStudents}
              onChange={(e) => setMaxStudents(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-28 text-xs border-slate-300 dark:border-neutral-700"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2">
          <Button
            type="button"
            variant="outline"
            className="text-xs border-slate-300 dark:border-neutral-700 cursor-pointer"
            onClick={() => onOpenChange(false)}
            disabled={cloneMutation.isPending}
          >
            Hủy
          </Button>
          <Button
            type="button"
            className="text-xs font-semibold gap-1.5 bg-primary hover:bg-primary/90 text-white cursor-pointer"
            onClick={handleClone}
            disabled={cloneMutation.isPending}
          >
            {cloneMutation.isPending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Copy className="size-3.5" />
            )}
            <span>Tạo bản nháp mới</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

