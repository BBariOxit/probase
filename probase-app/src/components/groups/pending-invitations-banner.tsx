'use client';

import { useState } from 'react';
import { UserPlus, Loader2, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  useAcceptInvitation,
  useDeclineInvitation,
  useMyInvitations,
} from '@/lib/api/registration';
import type { GroupInvitation } from '@/lib/api/types';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';

export function PendingInvitationsBanner({
  hasCurrentGroup = false,
}: {
  hasCurrentGroup?: boolean;
}) {
  const { data: invitations, isPending } = useMyInvitations();
  const acceptMutation = useAcceptInvitation();
  const declineMutation = useDeclineInvitation();
  const [selectedToAccept, setSelectedToAccept] = useState<GroupInvitation | null>(null);

  if (isPending || !invitations || invitations.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {invitations.map((inv) => (
        <div
          key={inv.id}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-primary/30 bg-primary/5 dark:bg-primary/10 px-4 py-3.5 shadow-2xs"
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary dark:bg-primary/20 dark:text-blue-400">
              <UserPlus className="size-4.5" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-900 dark:text-neutral-100">
                Lời mời tham gia nhóm đề tài
              </p>
              <p className="text-xs text-slate-600 dark:text-neutral-300 leading-relaxed">
                Bạn nhận được lời mời tham gia nhóm đề tài{' '}
                <strong className="text-slate-900 dark:text-neutral-100 font-semibold">
                  &ldquo;{inv.topicTitle}&rdquo;
                </strong>{' '}
                từ trưởng nhóm <strong className="text-slate-900 dark:text-neutral-100 font-semibold">{inv.leaderName}</strong>.
                {hasCurrentGroup && (
                  <span className="text-amber-600 dark:text-amber-400 font-medium">
                    {' '}Nếu chấp nhận, bạn sẽ tự động rời khỏi nhóm hiện tại.
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            <Button
              variant="outline"
              size="sm"
              disabled={declineMutation.isPending || acceptMutation.isPending}
              onClick={async () => {
                try {
                  await declineMutation.mutateAsync(inv.groupId);
                  toast.success('Đã từ chối lời mời.');
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : 'Không thể từ chối lời mời');
                }
              }}
              className="h-8.5 px-3 text-xs font-semibold"
            >
              <X className="size-3.5 mr-1" />
              Từ chối
            </Button>

            <Button
              size="sm"
              disabled={declineMutation.isPending || acceptMutation.isPending}
              onClick={() => setSelectedToAccept(inv)}
              className="h-8.5 px-3.5 text-xs font-semibold bg-primary hover:bg-primary/90 text-white shadow-xs cursor-pointer"
            >
              {acceptMutation.isPending ? (
                <Loader2 className="size-3.5 animate-spin mr-1" />
              ) : (
                <Check className="size-3.5 mr-1" />
              )}
              Chấp nhận
            </Button>
          </div>
        </div>
      ))}

      <ConfirmDialog
        open={selectedToAccept !== null}
        onOpenChange={(open) => !open && setSelectedToAccept(null)}
        title="Tham gia nhóm đề tài"
        confirmVariant="default"
        description={
          selectedToAccept ? (
            <div className="space-y-3 pt-1 text-left text-sm">
              <div>
                <span className="text-xs text-slate-500 dark:text-neutral-400">Đề tài mới:</span>
                <p className="font-semibold text-slate-900 dark:text-neutral-100">
                  {selectedToAccept.topicTitle}
                </p>
              </div>
              <div>
                <span className="text-xs text-slate-500 dark:text-neutral-400">Trưởng nhóm:</span>
                <p className="text-xs font-medium text-slate-700 dark:text-neutral-300">
                  {selectedToAccept.leaderName}
                </p>
              </div>
              {hasCurrentGroup && (
                <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                  Bạn sẽ tự động rời khỏi nhóm đề tài hiện tại khi tham gia nhóm mới.
                </p>
              )}
            </div>
          ) : ''
        }
        confirmLabel={acceptMutation.isPending ? 'Đang tham gia...' : 'Xác nhận tham gia'}
        onConfirm={async () => {
          if (!selectedToAccept) return;
          try {
            await acceptMutation.mutateAsync(selectedToAccept.groupId);
            toast.success(`Đã tham gia nhóm đề tài "${selectedToAccept.topicTitle}" thành công!`);
            setSelectedToAccept(null);
          } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Không thể tham gia nhóm');
          }
        }}
      />
    </div>
  );
}
