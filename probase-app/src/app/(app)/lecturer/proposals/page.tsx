'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Check, FileText, Inbox, Loader2, MessageSquareCode, X } from 'lucide-react';
import { useMyProfile } from '@/lib/api/me';
import { useProposals } from '@/lib/api/proposals';
import type {
  MentoringLoad,
  ProposalStatus,
  TopicProposal,
} from '@/lib/api/types';
import { useRequireRole } from '@/lib/auth/use-require-role';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/shared/empty-state';
import { PageWithRail } from '@/components/layout/page-with-rail';
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

  const { data: profile } = useMyProfile();
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
  const mentoring = profile?.lecturer?.mentoring;

  return (
    <PageWithRail
      rail={
        <>
          <Select
            value={status}
            onValueChange={(value) => {
              setStatus(value as ProposalStatus | 'ALL');
              resetPage();
            }}
          >
            <SelectTrigger className="w-full" aria-label="Lọc theo trạng thái">
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

          {mentoring && <MentoringLoadCard load={mentoring} />}
        </>
      }
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-heading text-sm font-semibold tracking-tight">
          Đề xuất từ sinh viên
        </h2>
        {data && (
          <span className="text-sm text-muted-foreground">
            {data.total} đề xuất
          </span>
        )}
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
        <div className="rounded-xl border">
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

      <ul className="space-y-3">
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
    </PageWithRail>
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

function MentoringLoadCard({ load }: { load: MentoringLoad }) {
  return (
    <section
      className={cn(
        'space-y-1 rounded-xl border bg-card px-4 py-3',
        load.atQuota && 'border-status-waiting/40 bg-status-waiting-bg/30',
      )}
    >
      <h3 className="text-xs font-medium text-muted-foreground">
        Hạn mức hướng dẫn
      </h3>
      <p className="text-sm">
        <span className="font-medium tabular-nums">
          {load.groups}
          {load.quota !== null && `/${load.quota}`}
        </span>{' '}
        nhóm đang hướng dẫn
      </p>
      {load.reserved > 0 && (
        <p className="text-xs text-muted-foreground">
          {load.reserved} đề tài đã nhận, đang chờ sinh viên đăng ký
        </p>
      )}
      {load.atQuota && (
        <p className="text-xs text-pretty">
          Đã đủ hạn mức, nên chưa nhận thêm đề xuất được. Bạn vẫn trả lời kèm
          nhận xét được, hoặc đề nghị khoa nâng hạn mức.
        </p>
      )}
    </section>
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
          <span className="inline-flex items-center gap-1.5">
            <UserAvatar
              name={student.fullName}
              src={student.avatarUrl}
              className="size-5 text-[10px]"
            />
            <span className="text-foreground">{student.fullName}</span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-flex items-center rounded border border-primary/20 bg-primary/10 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-primary">
                {student.studentCode}
              </span>
              {student.class && <span>· {student.class}</span>}
            </span>
          </span>
        }
        footer={<Outcome proposal={proposal} />}
        actions={
          proposal.status === 'PENDING' ||
          proposal.status === 'NEEDS_REVISION' ? (
            <>
              <Button size="sm" onClick={() => setAnswering('accept')} className="gap-1 cursor-pointer">
                <Check className="size-4" />
                Nhận hướng dẫn
              </Button>
              <Button
                variant="outline"
                size="sm"
                render={<Link href={`/lecturer/proposals/${proposal.id}`} />}
                className="gap-1.5 font-semibold shadow-xs cursor-pointer"
              >
                <MessageSquareCode className="size-4" />
                Xem & Nhận xét
              </Button>
              <Button
                size="sm"
                onClick={() => setAnswering('reject')}
                className="gap-1.5 cursor-pointer font-semibold shadow-xs bg-rose-600 text-white hover:bg-rose-700 dark:bg-rose-600 dark:hover:bg-rose-700 dark:text-white"
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
              className="gap-1.5 font-semibold shadow-xs cursor-pointer"
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
      <section className="space-y-1 rounded-lg border bg-muted/40 px-3 py-2.5">
        <h3 className="text-xs font-medium text-muted-foreground">
          Lý do từ chối
        </h3>
        <p className="text-sm whitespace-pre-line break-words">
          {proposal.lecturerFeedback}
        </p>
      </section>
    );
  }

  if (proposal.status !== 'ACCEPTED' || !proposal.convertedTopic) return null;

  return (
    <p className="rounded-lg border border-status-success/25 bg-status-success-bg/40 px-3 py-2.5 text-sm">
      Đã tạo đề tài từ đề xuất này.{' '}
      <Link
        href={`/lecturer/topics/${proposal.convertedTopic.id}`}
        className="underline underline-offset-4 hover:no-underline"
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
    </p>
  );
}
