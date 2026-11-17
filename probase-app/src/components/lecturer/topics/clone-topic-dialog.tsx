'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Copy, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Major, ProjectType, Semester, TopicListItem } from '@/lib/api/types';
import { formatSemesterShort } from '@/lib/utils';
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
import { Textarea } from '@/components/ui/textarea';
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
      <DialogContent className="sm:max-w-xl border-slate-300 dark:border-neutral-700 bg-white dark:bg-[#18181b] p-6 gap-5">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary dark:bg-primary/20">
              <Copy className="size-5" />
            </div>
            <div className="space-y-0.5">
              <DialogTitle className="text-lg font-bold text-slate-900 dark:text-neutral-100">
                Nhân bản đề tài sang học kỳ này
              </DialogTitle>
              <DialogDescription className="text-sm text-slate-500 dark:text-neutral-400">
                Kỳ áp dụng:{' '}
                <span className="font-semibold text-slate-800 dark:text-neutral-200">
                  {activeSemester
                    ? formatSemesterShort(activeSemester)
                    : 'Học kỳ hiện tại'}
                </span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Tên đề tài mới */}
          <div className="space-y-1.5">
            <Label
              htmlFor="clone-title"
              className="text-sm font-semibold text-slate-800 dark:text-neutral-200"
            >
              Tên đề tài mới <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="clone-title"
              rows={2}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nhập tên đề tài..."
              className="resize-none text-sm leading-relaxed border-[1.5px] border-slate-300 dark:border-neutral-700"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Loại đồ án */}
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-slate-800 dark:text-neutral-200">
                Loại đồ án
              </Label>
              <Select
                value={String(projectTypeId)}
                onValueChange={(val) => setProjectTypeId(Number(val) || 0)}
              >
                <SelectTrigger className="w-full h-10 text-sm border-[1.5px] border-slate-300 dark:border-neutral-700">
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
                    <SelectItem
                      key={pt.id}
                      value={String(pt.id)}
                      className="text-sm"
                    >
                      {pt.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Chuyên ngành */}
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-slate-800 dark:text-neutral-200">
                Chuyên ngành
              </Label>
              <Select
                value={String(majorId)}
                onValueChange={(val) => setMajorId(Number(val) || 0)}
              >
                <SelectTrigger className="w-full h-10 text-sm border-[1.5px] border-slate-300 dark:border-neutral-700">
                  <SelectValue placeholder="Chọn chuyên ngành">
                    {(val) =>
                      majors.find((m) => String(m.id) === val)?.name ||
                      topic.major?.name ||
                      'Chung cho khoa'
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0" className="text-sm">
                    Chung cho khoa
                  </SelectItem>
                  {majors.map((m) => (
                    <SelectItem
                      key={m.id}
                      value={String(m.id)}
                      className="text-sm"
                    >
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Số lượng sinh viên tối đa */}
          <div className="space-y-1.5">
            <Label
              htmlFor="clone-max-students"
              className="text-sm font-semibold text-slate-800 dark:text-neutral-200"
            >
              Số sinh viên tối đa
            </Label>
            <Input
              id="clone-max-students"
              type="number"
              min={1}
              max={5}
              value={maxStudents}
              onChange={(e) =>
                setMaxStudents(Math.max(1, parseInt(e.target.value) || 1))
              }
              className="w-32 h-10 text-sm border-[1.5px] border-slate-300 dark:border-neutral-700"
            />
          </div>
        </div>

        <DialogFooter className="-mx-6 -mb-6 px-6 py-4 gap-2.5 border-slate-200 dark:border-neutral-800">
          <Button
            type="button"
            variant="outline"
            className="h-10 px-4 text-sm font-medium border-slate-300 dark:border-neutral-700 cursor-pointer"
            onClick={() => onOpenChange(false)}
            disabled={cloneMutation.isPending}
          >
            Hủy
          </Button>
          <Button
            type="button"
            className="h-10 px-5 text-sm font-semibold gap-2 bg-primary hover:bg-primary/90 text-white cursor-pointer"
            onClick={handleClone}
            disabled={cloneMutation.isPending}
          >
            {cloneMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Copy className="size-4" />
            )}
            <span>Tạo bản nháp mới</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
