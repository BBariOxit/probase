'use client';

import { CalendarDays, Layers } from 'lucide-react';
import type { ProposalStatus, TopicProposal } from '@/lib/api/types';
import { StatusPill, type StatusLabel } from '@/components/shared/status-pill';
import { TextSection } from '@/components/shared/text-section';

const PROPOSAL_STATUS: Record<ProposalStatus, StatusLabel> = {
  PENDING: { label: 'Chờ trả lời', tone: 'waiting' },
  ACCEPTED: { label: 'Đã được nhận', tone: 'success' },
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
}: {
  proposal: TopicProposal;
  counterparty?: React.ReactNode;
  actions?: React.ReactNode;
  footer?: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <article
      className={`space-y-3 rounded-xl border bg-card p-4 ${
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
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-sm font-medium group-hover:underline">
          {proposal.title}
        </h2>
        <ProposalStatusBadge status={proposal.status} />
      </div>

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
          <CalendarDays className="size-3.5 shrink-0" />
          Gửi {dateFormat.format(new Date(proposal.createdAt))}
        </span>
      </div>

      <TextSection
        title="Mô tả"
        body={proposal.description}
        titleAs="h3"
        titleClassName="text-xs text-muted-foreground"
        bodyClassName="line-clamp-3 text-foreground"
      />
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
