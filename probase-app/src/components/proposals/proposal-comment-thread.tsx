'use client';

import { useState } from 'react';
import { Loader2, MessageSquare, Send } from 'lucide-react';
import { toast } from 'sonner';
import { useCreateProposalComment } from '@/lib/api/proposals';
import type { ProposalComment, TopicProposal } from '@/lib/api/types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { UserAvatar } from '@/components/shared/user-avatar';
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
  const createComment = useCreateProposalComment();
  const isClosed = proposal.status !== 'PENDING';
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
        <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
          {comments.map((comment) => (
            <CommentItem key={comment.id} comment={comment} />
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

function CommentItem({ comment }: { comment: ProposalComment }) {
  const isLecturer = comment.author.role === 'LECTURER';

  return (
    <div className="flex gap-2.5 text-xs">
      <UserAvatar
        name={comment.author.fullName}
        src={comment.author.avatarUrl}
        className="size-7 shrink-0 mt-0.5"
      />
      <div className="min-w-0 flex-1 space-y-1">
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
        </div>
        <div className="rounded-lg bg-muted/50 p-2.5 text-foreground leading-relaxed whitespace-pre-wrap">
          {comment.content}
        </div>
      </div>
    </div>
  );
}
