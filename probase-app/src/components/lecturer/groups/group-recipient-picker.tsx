'use client';

import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import type { RegistrationGroup } from '@/lib/api/types';
import { cn, formatProjectTypeShort } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

function formatMemberNames(group: RegistrationGroup): string {
  return [...group.members]
    .sort((a, b) => Number(b.isLeader) - Number(a.isLeader))
    .map((m) => m.student.fullName)
    .join(', ');
}

export function GroupRecipientPicker({
  groups,
  selectedIds,
  recipientCount,
  onChangeSelectedIds,
}: {
  groups: RegistrationGroup[];
  selectedIds: number[];
  recipientCount: number;
  onChangeSelectedIds: (ids: number[]) => void;
}) {
  const [search, setSearch] = useState('');

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const projectTypes = useMemo(() => {
    const map = new Map<
      number,
      { id: number; short: string; full: string; groupIds: number[] }
    >();
    for (const g of groups) {
      const existing = map.get(g.topic.projectType.id);
      if (existing) {
        existing.groupIds.push(g.id);
      } else {
        const pt = formatProjectTypeShort(g.topic.projectType);
        map.set(g.topic.projectType.id, {
          id: g.topic.projectType.id,
          short: pt.short,
          full: pt.full,
          groupIds: [g.id],
        });
      }
    }
    return [...map.values()];
  }, [groups]);

  const filteredGroups = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return groups;
    return groups.filter((g) => {
      if (g.topic.title.toLowerCase().includes(q)) return true;
      if (g.topic.projectType.name.toLowerCase().includes(q)) return true;
      return g.members.some(
        (m) =>
          m.student.fullName.toLowerCase().includes(q) ||
          m.student.studentCode.toLowerCase().includes(q),
      );
    });
  }, [groups, search]);

  const allSelected =
    groups.length > 0 && selectedIds.length === groups.length;

  function toggleGroup(groupId: number, checked: boolean) {
    if (checked) {
      if (!selectedSet.has(groupId)) {
        onChangeSelectedIds([...selectedIds, groupId]);
      }
    } else {
      onChangeSelectedIds(selectedIds.filter((id) => id !== groupId));
    }
  }

  function toggleAll() {
    onChangeSelectedIds(allSelected ? [] : groups.map((g) => g.id));
  }

  function selectByProjectType(typeGroupIds: number[]) {
    const allOfTypeSelected = typeGroupIds.every((id) => selectedSet.has(id));
    if (allOfTypeSelected && selectedIds.length === typeGroupIds.length) {
      onChangeSelectedIds([]);
      return;
    }
    onChangeSelectedIds(typeGroupIds);
  }

  return (
    <div className="flex flex-col h-full min-w-0 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-sm font-semibold text-foreground">
          Nhóm nhận
        </Label>
        <span className="text-xs font-medium text-muted-foreground tabular-nums">
          {selectedIds.length}/{groups.length} nhóm ·{' '}
          <strong className="text-primary">{recipientCount} sinh viên</strong>
        </span>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-border bg-background/50">
        <div className="space-y-2.5 border-b border-border/80 bg-muted/20 p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm đề tài, sinh viên, MSSV..."
              className="h-9 pl-8.5 text-sm"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={toggleAll}
              className={cn(
                'rounded-md border px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer',
                allSelected
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-card text-muted-foreground hover:text-foreground',
              )}
            >
              {allSelected ? 'Bỏ chọn tất cả' : 'Tất cả'}
            </button>

            {projectTypes.length > 1 &&
              projectTypes.map((pt) => {
                const active =
                  selectedIds.length === pt.groupIds.length &&
                  pt.groupIds.every((id) => selectedSet.has(id));
                return (
                  <button
                    key={pt.id}
                    type="button"
                    title={`Chỉ chọn nhóm ${pt.full}`}
                    onClick={() => selectByProjectType(pt.groupIds)}
                    className={cn(
                      'rounded-md border px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer',
                      active
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-card text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {pt.short} ({pt.groupIds.length})
                  </button>
                );
              })}
          </div>
        </div>

        <TooltipProvider delay={150}>
          <div className="flex-1 min-h-56 max-h-[340px] overflow-y-auto divide-y divide-border/60">
            {groups.length === 0 ? (
              <p className="px-4 py-8 text-center text-xs text-muted-foreground">
                Chưa có nhóm nào có sinh viên tham gia.
              </p>
            ) : filteredGroups.length === 0 ? (
              <p className="px-4 py-8 text-center text-xs text-muted-foreground">
                Không tìm thấy nhóm phù hợp.
              </p>
            ) : (
              filteredGroups.map((group) => {
                const checked = selectedSet.has(group.id);
                const pt = formatProjectTypeShort(group.topic.projectType);
                const checkboxId = `recipient-group-${group.id}`;

                return (
                  <label
                    key={group.id}
                    htmlFor={checkboxId}
                    className={cn(
                      'flex items-start gap-3 px-3.5 py-2.5 cursor-pointer transition-colors',
                      checked
                        ? 'bg-primary/5 dark:bg-primary/10'
                        : 'hover:bg-muted/40',
                    )}
                  >
                    <Checkbox
                      id={checkboxId}
                      checked={checked}
                      onCheckedChange={(val) => toggleGroup(group.id, val)}
                      className="mt-0.5 shrink-0"
                    />

                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[11px] font-semibold text-muted-foreground leading-none">
                          {pt.short}
                        </span>

                        <Tooltip>
                          <TooltipTrigger
                            render={
                              <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground" />
                            }
                          >
                            {group.topic.title}
                          </TooltipTrigger>
                          <TooltipContent
                            side="top"
                            align="start"
                            className="z-[60] max-w-md p-3 text-xs leading-relaxed bg-slate-900 text-white dark:bg-neutral-800 dark:text-neutral-100 rounded-lg shadow-xl border border-slate-700 dark:border-neutral-700"
                          >
                            <p className="font-semibold text-primary mb-1">
                              Tên đề tài đầy đủ:
                            </p>
                            <p className="text-slate-200 dark:text-neutral-200 break-words [overflow-wrap:anywhere]">
                              {group.topic.title}
                            </p>
                          </TooltipContent>
                        </Tooltip>

                        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                          {group.occupiedSeats} SV
                        </span>
                      </div>

                      <p className="truncate text-xs text-muted-foreground">
                        {formatMemberNames(group)}
                      </p>
                    </div>
                  </label>
                );
              })
            )}
          </div>
        </TooltipProvider>
      </div>
    </div>
  );
}
