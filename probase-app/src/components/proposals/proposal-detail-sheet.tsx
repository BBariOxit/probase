'use client';

import { CalendarDays, Layers, Users, User } from 'lucide-react';
import type { TopicProposal } from '@/lib/api/types';
import { ProposalStatusBadge } from '@/components/proposals/proposal-card';
import { Button } from '@/components/ui/button';
import { TextSection } from '@/components/shared/text-section';
import { DetailSheet } from '@/components/shared/detail-sheet';

const dateFormat = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

function Meta({
  icon: Icon,
  children,
}: {
  icon: typeof Users;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
      <Icon className="size-3.5 shrink-0 text-muted-foreground/70" />
      {children}
    </span>
  );
}

interface ProposalDetailSheetProps {
  proposal: TopicProposal | null;
  onClose: () => void;
  counterparty?: React.ReactNode;
  actions?: React.ReactNode;
  footer?: React.ReactNode;
}

export function ProposalDetailSheet({
  proposal,
  counterparty,
  actions,
  footer,
  onClose,
}: ProposalDetailSheetProps) {
  const meta = proposal ? (
    <>
      {counterparty && (
        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
          <User className="size-3.5 shrink-0 text-muted-foreground/70" />
          {counterparty}
        </span>
      )}
      <Meta icon={Layers}>{proposal.projectType.name}</Meta>
      <Meta icon={CalendarDays}>
        Gửi {dateFormat.format(new Date(proposal.createdAt))}
      </Meta>
    </>
  ) : null;

  const footerActions = proposal ? (
    <>
      <Button variant="ghost" onClick={onClose}>
        Đóng
      </Button>
      {actions}
    </>
  ) : null;

  return (
    <DetailSheet
      open={!!proposal}
      onOpenChange={(open) => !open && onClose()}
      title={proposal?.title}
      badge={proposal ? <ProposalStatusBadge status={proposal.status} /> : null}
      meta={meta}
      footer={footerActions}
      descriptionAria="Xem chi tiết đề xuất"
    >
      {proposal && (
        <>
          <TextSection title="Mô tả" body={proposal.description} />
          <TextSection
            title="Yêu cầu đầu ra"
            body={proposal.expectedOutcomes}
          />
          {footer}
        </>
      )}
    </DetailSheet>
  );
}
