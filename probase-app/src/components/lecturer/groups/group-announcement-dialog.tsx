'use client';

import { useMemo, useState } from 'react';
import { Loader2, Mail, Send } from 'lucide-react';
import { toast } from 'sonner';
import { useNotifySupervisedGroups } from '@/lib/api/registration';
import type { RegistrationGroup } from '@/lib/api/types';
import { cn, formatProjectTypeShort } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ANNOUNCEMENT_TEMPLATES } from './announcement-templates';

const TITLE_MAX = 150;
const CONTENT_MAX = 3000;

function getDefaultSelectedIds(
  groups: RegistrationGroup[],
  initialGroupIds: number[],
): number[] {
  const validIds = initialGroupIds.filter((id) =>
    groups.some((g) => g.id === id && g.members.length > 0),
  );
  return validIds.length > 0
    ? validIds
    : groups.filter((g) => g.members.length > 0).map((g) => g.id);
}

export function GroupAnnouncementDialog({
  open,
  onOpenChange,
  groups,
  initialGroupIds,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groups: RegistrationGroup[];
  initialGroupIds: number[];
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && (
        <GroupAnnouncementDialogContent
          onOpenChange={onOpenChange}
          groups={groups}
          initialGroupIds={initialGroupIds}
        />
      )}
    </Dialog>
  );
}

