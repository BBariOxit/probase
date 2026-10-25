'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  GraduationCap,
  Info,
  Lightbulb,
  Loader2,
  Pencil,
  Plus,
  Undo2,
} from 'lucide-react';
import { useActiveSemester, useMyRounds } from '@/lib/api/master-data';
import { useProposals, useWithdrawProposal } from '@/lib/api/proposals';
import { useMyGroup } from '@/lib/api/registration';
import type { TopicProposal } from '@/lib/api/types';
import { useRequireRole } from '@/lib/auth/use-require-role';
import { proposalWindow } from '@/lib/proposal-window';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { EmptyState } from '@/components/shared/empty-state';
import { PageWithRail } from '@/components/layout/page-with-rail';
import { PaginationBar } from '@/components/shared/pagination-bar';
import { RoundTimeline } from '@/components/rounds/round-timeline';
import { ProposalCard } from '@/components/proposals/proposal-card';
import { ProposalDetailSheet } from '@/components/proposals/proposal-detail-sheet';
import { Button } from '@/components/ui/button';

const PAGE_SIZE = 20;

export default function StudentProposalsPage() {
  const allowed = useRequireRole('STUDENT');
  const semester = useActiveSemester();
  const { data: rounds } = useMyRounds(semester?.id);
  const { data: group } = useMyGroup();
  const [page, setPage] = useState(1);

  const [viewingProposal, setViewingProposal] = useState<TopicProposal | null>(
    null,
  );

  const { data, isPending, error } = useProposals({ page, limit: PAGE_SIZE });

  if (!allowed) return null;

  const proposals = data?.items ?? [];
  const pending = proposals.find((one) => one.status === 'PENDING');

  /*
    Whether *any* round this student belongs to would still take a proposal.
    A student eligible for two kinds of project can propose for either, so one
    open round is enough — and when none is open, the first round's reason is
    the one worth showing, since they are almost always the same sentence.
  */
  const windows = (rounds ?? []).map((round) =>
    proposalWindow(round, group != null),
  );
  const openWindow = rounds !== undefined && windows.some((one) => one.open);
  const closedReason = rounds && !openWindow ? windows[0]?.reason : null;

  const blocked = group
    ? 'Bạn đã có đề tài trong học kỳ này. Muốn đề xuất đề tài khác thì rời nhóm trước.'
    : pending
      ? 'Bạn đang có một đề xuất chờ trả lời. Rút lại đề xuất đó nếu muốn gửi cái khác.'
      : closedReason;

  return (
    <>
      <PageWithRail
        rail={
          rounds?.[0] && (
            <RoundTimeline round={rounds[0]} hasGroup={group != null} />
          )
        }
      >
        {/*
          The reason comes before the button, not instead of it: a student who
          cannot send one right now still needs to know why, and the sentence is
          the same one the API would answer with.
        */}
        {blocked ? (
          <p className="flex items-start gap-2.5 rounded-xl border bg-muted/40 px-4 py-3 text-sm">
            <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <span className="text-muted-foreground">{blocked}</span>
          </p>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Có ý tưởng riêng? Gửi cho giảng viên bạn muốn được hướng dẫn.
            </p>
            <Button render={<Link href="/student/proposals/moi" />}>
              <Plus />
              Gửi đề xuất
            </Button>
          </div>
        )}

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
              icon={Lightbulb}
              title="Bạn chưa gửi đề xuất nào."
              action={
                blocked ? undefined : (
                  <Button
                    variant="outline"
                    size="sm"
                    render={<Link href="/student/proposals/moi" />}
                  >
                    <Plus />
                    Gửi đề xuất đầu tiên
                  </Button>
                )
              }
            />
          </div>
        )}

        <ul className="space-y-3">
          {proposals.map((proposal) => (
            <li key={proposal.id}>
              <SentProposal
                proposal={proposal}
                registeredTopicId={group?.topicId ?? null}
                onClick={() => setViewingProposal(proposal)}
              />
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

      <ProposalDetailSheet
        proposal={viewingProposal}
        onClose={() => setViewingProposal(null)}
        counterparty={
          viewingProposal && (
            <span>
              Giảng viên:{' '}
              {viewingProposal.requestedLecturer.academicTitle
                ? `${viewingProposal.requestedLecturer.academicTitle} ${viewingProposal.requestedLecturer.fullName}`
                : viewingProposal.requestedLecturer.fullName}
            </span>
          )
        }
        footer={
          viewingProposal && (
            <Answer
              proposal={viewingProposal}
              registeredTopicId={group?.topicId ?? null}
            />
          )
        }
      />
    </>
  );
}

function SentProposal({
  proposal,
  registeredTopicId,
  onClick,
}: {
  proposal: TopicProposal;
  registeredTopicId: number | null;
  onClick: () => void;
}) {
  const withdraw = useWithdrawProposal();
  const [confirming, setConfirming] = useState(false);
  const editable = proposal.status === 'PENDING';

  return (
    <>
      <ProposalCard
        proposal={proposal}
        onClick={onClick}
        counterparty={
          <span className="inline-flex items-center gap-1.5">
            <GraduationCap className="size-3.5 shrink-0" />
            <Link
              href={`/lecturers/${proposal.requestedLecturer.id}`}
              className="rounded-sm hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              {proposal.requestedLecturer.academicTitle
                ? `${proposal.requestedLecturer.academicTitle} ${proposal.requestedLecturer.fullName}`
                : proposal.requestedLecturer.fullName}
            </Link>
          </span>
        }
        footer={
          <Answer proposal={proposal} registeredTopicId={registeredTopicId} />
        }
        actions={
          editable && (
            <>
              <Button
                variant="outline"
                size="sm"
                render={<Link href={`/student/proposals/${proposal.id}`} />}
              >
                <Pencil />
                Sửa
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirming(true)}
              >
                <Undo2 />
                Rút lại
              </Button>
            </>
          )
        }
      />

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title="Rút lại đề xuất?"
        description={`"${proposal.title}" sẽ bị xoá và giảng viên không còn thấy nó nữa. Sau khi rút, bạn gửi được đề xuất mới.`}
        confirmLabel="Rút lại"
        onConfirm={() => withdraw.mutateAsync(proposal.id)}
      />
    </>
  );
}

