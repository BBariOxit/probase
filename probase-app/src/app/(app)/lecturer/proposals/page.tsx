'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Check, FileText, Inbox, Loader2, MessageSquareCode, X } from 'lucide-react';
import { useProposals } from '@/lib/api/proposals';
import type {
  ProposalStatus,
  TopicProposal,
} from '@/lib/api/types';
import { useRequireRole } from '@/lib/auth/use-require-role';
import { EmptyState } from '@/components/shared/empty-state';
import { PaginationBar } from '@/components/shared/pagination-bar';
import {
  AcceptProposalDialog,
  RejectProposalDialog,
} from '@/components/proposals/proposal-answer-dialogs';
import { ProposalCard } from '@/components/proposals/proposal-card';
import { UserAvatar } from '@/components/shared/user-avatar';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DEFAULT_PAGE_SIZE } from '@/constants/pagination.constant';
import { PROPOSAL_STATUS_FILTERS } from '@/constants/status.constant';
import { usePagination } from '@/hooks';

function LecturerProposalsContent() {
  const allowed = useRequireRole('LECTURER');
  const router = useRouter();
  const searchParams = useSearchParams();
  const targetIdParam = searchParams.get('id');
  const targetProposalId = targetIdParam ? Number(targetIdParam) : null;

  useEffect(() => {
    if (targetProposalId) {
      router.replace(`/lecturer/proposals/${targetProposalId}`);
    }
  }, [targetProposalId, router]);

  const [status, setStatus] = useState<ProposalStatus | 'ALL'>('PENDING');
  const { page, setPage, resetPage } = usePagination({
    initialPageSize: DEFAULT_PAGE_SIZE,
  });

  const { data, isPending, error } = useProposals({
    status: status === 'ALL' ? undefined : status,
    page,
    limit: DEFAULT_PAGE_SIZE,
  });

  if (!allowed) return null;

  const proposals = data?.items ?? [];

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      {/* Header & Filter toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#18181b] p-4 rounded-xl border border-slate-300 dark:border-neutral-700 shadow-xs">
        <div className="flex items-center gap-2.5">
          <h1 className="font-heading text-base sm:text-lg font-bold text-slate-900 dark:text-neutral-100 tracking-tight">
            Đề xuất từ sinh viên
          </h1>
          {data && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 border border-slate-200 dark:border-neutral-700">
              {data.total}
            </span>
          )}
        </div>

        <div className="w-full sm:w-64">
          <Select
            value={status}
            onValueChange={(value) => {
              setStatus(value as ProposalStatus | 'ALL');
              resetPage();
            }}
          >
            <SelectTrigger
              className="w-full border-slate-300 dark:border-neutral-700 bg-white dark:bg-neutral-900"
              aria-label="Lọc theo trạng thái"
            >
              <SelectValue>
                {(value) =>
                  PROPOSAL_STATUS_FILTERS.find((option) => option.value === value)
                    ?.label
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {PROPOSAL_STATUS_FILTERS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {error && (
        <p className="text-sm text-destructive">Không tải được đề xuất.</p>
      )}

      {isPending && (
        <div className="flex justify-center py-16">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {!isPending && proposals.length === 0 && (
        <div className="rounded-xl border border-slate-300 dark:border-neutral-700 bg-white dark:bg-[#18181b]">
          <EmptyState
            icon={Inbox}
            title={
              status === 'PENDING'
                ? 'Không còn đề xuất nào chờ bạn trả lời.'
                : 'Chưa có đề xuất nào ở trạng thái này.'
            }
            action={
              status === 'PENDING' ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setStatus('ALL');
                    setPage(1);
                  }}
                >
                  Xem tất cả đề xuất
                </Button>
              ) : undefined
            }
          />
        </div>
      )}

      <ul className="space-y-3.5">
        {proposals.map((proposal) => (
          <li key={proposal.id}>
            <ReceivedProposal proposal={proposal} />
          </li>
        ))}
      </ul>

      {data && (
        <PaginationBar
          page={data.page}
          totalPages={data.totalPages}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}

export default function LecturerProposalsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-16">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <LecturerProposalsContent />
    </Suspense>
  );
}

function ReceivedProposal({ proposal }: { proposal: TopicProposal }) {
  const router = useRouter();
  const [answering, setAnswering] = useState<'accept' | 'reject' | null>(null);
  const student = proposal.student;

  return (
    <>
      <ProposalCard
        proposal={proposal}
        titleHref={`/lecturer/proposals/${proposal.id}`}
        onClick={() => router.push(`/lecturer/proposals/${proposal.id}`)}
        counterparty={
          <span className="inline-flex items-center gap-2">
            <UserAvatar
              name={student.fullName}
              src={student.avatarUrl}
              className="size-5 text-[10px] shrink-0"
            />
            <span className="font-semibold text-slate-800 dark:text-neutral-200">
              {student.fullName}
            </span>
            <span className="font-mono text-xs text-slate-600 dark:text-neutral-400">
              {student.studentCode}
            </span>
            {student.class && (
              <>
                <span className="text-slate-300 dark:text-neutral-700" aria-hidden="true">•</span>
                <span className="text-slate-500 dark:text-neutral-400">{student.class}</span>
              </>
            )}
          </span>
        }
        footer={<Outcome proposal={proposal} />}
        actions={
          proposal.status === 'PENDING' ||
          proposal.status === 'NEEDS_REVISION' ? (
            <>
              <Button
                size="sm"
                onClick={() => setAnswering('accept')}
                className="gap-1.5 cursor-pointer font-medium shadow-xs"
              >
                <Check className="size-4" />
                Nhận hướng dẫn
              </Button>
              <Button
                variant="outline"
                size="sm"
                render={<Link href={`/lecturer/proposals/${proposal.id}`} />}
                className="gap-1.5 font-medium shadow-xs cursor-pointer border-slate-300 dark:border-neutral-700 text-slate-700 dark:text-neutral-200 hover:bg-slate-100 dark:hover:bg-neutral-800"
              >
                <MessageSquareCode className="size-4" />
                Xem & Nhận xét
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAnswering('reject')}
                className="gap-1.5 cursor-pointer font-medium shadow-xs border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-700 dark:hover:text-rose-300"
              >
                <X className="size-4" />
                Từ chối
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              render={<Link href={`/lecturer/proposals/${proposal.id}`} />}
              className="gap-1.5 font-medium shadow-xs cursor-pointer border-slate-300 dark:border-neutral-700 text-slate-700 dark:text-neutral-200 hover:bg-slate-100 dark:hover:bg-neutral-800"
            >
              <FileText className="size-4" />
              Xem chi tiết
            </Button>
          )
        }
      />

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
    </>
  );
}

function Outcome({ proposal }: { proposal: TopicProposal }) {
  if (proposal.status === 'REJECTED' && proposal.lecturerFeedback) {
    return (
      <div className="rounded-lg border border-rose-200/70 dark:border-rose-900/40 bg-rose-50/50 dark:bg-rose-950/20 p-3 text-xs">
        <span className="font-semibold text-rose-700 dark:text-rose-400">
          Lý do từ chối:{' '}
        </span>
        <span className="text-slate-700 dark:text-neutral-300 whitespace-pre-line break-words">
          {proposal.lecturerFeedback}
        </span>
      </div>
    );
  }

  if (proposal.status !== 'ACCEPTED' || !proposal.convertedTopic) return null;

  return (
    <div className="rounded-lg border border-emerald-200/70 dark:border-emerald-900/40 bg-emerald-50/50 dark:bg-emerald-950/20 p-3 text-xs text-slate-700 dark:text-neutral-300">
      <span className="font-semibold text-emerald-700 dark:text-emerald-400">
        Đã tạo đề tài từ đề xuất này.{' '}
      </span>
      <Link
        href={`/lecturer/topics/${proposal.convertedTopic.id}`}
        className="font-medium text-primary underline underline-offset-4 hover:no-underline"
      >
        Mở đề tài
      </Link>
      {proposal.convertedTopic.status === 'DRAFT'
        ? ' — đang ở bản nháp, hãy gửi Bộ môn thẩm định.'
        : proposal.convertedTopic.status === 'PENDING_DEPARTMENT' ||
            proposal.convertedTopic.status === 'PENDING'
          ? ' — đang chờ Bộ môn duyệt.'
          : proposal.convertedTopic.status === 'APPROVED'
            ? ' — Bộ môn đã duyệt, chờ Giáo vụ mở đăng ký.'
            : '.'}
    </div>
  );
}
