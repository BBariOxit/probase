'use client';

import Link from 'next/link';
import { CalendarDays, Layers, MessageSquare, Users } from 'lucide-react';
import type { ProposalStatus, TopicProposal } from '@/lib/api/types';
import { StatusPill, type StatusLabel } from '@/components/shared/status-pill';
import { TextSection } from '@/components/shared/text-section';

const PROPOSAL_STATUS: Record<ProposalStatus, StatusLabel> = {
  DRAFT: { label: 'Bản nháp', tone: 'idle' },
  PENDING: { label: 'Chờ duyệt', tone: 'waiting' },
  NEEDS_REVISION: { label: 'Đang trao đổi', tone: 'active' },
  ACCEPTED: { label: 'Đã duyệt', tone: 'success' },
  REJECTED: { label: 'Từ chối', tone: 'danger' },
};

export function ProposalStatusBadge({
  status,
  className,
}: {
  status: ProposalStatus;
  className?: string;
}) {
  return <StatusPill {...PROPOSAL_STATUS[status]} className={className} />;
}

const dateFormat = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

export function ProposalCard({
  proposal,
  counterparty,
  actions,
  footer,
  onClick,
  titleHref,
}: {
  proposal: TopicProposal;
  counterparty?: React.ReactNode;
  actions?: React.ReactNode;
  footer?: React.ReactNode;
  onClick?: () => void;
  titleHref?: string;
}) {
  return (
    <article
      className={`space-y-3 rounded-xl border bg-card p-4 overflow-hidden min-w-0 max-w-full break-words ${
        onClick
          ? 'cursor-pointer transition-colors hover:border-foreground/20 hover:bg-muted/30'
          : ''
      }`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <div className="flex items-start justify-between gap-3 min-w-0">
        <div className="min-w-0 flex-1 space-y-3">
          {titleHref ? (
            <Link
              href={titleHref}
              onClick={(e) => e.stopPropagation()}
              className="block text-base font-bold text-slate-900 dark:text-neutral-100 hover:text-primary dark:hover:text-primary transition-colors cursor-pointer leading-snug break-all [overflow-wrap:anywhere]"
            >
              {proposal.title}
            </Link>
          ) : (
            <h2 className="text-base font-bold text-slate-900 dark:text-neutral-100 group-hover:underline cursor-pointer leading-snug break-all [overflow-wrap:anywhere]">
              {proposal.title}
            </h2>
          )}

          <div
            className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground"
            onClick={(e) => e.stopPropagation()}
          >
            {counterparty}
            <span className="inline-flex items-center gap-1.5">
              <Layers className="size-3.5 shrink-0" />
              {proposal.projectType.name}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Users className="size-3.5 shrink-0" />
              {proposal.maxStudents ?? 1} SV
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="size-3.5 shrink-0" />
              Gửi {dateFormat.format(new Date(proposal.createdAt))}
            </span>
            {proposal.comments && proposal.comments.length > 0 && (
              <span className="inline-flex items-center gap-1.5 text-primary font-medium">
                <MessageSquare className="size-3.5 shrink-0" />
                {proposal.comments.length} trao đổi
              </span>
            )}
          </div>

          <TextSection
            title="Mô tả"
            body={proposal.description}
            titleAs="h3"
            titleClassName="text-xs text-muted-foreground"
            bodyClassName="line-clamp-3 text-foreground"
          />
        </div>
        <ProposalStatusBadge status={proposal.status} className="shrink-0" />
      </div>
      {/* Hide expected outcomes on card to keep it compact */}

      {footer && <div onClick={(e) => e.stopPropagation()}>{footer}</div>}

      {actions && (
        <div
          className="flex flex-wrap items-center gap-2 pt-1"
          onClick={(e) => e.stopPropagation()}
        >
          {actions}
        </div>
      )}
    </article>
  );
}
