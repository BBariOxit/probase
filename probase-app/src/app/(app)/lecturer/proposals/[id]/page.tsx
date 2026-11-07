'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  CalendarDays,
  Check,
  FileText,
  Layers,
  Loader2,
  Target,
  User,
  X,
} from 'lucide-react';
import { useProposal } from '@/lib/api/proposals';
import { useRequireRole } from '@/lib/auth/use-require-role';
import { useBreadcrumbLabel } from '@/lib/breadcrumb-context';
import { ProposalAttachments } from '@/components/proposals/proposal-attachments';
import { ProposalCommentThread } from '@/components/proposals/proposal-comment-thread';
import { ProposalStatusBadge } from '@/components/proposals/proposal-card';
import {
  AcceptProposalDialog,
  RejectProposalDialog,
} from '@/components/proposals/proposal-answer-dialogs';
import { UserAvatar } from '@/components/shared/user-avatar';
import { Button } from '@/components/ui/button';

const dateFormat = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

export default function LecturerProposalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const allowed = useRequireRole('LECTURER');
  const router = useRouter();
  const proposalId = Number(id);
  const { data: proposal, isPending, error } = useProposal(proposalId);
  const [answering, setAnswering] = useState<'accept' | 'reject' | null>(null);

  useBreadcrumbLabel(id, proposal?.title);

  if (!allowed) return null;

  if (isPending) {
    return (
      <div className="max-w-4xl space-y-4">
        <Button
          variant="default"
          size="sm"
          render={<Link href="/lecturer/proposals" />}
          className="gap-2 cursor-pointer shadow-xs font-semibold"
        >
          <ArrowLeft className="size-4" /> Quay lại danh sách đề xuất
        </Button>
        <div className="flex justify-center py-16">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (error || !proposal) {
    return (
      <div className="max-w-4xl space-y-4">
        <Button
          variant="default"
          size="sm"
          render={<Link href="/lecturer/proposals" />}
          className="gap-2 cursor-pointer shadow-xs font-semibold"
        >
          <ArrowLeft className="size-4" /> Quay lại danh sách đề xuất
        </Button>
        <p className="text-sm text-destructive font-medium">
          Không tìm thấy đề xuất hoặc bạn không có quyền xem đề xuất này.
        </p>
      </div>
    );
  }

  const student = proposal.student;
  const isPendingStatus = proposal.status === 'PENDING';

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Thanh điều hướng & nút duyệt / từ chối */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          variant="default"
          size="sm"
          render={<Link href="/lecturer/proposals" />}
          className="gap-2 cursor-pointer shadow-xs font-semibold"
        >
          <ArrowLeft className="size-4" /> Quay lại danh sách đề xuất
        </Button>

        {isPendingStatus && (
          <div className="flex items-center gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={() => setAnswering('accept')}
              className="gap-1.5 cursor-pointer font-semibold shadow-xs bg-primary text-white hover:bg-primary/90"
            >
              <Check className="size-4" />
              <span>Nhận hướng dẫn</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAnswering('reject')}
              className="gap-1.5 cursor-pointer font-semibold shadow-xs text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
            >
              <X className="size-4" />
              <span>Từ chối</span>
            </Button>
          </div>
        )}
      </div>

      {/* Thẻ chi tiết đề tài đề xuất */}
      <article className="rounded-2xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#1e1e1e] shadow-xs overflow-hidden">
        {/* Header thông tin sinh viên & đề tài */}
        <div className="p-6 sm:p-8 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <ProposalStatusBadge status={proposal.status} />
              <span className="text-muted-foreground">•</span>
              <span className="font-medium text-muted-foreground">
                {proposal.projectType.name}
              </span>
              <span className="text-muted-foreground">•</span>
              <div className="inline-flex items-center gap-1.5 font-medium text-slate-700 dark:text-neutral-300">
                <UserAvatar
                  name={student.fullName}
                  src={student.avatarUrl}
                  className="size-5 text-[10px]"
                />
                <span>{student.fullName}</span>
                <span className="font-mono text-primary font-semibold text-xs">
                  {student.studentCode}
                </span>
                {student.class && (
                  <span className="text-muted-foreground">· {student.class}</span>
                )}
              </div>
            </div>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold font-heading text-slate-900 dark:text-neutral-50 tracking-tight leading-snug">
            {proposal.title}
          </h1>

          <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5 font-medium">
              <CalendarDays className="size-3.5" />
              Ngày gửi: {dateFormat.format(new Date(proposal.createdAt))}
            </span>
          </div>
        </div>

        {/* Nội dung chi tiết các phần */}
        <div className="p-6 sm:p-8 pt-0 space-y-6">
          <div className="rounded-xl border border-slate-100 dark:border-neutral-800/80 bg-slate-50/50 dark:bg-neutral-900/40 p-5 space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <FileText className="size-4 text-primary" />
              Mô tả nội dung yêu cầu
            </h3>
            <div className="text-sm sm:text-base leading-relaxed text-slate-800 dark:text-neutral-200 whitespace-pre-line text-justify font-normal">
              {proposal.description || 'Chưa có mô tả chi tiết.'}
            </div>
          </div>

          <div className="rounded-xl border border-slate-100 dark:border-neutral-800/80 bg-slate-50/50 dark:bg-neutral-900/40 p-5 space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Target className="size-4 text-emerald-600 dark:text-emerald-400" />
              Yêu cầu đầu ra & Mục tiêu
            </h3>
            <div className="text-sm sm:text-base leading-relaxed text-slate-800 dark:text-neutral-200 whitespace-pre-line text-justify font-normal">
              {proposal.expectedOutcomes || 'Chưa có yêu cầu đầu ra cụ thể.'}
            </div>
          </div>

          <div className="rounded-xl border border-slate-100 dark:border-neutral-800/80 bg-slate-50/50 dark:bg-neutral-900/40 p-5 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Layers className="size-4 text-amber-500" />
              Tài liệu & Hình ảnh đính kèm ({proposal.attachments?.length ?? 0})
            </h3>
            <ProposalAttachments
              attachments={proposal.attachments ?? []}
              canManage={false}
            />
          </div>
        </div>
      </article>

      {/* Phần nhận xét, trao đổi và góp ý ở cuối trang */}
      <section className="space-y-3">
        <ProposalCommentThread proposal={proposal} />
      </section>

      {/* Hộp thoại nhận hướng dẫn / từ chối */}
      {answering === 'accept' && (
        <AcceptProposalDialog
          proposal={proposal}
          open
          onOpenChange={(open) => !open && setAnswering(null)}
        />
      )}
      {answering === 'reject' && (
        <RejectProposalDialog
          proposal={proposal}
          open
          onOpenChange={(open) => !open && setAnswering(null)}
        />
      )}
    </div>
  );
}
