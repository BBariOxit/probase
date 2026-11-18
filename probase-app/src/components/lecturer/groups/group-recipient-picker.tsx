'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, Search, Users, X } from 'lucide-react';
import type { RegistrationGroup } from '@/lib/api/types';
import { cn, formatProjectTypeShort } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

const MAX_VISIBLE_CHIPS = 6;

function getSortedMembers(group: RegistrationGroup) {
  return [...group.members].sort(
    (a, b) => Number(b.isLeader) - Number(a.isLeader),
  );
}

function formatGroupChipLabel(group: RegistrationGroup): string {
  const pt = formatProjectTypeShort(group.topic.projectType).short;
  const members = getSortedMembers(group);
  if (members.length === 0) return `${pt} · Nhóm #${group.id}`;
  const lead = members[0].student.fullName;
  return members.length > 1
    ? `${pt} · ${lead} +${members.length - 1}`
    : `${pt} · ${lead}`;
}

function formatMembersLine(group: RegistrationGroup): string {
  return getSortedMembers(group)
    .map((m) => `${m.student.fullName} (${m.student.studentCode})`)
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
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const selectedGroups = useMemo(
    () => groups.filter((g) => selectedSet.has(g.id)),
    [groups, selectedSet],
  );

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

  function removeGroup(groupId: number) {
    onChangeSelectedIds(selectedIds.filter((id) => id !== groupId));
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

  const visibleChips = selectedGroups.slice(0, MAX_VISIBLE_CHIPS);
  const overflowCount = selectedGroups.length - visibleChips.length;

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label className="text-sm font-semibold text-foreground">Đến</Label>
        <span className="text-xs font-medium text-muted-foreground tabular-nums">
          {selectedGroups.length}/{groups.length} nhóm ·{' '}
          <strong className="text-primary">{recipientCount} sinh viên</strong>
        </span>
      </div>

      <Popover open={open} onOpenChange={setOpen}>
        <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-border bg-background/60 px-2.5 py-2 min-h-11">
          {selectedGroups.length === 0 ? (
            <span className="px-1 text-sm text-muted-foreground">
              Chưa chọn nhóm nhận...
            </span>
          ) : (
            <>
              {visibleChips.map((group) => (
                <span
                  key={group.id}
                  title={`${group.topic.title} — ${formatMembersLine(group)}`}
                  className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-xs font-medium text-foreground shadow-2xs"
                >
                  <span className="max-w-52 truncate">
                    {formatGroupChipLabel(group)}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeGroup(group.id)}
                    aria-label={`Bỏ chọn ${group.topic.title}`}
                    className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                  >
                    <X className="size-3" />
                  </button>
                </span>
              ))}
              {overflowCount > 0 && (
                <span className="rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                  +{overflowCount} nhóm nữa
                </span>
              )}
            </>
          )}

          <PopoverTrigger
            render={
              <button
                type="button"
                className="ml-auto inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1 text-xs font-semibold text-foreground hover:bg-muted/70 transition-colors cursor-pointer shrink-0"
              >
                <Users className="size-3.5 text-primary" />
                <span>
                  {selectedGroups.length === 0 ? 'Chọn nhóm' : 'Chọn / lọc'}
                </span>
                <ChevronDown className="size-3.5 text-muted-foreground" />
              </button>
            }
          />
        </div>

        <PopoverContent
          align="end"
          sideOffset={6}
          positionerClassName="z-[60]"
          className="w-[min(560px,calc(100vw-3rem))] p-0 overflow-hidden"
        >
          <div className="p-3 border-b border-border space-y-2.5 bg-card">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm theo đề tài, tên sinh viên hoặc MSSV..."
                className="h-8.5 pl-8 text-xs"
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
                    : 'border-border text-muted-foreground hover:text-foreground',
                )}
              >
                {allSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
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
                          : 'border-border text-muted-foreground hover:text-foreground',
                      )}
                    >
                      {pt.short} ({pt.groupIds.length})
                    </button>
                  );
                })}
            </div>
          </div>

          <div className="max-h-72 overflow-y-auto divide-y divide-border/70">
            {groups.length === 0 ? (
              <p className="px-4 py-6 text-center text-xs text-muted-foreground">
                Chưa có nhóm nào có sinh viên tham gia.
              </p>
            ) : filteredGroups.length === 0 ? (
              <p className="px-4 py-6 text-center text-xs text-muted-foreground">
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

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 min-w-0">
                          <span className="mt-0.5 shrink-0 rounded bg-muted px-1.5 py-0.5 text-[11px] font-semibold text-muted-foreground leading-none">
                            {pt.short}
                          </span>
                          <span className="text-sm font-medium text-foreground leading-snug line-clamp-2">
                            {group.topic.title}
                          </span>
                        </div>
                        <span className="shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
                          {group.occupiedSeats} SV
                        </span>
                      </div>

                      <p className="text-xs text-muted-foreground truncate">
                        {formatMembersLine(group)}
                      </p>
                    </div>
                  </label>
                );
              })
            )}
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-border bg-muted/30 px-3.5 py-2">
            <span className="text-xs text-muted-foreground tabular-nums">
              Đã chọn{' '}
              <strong className="text-foreground">{selectedIds.length}</strong>{' '}
              nhóm ({recipientCount} SV)
            </span>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => setOpen(false)}
              className="h-7 px-3 text-xs cursor-pointer"
            >
              Xong
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
