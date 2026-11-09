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

      <DropdownMenuContent align="end" className="w-max min-w-56">
        <DropdownMenuItem
          disabled={isBusy || approvedCount === 0}
          onClick={() => void handleExport('SIGN_OFF')}
          className="cursor-pointer justify-between gap-4"
        >
          <span className="flex items-center gap-2">
            <FileCheck2 className="size-4 text-primary" />
            <span>Trình ký BCN Khoa</span>
          </span>
          <span className="text-xs text-muted-foreground tabular-nums">
            {approvedCount}
          </span>
        </DropdownMenuItem>

        <DropdownMenuItem
          disabled={isBusy || filteredCount === 0}
          onClick={() => void handleExport('FILTERED')}
          className="cursor-pointer justify-between gap-4"
        >
          <span className="flex items-center gap-2">
            <Filter className="size-4 text-muted-foreground" />
            <span>Theo bộ lọc hiện tại</span>
          </span>
          <span className="text-xs text-muted-foreground tabular-nums">
            {filteredCount}
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

