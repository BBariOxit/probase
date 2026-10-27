'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, Inbox, Loader2, MessageSquareCode, X } from 'lucide-react';
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
import { ProposalDetailSheet } from '@/components/proposals/proposal-detail-sheet';
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

export default function LecturerProposalsPage() {
  const allowed = useRequireRole('LECTURER');
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
  const [answering, setAnswering] = useState<'accept' | 'reject' | null>(null);
  const [viewing, setViewing] = useState(false);
  const student = proposal.student;

  return (
    <>
      <ProposalCard
        proposal={proposal}
        onClick={() => setViewing(true)}
        counterparty={
          <span className="inline-flex items-center gap-1.5">
            <UserAvatar
              name={student.fullName}
              src={student.avatarUrl}
              className="size-5 text-[10px]"
            />
            <span className="text-foreground">{student.fullName}</span>
            <span>
              {student.studentCode}
              {student.class && ` · ${student.class}`}
            </span>
          </span>
        }
        footer={<Outcome proposal={proposal} />}
        actions={
          proposal.status === 'PENDING' && (
            <>
              <Button size="sm" onClick={() => setAnswering('accept')}>
                <Check />
                Nhận hướng dẫn
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewing(true)}
              >
                <MessageSquareCode />
                Xem & Nhận xét
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAnswering('reject')}
              >
                <X />
                Từ chối
              </Button>
            </>
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

      <ProposalDetailSheet
        proposal={viewing ? proposal : null}
        onClose={() => setViewing(false)}
        counterparty={
          <span>
            Sinh viên: {student.fullName} ({student.studentCode}
            {student.class && ` - ${student.class}`})
          </span>
        }
        footer={<Outcome proposal={proposal} />}
        actions={
          proposal.status === 'PENDING' && (
            <>
              <Button
                size="sm"
                onClick={() => {
                  setViewing(false);
                  setAnswering('accept');
                }}
              >
                <Check />
                Nhận hướng dẫn
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setViewing(false);
                  setAnswering('reject');
                }}
              >
                <X />
                Từ chối
              </Button>
            </>
          )
        }
      />
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
      {/* Which of the two is holding it up: a PENDING topic is waiting on the
          faculty office, an APPROVED one is waiting on them to open registration. */}
      {proposal.convertedTopic.status === 'PENDING'
        ? ' — đang chờ khoa duyệt.'
        : proposal.convertedTopic.status === 'APPROVED'
          ? ' — khoa đã duyệt, chờ khoa mở đăng ký.'
          : '.'}
    </p>
  );
}