function Answer({
  proposal,
  registeredTopicId,
}: {
  proposal: TopicProposal;
  registeredTopicId: number | null;
}) {
  if (proposal.status === 'REJECTED') {
    return (
      <section className="space-y-1 rounded-lg border border-status-danger/25 bg-status-danger-bg/40 px-3 py-2.5">
        <h3 className="text-xs font-medium text-status-danger">
          Nhận xét của giảng viên
        </h3>
        <p className="text-sm whitespace-pre-line break-words">
          {proposal.lecturerFeedback ?? 'Giảng viên chưa để lại nhận xét nào.'}
        </p>
      </section>
    );
  }

  if (proposal.status !== 'ACCEPTED' || !proposal.convertedTopic) return null;

  const topic = proposal.convertedTopic;
  const alreadyRegistered = registeredTopicId === topic.id;
  const readyToRegister = topic.status === 'OPEN' && !alreadyRegistered;

  return (
    <section className="space-y-1.5 rounded-lg border border-status-success/25 bg-status-success-bg/40 px-3 py-2.5">
      <h3 className="text-xs font-medium text-status-success">
        {proposal.acceptedByLecturer
          ? `${proposal.acceptedByLecturer.academicTitle ?? ''} ${proposal.acceptedByLecturer.fullName}`.trim()
          : 'Giảng viên'}{' '}
        đã nhận hướng dẫn
      </h3>

      {readyToRegister ? (
        <>
          <p className="text-sm">
            Đề tài đã mở và đang được giữ cho bạn. Đăng ký để giữ chỗ trước khi
            đợt đăng ký đóng.
          </p>
          <Button
            size="sm"
            className="mt-1"
            render={<Link href={`/student/topics/${topic.id}`} />}
          >
            Đăng ký đề tài
            <ArrowRight />
          </Button>
        </>
      ) : alreadyRegistered ? (
        <p className="text-sm">
          Bạn đã đăng ký đề tài này.{' '}
          <Link
            href="/student/groups"
            className="underline underline-offset-4 hover:no-underline"
          >
            Xem nhóm của bạn
          </Link>
          .
        </p>
      ) : (
        <p className="text-sm">
          Đang chờ khoa phê duyệt. Bạn sẽ nhận được thông báo khi đề tài mở đăng
          ký.
        </p>
      )}
    </section>
  );
}
