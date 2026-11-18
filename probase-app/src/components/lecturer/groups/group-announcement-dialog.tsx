'use client';

import { useMemo, useState } from 'react';
import { Loader2, Mail, Send } from 'lucide-react';
import { toast } from 'sonner';
import { useNotifySupervisedGroups } from '@/lib/api/registration';
import type { RegistrationGroup } from '@/lib/api/types';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ANNOUNCEMENT_TEMPLATES } from './announcement-templates';
import { GroupRecipientPicker } from './group-recipient-picker';

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

  function applyTemplate(templateId: string) {
    const tpl = ANNOUNCEMENT_TEMPLATES.find((t) => t.id === templateId);
    if (!tpl) return;
    setActiveTemplate(tpl.id);
    setTitle(tpl.title);
    setContent(tpl.content);
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
        parts.push(`${result.emailsSent}/${result.recipientCount} email`);
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
        <GroupRecipientPicker
          groups={selectableGroups}
          selectedIds={selectedIds}
          recipientCount={recipientCount}
          onChangeSelectedIds={setSelectedIds}
        />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
          <div className="space-y-1.5 sm:col-span-4">
            <Label
              htmlFor="announcement-template"
              className="text-sm font-semibold text-foreground"
            >
              Mẫu nội dung
            </Label>
            <Select
              value={activeTemplate}
              onValueChange={(val) => applyTemplate(val as string)}
            >
              <SelectTrigger
                id="announcement-template"
                className="h-10 w-full text-sm"
              >
                <SelectValue>
                  {(val) => {
                    const found = ANNOUNCEMENT_TEMPLATES.find(
                      (t) => t.id === val,
                    );
                    return found ? found.label : 'Chọn mẫu';
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="z-[60]">
                {ANNOUNCEMENT_TEMPLATES.map((tpl) => (
                  <SelectItem
                    key={tpl.id}
                    value={tpl.id}
                    className="text-sm"
                  >
                    {tpl.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 sm:col-span-8">
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
        </div>

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
            rows={7}
            className="min-h-40 text-sm leading-relaxed"
          />
        </div>

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
