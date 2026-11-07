'use client';

import { useState } from 'react';
import {
  Check,
  Heart,
  Loader2,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Send,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  useCreateProposalComment,
  useDeleteProposalComment,
  useToggleProposalCommentReaction,
  useUpdateProposalComment,
} from '@/lib/api/proposals';
import type { ProposalComment, TopicProposal } from '@/lib/api/types';
import { useSession } from '@/lib/auth/session';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { UserAvatar } from '@/components/shared/user-avatar';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

const dateTimeFormat = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

interface ProposalCommentThreadProps {
  proposal: TopicProposal;
  readOnly?: boolean;
}

export function ProposalCommentThread({
  proposal,
  readOnly = false,
}: ProposalCommentThreadProps) {
  const [content, setContent] = useState('');
  const currentUser = useSession((s) => s.user);

  const createComment = useCreateProposalComment();
  const updateComment = useUpdateProposalComment();
  const deleteComment = useDeleteProposalComment();
  const toggleReaction = useToggleProposalCommentReaction();

  const isClosed =
    proposal.status === 'ACCEPTED' || proposal.status === 'REJECTED';
  const comments = proposal.comments ?? [];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed) return;

    try {
      await createComment.mutateAsync({
        id: proposal.id,
        content: trimmed,
      });
      setContent('');
      toast.success('Đã gửi nhận xét thành công');
    } catch (err) {
      toast.error((err as Error).message || 'Không thể gửi nhận xét');
    }
  }

  async function handleUpdateComment(commentId: number, newContent: string) {
    try {
      await updateComment.mutateAsync({
        proposalId: proposal.id,
        commentId,
        content: newContent,
      });
      toast.success('Đã cập nhật nhận xét');
    } catch (err) {
      toast.error((err as Error).message || 'Không thể cập nhật nhận xét');
      throw err;
    }
  }

  async function handleDeleteComment(commentId: number) {
    try {
      await deleteComment.mutateAsync({
        proposalId: proposal.id,
        commentId,
      });
      toast.success('Đã xóa nhận xét');
    } catch (err) {
      toast.error((err as Error).message || 'Không thể xóa nhận xét');
      throw err;
    }
  }

  async function handleToggleReaction(commentId: number) {
    try {
      await toggleReaction.mutateAsync({
        proposalId: proposal.id,
        commentId,
      });
    } catch (err) {
      toast.error((err as Error).message || 'Không thể thả tim');
    }
  }

  return (
    <div className="space-y-4 rounded-xl border bg-card/60 p-4 shadow-xs">
      <div className="flex items-center justify-between border-b pb-3">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <MessageSquare className="size-4" />
          </div>
          <h4 className="text-sm font-semibold tracking-tight">
            Trao đổi & Góp ý
          </h4>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            {comments.length}
          </span>
        </div>
        <p className="text-xs text-muted-foreground hidden sm:block">
          Thảo luận trực tiếp giữa SV và GVHD
        </p>
      </div>

      {comments.length === 0 ? (
        <div className="py-6 text-center text-xs text-muted-foreground">
          Chưa có nhận xét nào. Thầy/Cô hoặc Sinh viên có thể gửi trao đổi trực tiếp tại đây.
        </div>
      ) : (
        <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              currentUserId={currentUser?.id}
              isClosed={readOnly || isClosed}
              onUpdate={handleUpdateComment}
              onDelete={handleDeleteComment}
              onToggleReaction={handleToggleReaction}
              isUpdating={updateComment.isPending}
              isDeleting={deleteComment.isPending}
              isReacting={toggleReaction.isPending}
            />
          ))}
        </div>
      )}

      {!readOnly && !isClosed && (
        <form onSubmit={handleSubmit} className="space-y-2 pt-2 border-t">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Nhập nhận xét, câu hỏi hoặc trao đổi thêm về đề xuất..."
            rows={2}
            className="text-sm resize-none"
            disabled={createComment.isPending}
          />
          <div className="flex justify-end">
            <Button
              type="submit"
              size="sm"
              disabled={!content.trim() || createComment.isPending}
              className="gap-1.5"
            >
              {createComment.isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Send className="size-3.5" />
              )}
              Gửi nhận xét
            </Button>
          </div>
        </form>
      )}

      {isClosed && (
        <p className="text-center text-xs text-muted-foreground/80 italic pt-1 border-t">
          Đề xuất này đã được chốt kết quả ({proposal.status === 'ACCEPTED' ? 'Đã duyệt' : 'Từ chối'}), không thể gửi thêm trao đổi.
        </p>
      )}
    </div>
  );
}

