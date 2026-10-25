'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useBulkOpenTopics } from '@/lib/api/topics';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface BulkOpenDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Number of APPROVED topics that would be opened. */
  approvedCount: number;
  semesterId: number;
  semesterName: string;
}

export function BulkOpenDialog({
  open,
  onOpenChange,
  approvedCount,
  semesterId,
  semesterName,
}: BulkOpenDialogProps) {
  const bulkOpen = useBulkOpenTopics();
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setError(null);
    try {
      const result = await bulkOpen.mutateAsync(semesterId);
      toast.success(`Đã mở đăng ký cho ${result.updated} đề tài.`);
      onOpenChange(false);
    } catch {
      setError('Không thực hiện được. Vui lòng thử lại.');
    }
  }

  function handleOpenChange(next: boolean) {
    if (bulkOpen.isPending) return;
    setError(null);
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Mở đăng ký đồng loạt?</DialogTitle>
          <DialogDescription>{semesterName}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          {approvedCount === 0 ? (
            <p className="text-muted-foreground">
              Không có đề tài nào đang chờ mở đăng ký trong học kỳ này.
            </p>
          ) : (
            <p>
              Bạn sắp mở đăng ký cho{' '}
              <span className="font-semibold">{approvedCount} đề tài</span> đã
              duyệt. Sinh viên sẽ thấy và có thể đăng ký ngay sau khi thao tác
              này hoàn thành.
            </p>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            disabled={bulkOpen.isPending}
            onClick={() => onOpenChange(false)}
          >
            Huỷ
          </Button>
          <Button
            disabled={approvedCount === 0 || bulkOpen.isPending}
            onClick={handleConfirm}
          >
            {bulkOpen.isPending && <Loader2 className="animate-spin" />}
            Mở đăng ký
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