function GroupAnnouncementDialogContent({
  onOpenChange,
  groups,
  initialGroupIds,
}: {
  onOpenChange: (open: boolean) => void;
  groups: RegistrationGroup[];
  initialGroupIds: number[];
}) {
  const sendAnnouncement = useNotifySupervisedGroups();
  const firstTemplate = ANNOUNCEMENT_TEMPLATES[0];

  const [selectedIds, setSelectedIds] = useState<number[]>(() =>
    getDefaultSelectedIds(groups, initialGroupIds),
  );
  const [activeTemplate, setActiveTemplate] = useState<string>(
    firstTemplate.id,
  );
  const [title, setTitle] = useState(firstTemplate.title);
  const [content, setContent] = useState(firstTemplate.content);
  const [sendNotification, setSendNotification] = useState(true);
  const [sendEmail, setSendEmail] = useState(true);

  const selectableGroups = useMemo(
    () => groups.filter((g) => g.members.length > 0),
    [groups],
  );

  const projectTypes = useMemo(() => {
    const map = new Map<number, { id: number; short: string; full: string }>();
    for (const g of selectableGroups) {
      if (!map.has(g.topic.projectType.id)) {
        const pt = formatProjectTypeShort(g.topic.projectType);
        map.set(g.topic.projectType.id, {
          id: g.topic.projectType.id,
          short: pt.short,
          full: pt.full,
        });
      }
    }
    return [...map.values()];
  }, [selectableGroups]);

  const recipientCount = useMemo(() => {
    const selectedSet = new Set(selectedIds);
    const uniqueUsers = new Set<number>();
    for (const g of selectableGroups) {
      if (!selectedSet.has(g.id)) continue;
      for (const m of g.members) {
        uniqueUsers.add(m.student.id);
      }
    }
    return uniqueUsers.size;
  }, [selectableGroups, selectedIds]);

  const allSelected =
    selectableGroups.length > 0 &&
    selectedIds.length === selectableGroups.length;

  function applyTemplate(templateId: string) {
    const tpl = ANNOUNCEMENT_TEMPLATES.find((t) => t.id === templateId);
    if (!tpl) return;
    setActiveTemplate(tpl.id);
    setTitle(tpl.title);
    setContent(tpl.content);
  }

  function toggleGroup(groupId: number, checked: boolean) {
    setSelectedIds((prev) =>
      checked
        ? prev.includes(groupId)
          ? prev
          : [...prev, groupId]
        : prev.filter((id) => id !== groupId),
    );
  }

  function toggleAll() {
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(selectableGroups.map((g) => g.id));
    }
  }

  function selectByProjectType(projectTypeId: number) {
    const matching = selectableGroups
      .filter((g) => g.topic.projectType.id === projectTypeId)
      .map((g) => g.id);
    setSelectedIds(matching);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (sendAnnouncement.isPending) return;

    const cleanTitle = title.trim();
    const cleanContent = content.trim();

    if (selectedIds.length === 0) {
      toast.error('Vui lòng chọn ít nhất một nhóm nhận thông báo.');
      return;
    }
    if (cleanTitle.length < 3) {
      toast.error('Tiêu đề cần tối thiểu 3 ký tự.');
      return;
    }
    if (cleanContent.length < 5) {
      toast.error('Nội dung cần tối thiểu 5 ký tự.');
      return;
    }
    if (!sendNotification && !sendEmail) {
      toast.error('Vui lòng chọn ít nhất một kênh gửi.');
      return;
    }

    try {
      const result = await sendAnnouncement.mutateAsync({
        groupIds: selectedIds,
        title: cleanTitle,
        content: cleanContent,
        sendNotification,
        sendEmail,
      });

      const parts: string[] = [];
      if (sendNotification) {
        parts.push(`${result.notificationsSent} thông báo`);
      }
      if (sendEmail) {
        parts.push(
          `${result.emailsSent}/${result.recipientCount} email`,
        );
      }

      if (result.emailsFailed > 0) {
        toast.warning(
          `Đã gửi ${parts.join(' · ')} (${result.emailsFailed} email chưa gửi được).`,
        );
      } else {
        toast.success(
          `Đã gửi tới ${result.recipientCount} sinh viên (${parts.join(' · ')}).`,
        );
      }
      onOpenChange(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Không thể gửi thông báo.',
      );
    }
  }

  const canSubmit =
    selectedIds.length > 0 &&
    recipientCount > 0 &&
    title.trim().length >= 3 &&
    content.trim().length >= 5 &&
    (sendNotification || sendEmail) &&
    !sendAnnouncement.isPending;

  return (
    <DialogContent className="sm:max-w-2xl p-6 gap-5 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold">
            <Mail className="size-4 text-primary" />
            <span>Gửi thông báo đến nhóm hướng dẫn</span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 1. Chọn nhóm nhận */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label className="text-sm font-semibold text-foreground">
                Nhóm nhận ({selectedIds.length}/{selectableGroups.length} nhóm ·{' '}
                <span className="text-primary">{recipientCount} sinh viên</span>)
              </Label>

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
                  {allSelected ? 'Bỏ chọn tất cả' : 'Tất cả'}
                </button>
                {projectTypes.length > 1 &&
                  projectTypes.map((pt) => (
                    <button
                      key={pt.id}
                      type="button"
                      title={pt.full}
                      onClick={() => selectByProjectType(pt.id)}
                      className="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    >
                      {pt.short}
                    </button>
                  ))}
              </div>
            </div>

            <div className="max-h-36 overflow-y-auto rounded-lg border border-border divide-y divide-border/70 bg-background/60">
              {selectableGroups.length === 0 ? (
                <p className="px-3 py-4 text-center text-xs text-muted-foreground">
                  Chưa có nhóm nào có sinh viên tham gia.
                </p>
              ) : (
                selectableGroups.map((group) => {
                  const checked = selectedIds.includes(group.id);
                  const pt = formatProjectTypeShort(group.topic.projectType);
                  const checkboxId = `notify-group-${group.id}`;

                  return (
                    <label
                      key={group.id}
                      htmlFor={checkboxId}
                      className={cn(
                        'flex items-center justify-between gap-3 px-3 py-2 text-sm cursor-pointer transition-colors',
                        checked
                          ? 'bg-primary/5 dark:bg-primary/10'
                          : 'hover:bg-muted/40',
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Checkbox
                          id={checkboxId}
                          checked={checked}
                          onCheckedChange={(val) => toggleGroup(group.id, val)}
                        />
                        <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
                          {pt.short}
                        </span>
                        <span className="truncate font-medium text-foreground">
                          {group.topic.title}
                        </span>
                      </div>
                      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                        {group.occupiedSeats} SV
                      </span>
                    </label>
                  );
                })
              )}
            </div>
          </div>

          {/* 2. Mẫu soạn nhanh */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-foreground">
              Mẫu nội dung
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {ANNOUNCEMENT_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => applyTemplate(tpl.id)}
                  className={cn(
                    'rounded-md border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer',
                    activeTemplate === tpl.id
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-card text-muted-foreground hover:text-foreground',
                  )}
                >
                  {tpl.label}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Tiêu đề */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label
                htmlFor="announcement-title"
                className="text-sm font-semibold text-foreground"
              >
                Tiêu đề
              </Label>
              <span className="text-xs tabular-nums text-muted-foreground">
                {title.length}/{TITLE_MAX}
              </span>
            </div>
            <Input
              id="announcement-title"
              value={title}
              maxLength={TITLE_MAX}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nhập tiêu đề thông báo..."
              className="h-10 text-sm"
            />
          </div>

          {/* 4. Nội dung */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label
                htmlFor="announcement-content"
                className="text-sm font-semibold text-foreground"
              >
                Nội dung
              </Label>
              <span className="text-xs tabular-nums text-muted-foreground">
                {content.length}/{CONTENT_MAX}
              </span>
            </div>
            <Textarea
              id="announcement-content"
              value={content}
              maxLength={CONTENT_MAX}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Nhập nội dung gửi tới sinh viên..."
              rows={6}
              className="min-h-36 text-sm leading-relaxed"
            />
          </div>

          {/* 5. Kênh gửi */}
          <div className="flex flex-wrap items-center gap-6 pt-1">
            <label
              htmlFor="channel-notif"
              className="flex items-center gap-2 text-sm font-medium text-foreground cursor-pointer"
            >
              <Checkbox
                id="channel-notif"
                checked={sendNotification}
                onCheckedChange={setSendNotification}
              />
              <span>Thông báo trên ProBase</span>
            </label>

            <label
              htmlFor="channel-email"
              className="flex items-center gap-2 text-sm font-medium text-foreground cursor-pointer"
            >
              <Checkbox
                id="channel-email"
                checked={sendEmail}
                onCheckedChange={setSendEmail}
              />
              <span>Gửi kèm Email (@dlu.edu.vn)</span>
            </label>
          </div>

          <DialogFooter className="-mx-6 -mb-6 px-6 py-4 gap-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={sendAnnouncement.isPending}
              className="h-10 px-4 text-sm cursor-pointer"
            >
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={!canSubmit}
              className="h-10 px-4 text-sm gap-2 cursor-pointer"
            >
              {sendAnnouncement.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
              <span>
                {recipientCount > 0
                  ? `Gửi tới ${recipientCount} sinh viên`
                  : 'Gửi thông báo'}
              </span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
  );
}