function CommentItem({
  comment,
  currentUserId,
  isClosed,
  onUpdate,
  onDelete,
  onToggleReaction,
  isUpdating,
  isReacting,
}: {
  comment: ProposalComment;
  currentUserId?: number;
  isClosed: boolean;
  onUpdate: (commentId: number, content: string) => Promise<void>;
  onDelete: (commentId: number) => Promise<void>;
  onToggleReaction: (commentId: number) => Promise<void>;
  isUpdating: boolean;
  isDeleting: boolean;
  isReacting: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isLecturer = comment.author.role === 'LECTURER';
  const isOwner =
    currentUserId != null &&
    (comment.authorId === currentUserId || comment.author.id === currentUserId);

  const reactions = comment.reactions ?? [];
  const hasReacted =
    currentUserId != null && reactions.some((r) => r.userId === currentUserId);

  const isEdited =
    comment.updatedAt &&
    Math.abs(
      new Date(comment.updatedAt).getTime() -
        new Date(comment.createdAt).getTime(),
    ) > 2000;

  async function handleSaveEdit() {
    const trimmed = editContent.trim();
    if (!trimmed || trimmed === comment.content) {
      setIsEditing(false);
      return;
    }
    try {
      await onUpdate(comment.id, trimmed);
      setIsEditing(false);
    } catch {
      // toast shown in parent
    }
  }

  function handleCancelEdit() {
    setEditContent(comment.content);
    setIsEditing(false);
  }

  // Tạo nội dung tooltip khi hover vào badge thả tim
  const reactionTooltip = (() => {
    if (reactions.length === 0) return '';
    const otherUsers = reactions
      .filter((r) => r.userId !== currentUserId)
      .map((r) => r.user.fullName);

    if (hasReacted) {
      if (otherUsers.length === 0) return 'Bạn đã thả tim';
      if (otherUsers.length === 1) return `Bạn và ${otherUsers[0]} đã thả tim`;
      return `Bạn, ${otherUsers[0]} và ${otherUsers.length - 1} người khác đã thả tim`;
    }
    if (otherUsers.length === 1) return `${otherUsers[0]} đã thả tim`;
    if (otherUsers.length === 2)
      return `${otherUsers[0]} và ${otherUsers[1]} đã thả tim`;
    return `${otherUsers[0]}, ${otherUsers[1]} và ${otherUsers.length - 2} người khác đã thả tim`;
  })();

  return (
    <div className="group relative flex gap-2.5 text-xs">
      <UserAvatar
        name={comment.author.fullName}
        src={comment.author.avatarUrl}
        className="size-7 shrink-0 mt-0.5"
      />
      <div className="min-w-0 flex-1 space-y-1">
        {/* Header thông tin người gửi & ngày giờ */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-semibold text-foreground">
            {comment.author.fullName}
          </span>
          <span
            className={cn(
              'rounded px-1.5 py-0.2 text-[10px] font-medium leading-normal',
              isLecturer
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                : 'bg-muted text-muted-foreground',
            )}
          >
            {isLecturer ? 'GVHD' : 'Sinh viên'}
          </span>
          <span className="text-[11px] text-muted-foreground/70">
            {dateTimeFormat.format(new Date(comment.createdAt))}
          </span>
          {isEdited && (
            <span className="text-[10px] text-muted-foreground/60 italic">
              (đã chỉnh sửa)
            </span>
          )}
        </div>

        {/* Khung nội dung bình luận hoặc ô sửa tại chỗ */}
        {isEditing ? (
          <div className="rounded-lg border bg-background p-2.5 space-y-2 shadow-xs">
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSaveEdit();
                } else if (e.key === 'Escape') {
                  handleCancelEdit();
                }
              }}
              rows={2}
              className="text-xs resize-none min-h-[50px] p-2"
              autoFocus
              disabled={isUpdating}
            />
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground hidden sm:inline">
                Enter để lưu, Esc để hủy
              </span>
              <div className="flex items-center gap-1.5 justify-end w-full sm:w-auto">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleCancelEdit}
                  disabled={isUpdating}
                  className="h-7 px-2 text-xs"
                >
                  Hủy
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSaveEdit}
                  disabled={isUpdating || !editContent.trim()}
                  className="h-7 px-2.5 text-xs gap-1"
                >
                  {isUpdating ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <Check className="size-3" />
                  )}
                  Lưu
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="relative group/bubble inline-block min-w-[120px] max-w-full">
            {/* Bong bóng nội dung */}
            <div className="rounded-lg bg-muted/50 p-2.5 pr-8 text-foreground leading-relaxed whitespace-pre-wrap break-words">
              {comment.content}
            </div>

            {/* Quick Action Bar nổi khi hover vào tin nhắn */}
            {!isClosed && (
              <div className="absolute top-1 right-1 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 group-hover/bubble:opacity-100 transition-opacity bg-background/95 backdrop-blur-xs border shadow-2xs rounded-md px-0.5 py-0.5 z-10">
                {/* Nút thả tim nhanh */}
                <button
                  type="button"
                  onClick={() => onToggleReaction(comment.id)}
                  disabled={isReacting}
                  title={hasReacted ? 'Bỏ thả tim' : 'Thả tim'}
                  className={cn(
                    'p-1 rounded hover:bg-muted transition-colors cursor-pointer',
                    hasReacted
                      ? 'text-rose-500'
                      : 'text-muted-foreground hover:text-rose-500',
                  )}
                >
                  <Heart
                    className={cn('size-3.5', hasReacted && 'fill-rose-500')}
                  />
                </button>

                {/* Nút 3 chấm (Chỉ dành cho chính chủ người gửi) */}
                {isOwner && (
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer outline-none"
                      title="Tùy chọn khác"
                    >
                      <MoreHorizontal className="size-3.5" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      side="bottom"
                      className="w-32 text-xs"
                    >
                      <DropdownMenuItem
                        onClick={() => {
                          setEditContent(comment.content);
                          setIsEditing(true);
                        }}
                        className="cursor-pointer gap-2"
                      >
                        <Pencil className="size-3.5 text-muted-foreground" />
                        <span>Chỉnh sửa</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setConfirmDelete(true)}
                        className="cursor-pointer gap-2 text-destructive focus:text-destructive focus:bg-destructive/10"
                      >
                        <Trash2 className="size-3.5" />
                        <span>Xóa</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            )}

            {/* Reaction Pill / Badge hiển thị ở dưới bóng tin nhắn */}
            {reactions.length > 0 && (
              <div className="flex items-center gap-1 mt-1">
                <button
                  type="button"
                  onClick={() => !isClosed && onToggleReaction(comment.id)}
                  disabled={isClosed || isReacting}
                  title={reactionTooltip}
                  className={cn(
                    'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[10.5px] font-medium transition-all',
                    isClosed
                      ? 'cursor-default'
                      : 'cursor-pointer hover:scale-105 active:scale-95',
                    hasReacted
                      ? 'bg-rose-50 border-rose-200 text-rose-600 dark:bg-rose-950/40 dark:border-rose-900/60 dark:text-rose-400 shadow-2xs'
                      : 'bg-muted/70 hover:bg-muted border-transparent text-muted-foreground',
                  )}
                >
                  <Heart
                    className={cn(
                      'size-3',
                      hasReacted
                        ? 'fill-rose-500 text-rose-500'
                        : 'text-muted-foreground',
                    )}
                  />
                  <span>{reactions.length}</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Popup xác nhận xóa */}
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Xóa nhận xét?"
        description="Nhận xét này sẽ bị xóa vĩnh viễn khỏi cuộc thảo luận."
        confirmLabel="Xóa nhận xét"
        onConfirm={async () => {
          await onDelete(comment.id);
        }}
      />
    </div>
  );
}
