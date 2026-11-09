'use client';

import { ChevronDown, Download, FileCheck2, Filter, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useExportTopics, type ExportTopicsMode } from '@/lib/api/topics';
import type { TopicStatus } from '@/lib/api/types';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface TopicExportMenuProps {
  semesterId?: number;
  semesterCode?: string;
  approvedCount: number;
  filteredCount: number;
  filters: {
    status?: TopicStatus;
    lecturerId?: number;
    q?: string;
  };
  disabled?: boolean;
}

export function TopicExportMenu({
  semesterId,
  semesterCode,
  approvedCount,
  filteredCount,
  filters,
  disabled = false,
}: TopicExportMenuProps) {
  const exportTopics = useExportTopics();

  async function handleExport(mode: ExportTopicsMode) {
    try {
      await exportTopics.mutateAsync({
        mode,
        semesterId,
        semesterCode,
        ...(mode === 'FILTERED' ? filters : {}),
      });
      toast.success(
        mode === 'SIGN_OFF'
          ? 'Đã tải xuống danh sách đề tài trình ký BCN Khoa.'
          : 'Đã tải xuống danh sách đề tài Excel.',
      );
    } catch (err) {
      toast.error(
        err instanceof Error && err.message
          ? err.message
          : 'Không thể xuất file Excel. Vui lòng thử lại.',
      );
    }
  }

  const isBusy = exportTopics.isPending;
  const triggerDisabled = disabled || isBusy || semesterId === undefined;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={triggerDisabled}
        render={
          <Button
            variant="outline"
            disabled={triggerDisabled}
            className="gap-1.5 border-[1.5px] border-slate-300 dark:border-neutral-700 hover:bg-slate-50 dark:hover:bg-neutral-800 text-slate-700 dark:text-neutral-200 cursor-pointer shadow-2xs"
          >
            {isBusy ? (
              <Loader2 className="size-4 animate-spin text-primary" />
            ) : (
              <Download className="size-4" />
            )}
            <span>Xuất Excel</span>
            <ChevronDown className="size-3.5 text-muted-foreground" />
          </Button>
        }
      />

      <DropdownMenuContent align="end" className="w-80 p-1.5">
        <DropdownMenuItem
          disabled={isBusy || approvedCount === 0}
          onClick={() => void handleExport('SIGN_OFF')}
          className="cursor-pointer items-start gap-2.5 py-2 whitespace-normal"
        >
          <FileCheck2 className="mt-0.5 size-4 shrink-0 text-primary" />
          <div className="min-w-0 space-y-0.5 whitespace-normal">
            <p className="text-sm font-medium leading-snug">
              Danh sách trình ký BCN Khoa
            </p>
            <p className="text-xs text-muted-foreground leading-snug">
              {approvedCount > 0
                ? `Chỉ gồm ${approvedCount} đề tài Đã duyệt — chờ mở`
                : 'Chưa có đề tài nào ở trạng thái Đã duyệt — chờ mở'}
            </p>
          </div>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          disabled={isBusy || filteredCount === 0}
          onClick={() => void handleExport('FILTERED')}
          className="cursor-pointer items-start gap-2.5 py-2 whitespace-normal"
        >
          <Filter className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0 space-y-0.5 whitespace-normal">
            <p className="text-sm font-medium leading-snug">
              Theo bộ lọc hiện tại trên bảng
            </p>
            <p className="text-xs text-muted-foreground leading-snug">
              {filteredCount > 0
                ? `Xuất toàn bộ ${filteredCount} đề tài khớp bộ lọc`
                : 'Không có đề tài nào khớp bộ lọc hiện tại'}
            </p>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
