'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowRight,
  FileText,
  GraduationCap,
  Info,
  Lightbulb,
  Loader2,
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
import { PaginationBar } from '@/components/shared/pagination-bar';
import { ProposalCard } from '@/components/proposals/proposal-card';
import { Button } from '@/components/ui/button';
import { PROPOSAL_PAGE_SIZE } from '@/constants/pagination.constant';
import { usePagination } from '@/hooks';

function StudentProposalsContent() {
  const allowed = useRequireRole('STUDENT');
  const router = useRouter();
  const searchParams = useSearchParams();
  const targetIdParam = searchParams.get('id');
  const targetProposalId = targetIdParam ? Number(targetIdParam) : null;

  useEffect(() => {
    if (targetProposalId) {
      router.replace(`/student/proposals/${targetProposalId}`);
    }
  }, [targetProposalId, router]);

  const semester = useActiveSemester();
  const { data: rounds } = useMyRounds(semester?.id);
  const { data: group } = useMyGroup();
  const { page, setPage } = usePagination({
    initialPageSize: PROPOSAL_PAGE_SIZE,
  });

  const { data, isPending, error } = useProposals({
    page,
    limit: PROPOSAL_PAGE_SIZE,
  });

  if (!allowed) return null;

  const proposals = data?.items ?? [];
  const pending = proposals.find(
    (one) =>
      one.status === 'PENDING' ||
      one.status === 'NEEDS_REVISION' ||
      one.status === 'DRAFT',
  );
  const accepted = proposals.find((one) => one.status === 'ACCEPTED');

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
    : accepted
      ? 'Bạn đã có đề tài đề xuất được duyệt trong học kỳ này.'
      : pending
        ? pending.status === 'DRAFT'
          ? 'Bạn đang có một bản nháp đề xuất. Hãy hoàn thiện và gửi hoặc xóa bản nháp trước khi tạo đề xuất mới.'
          : 'Bạn đang có một đề xuất đang chờ duyệt. Rút lại đề xuất đó nếu muốn gửi cái khác.'
        : closedReason;

  return (
    <>
      <div className="mx-auto max-w-4xl space-y-4">
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
                onClick={() => router.push(`/student/proposals/${proposal.id}`)}
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
      </div>
    </>
  );
}

export default function StudentProposalsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <StudentProposalsContent />
    </Suspense>
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
  const isDraft = proposal.status === 'DRAFT';
  const editable =
    proposal.status === 'PENDING' ||
    proposal.status === 'NEEDS_REVISION' ||
    isDraft;

  return (
    <>
      <ProposalCard
        proposal={proposal}
        titleHref={`/student/proposals/${proposal.id}`}
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
                variant="default"
                size="sm"
                render={<Link href={`/student/proposals/${proposal.id}`} />}
                className="gap-1.5 font-semibold shadow-xs"
              >
                <FileText className="size-4" />
                {isDraft ? 'Hoàn thiện & Gửi' : 'Xem chi tiết'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirming(true)}
                className="text-destructive hover:bg-destructive/10 hover:text-destructive cursor-pointer"
              >
                <Undo2 className="size-4" />
                {isDraft ? 'Xoá nháp' : 'Rút lại'}
              </Button>
            </>
          )
        }
      />

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={isDraft ? 'Xoá bản nháp?' : 'Rút lại đề xuất?'}
        description={
          isDraft
            ? `Bản nháp "${proposal.title}" sẽ bị xoá vĩnh viễn.`
            : `"${proposal.title}" sẽ bị xoá và giảng viên không còn thấy nó nữa. Sau khi rút, bạn gửi được đề xuất mới.`
        }
        confirmLabel={isDraft ? 'Xoá nháp' : 'Rút lại'}
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
          Lý do từ chối
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
          {topic.status === 'APPROVED'
            ? 'Tổ trưởng Bộ môn đã duyệt đề tài. Đang chờ Giáo vụ mở đăng ký.'
            : topic.status === 'DRAFT'
              ? 'Đề tài đã được tạo ở dạng bản nháp, đang chờ giảng viên gửi Tổ trưởng Bộ môn thẩm định.'
              : topic.status === 'REJECTED'
                ? 'Đề tài không được Tổ trưởng Bộ môn thông qua.'
                : 'Đang chờ Tổ trưởng Bộ môn thẩm định. Bạn sẽ nhận được thông báo khi đề tài mở đăng ký.'}
        </p>
      )}
    </section>
  );
}
