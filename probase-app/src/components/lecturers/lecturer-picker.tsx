'use client';

import { useState } from 'react';
import {
  ChevronsUpDown,
  Loader2,
  Search,
  UserSearch,
  CircleHelp,
} from 'lucide-react';
import { useLecturerDirectory } from '@/lib/api/lecturers';
import type { LecturerDirectoryEntry } from '@/lib/api/types';
import { useDebouncedValue } from '@/lib/use-debounced-value';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/shared/empty-state';
import { StatusPill } from '@/components/shared/status-pill';
import { UserAvatar } from '@/components/shared/user-avatar';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const PAGE_SIZE = 20;

export function lecturerName(lecturer: {
  fullName: string;
  academicTitle: string | null;
}): string {
  return lecturer.academicTitle
    ? `${lecturer.academicTitle} ${lecturer.fullName}`
    : lecturer.fullName;
}

export function LecturerPicker({
  id,
  value,
  onChange,
  invalid = false,
  disabled = false,
}: {
  id?: string;
  value: LecturerDirectoryEntry | null;
  onChange: (lecturer: LecturerDirectoryEntry) => void;
  invalid?: boolean;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        id={id}
        type="button"
        variant="outline"
        disabled={disabled}
        aria-invalid={invalid}
        aria-haspopup="dialog"
        className="w-full justify-between font-normal"
        onClick={() => setOpen(true)}
      >
        <span className={cn('truncate', !value && 'text-muted-foreground')}>
          {value ? lecturerName(value) : 'Chọn giảng viên'}
        </span>
        <ChevronsUpDown className="text-muted-foreground" />
      </Button>

      {/* Mounted only while open: the directory query belongs to the panel, and
          a closed one on every form would fetch a page nobody asked to see. */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] gap-0 overflow-hidden p-0 sm:max-w-lg">
          {open && (
            <Panel
              selectedId={value?.id ?? null}
              onPick={(lecturer) => {
                onChange(lecturer);
                setOpen(false);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function Panel({
  selectedId,
  onPick,
}: {
  selectedId: number | null;
  onPick: (lecturer: LecturerDirectoryEntry) => void;
}) {
  const [search, setSearch] = useState('');
  const debounced = useDebouncedValue(search);
  const { data, isPending, error } = useLecturerDirectory({
    q: debounced || undefined,
    limit: PAGE_SIZE,
  });

  const items = data?.items ?? [];
  // No pager in here on purpose: a panel you page through is one you are
  // scanning, and scanning forty names is what the search box is for.
  const unlisted = data ? data.total - items.length : 0;

  return (
    <>
      <DialogHeader className="gap-1 border-b p-4">
        <div className="flex items-center gap-1.5">
          <DialogTitle>Chọn giảng viên hướng dẫn</DialogTitle>
          <TooltipProvider delay={100}>
            <Tooltip>
              <TooltipTrigger
                type="button"
                className="cursor-help text-muted-foreground hover:text-foreground"
              >
                <CircleHelp className="h-4 w-4" />
                <span className="sr-only">Thông tin thêm</span>
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-[280px]">
                Đề xuất sẽ được gửi riêng cho người bạn chọn.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <DialogDescription className="sr-only">
          Đề xuất sẽ được gửi riêng cho người bạn chọn.
        </DialogDescription>

        <div className="relative mt-2">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Tìm theo tên hoặc mã giảng viên…"
            className="h-9 pl-8"
            aria-label="Tìm giảng viên"
          />
        </div>
      </DialogHeader>

      <div className="max-h-[50vh] overflow-y-auto">
        {error && (
          <p className="px-4 py-6 text-sm text-destructive">
            Không tải được danh sách giảng viên.
          </p>
        )}

        {isPending && (
          <div className="flex justify-center py-12">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isPending && !error && items.length === 0 && (
          <EmptyState
            icon={UserSearch}
            title={
              debounced
                ? 'Không có giảng viên nào khớp từ khoá này.'
                : 'Chưa có giảng viên nào trong hệ thống.'
            }
          />
        )}

        <ul className="divide-y">
          {items.map((lecturer) => (
            <li key={lecturer.id}>
              <button
                type="button"
                onClick={() => onPick(lecturer)}
                aria-current={lecturer.id === selectedId}
                className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50 aria-[current=true]:bg-muted/60"
              >
                <UserAvatar
                  name={lecturer.fullName}
                  src={lecturer.avatarUrl}
                  className="mt-0.5 size-9"
                />
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-sm font-medium">
                      {lecturerName(lecturer)}
                    </span>
                    <MentoringPill lecturer={lecturer} />
                  </div>
                  {/*
                    The one field that tells two names apart. Clamped rather
                    than truncated: a research area is a list, and the first
                    half of the first item identifies nothing.
                  */}
                  {lecturer.researchInterests && (
                    <p className="line-clamp-2 text-xs text-muted-foreground">
                      {lecturer.researchInterests}
                    </p>
                  )}
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {unlisted > 0 && (
        <p className="border-t px-4 py-2.5 text-xs text-muted-foreground">
          Còn {unlisted} giảng viên khác — gõ tên để tìm.
        </p>
      )}
    </>
  );
}

function MentoringPill({ lecturer }: { lecturer: LecturerDirectoryEntry }) {
  const { groups, reserved, quota, atQuota } = lecturer.mentoring;

  if (quota === null) return null;

  return (
    <StatusPill
      label={`${groups + reserved}/${quota} nhóm`}
      tone={atQuota ? 'waiting' : 'idle'}
    />
  );
}
