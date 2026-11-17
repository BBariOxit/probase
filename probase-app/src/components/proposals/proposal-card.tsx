'use client';

import Link from 'next/link';
import type { ProposalStatus, TopicProposal } from '@/lib/api/types';
import { StatusPill, type StatusLabel } from '@/components/shared/status-pill';
import { cn } from '@/lib/utils';

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
  return (
    <StatusPill
      {...PROPOSAL_STATUS[status]}
      variant="text"
      className={cn('text-xs font-semibold', className)}
    />
  );
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
      className={cn(
        'rounded-xl border border-slate-300 dark:border-neutral-700 bg-white dark:bg-[#18181b] overflow-hidden shadow-xs hover:border-slate-400 dark:hover:border-neutral-600 hover:shadow-sm transition-all',
        onClick && 'cursor-pointer',
      )}
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
      {/* Header bar: Phân loại đề tài & Trạng thái duyệt */}
      <div className="bg-slate-100/75 dark:bg-neutral-900/80 px-4 py-2.5 sm:px-5 border-b border-slate-200 dark:border-neutral-800 flex items-center justify-between gap-3">
        <span className="font-semibold text-xs text-slate-600 dark:text-neutral-400 uppercase tracking-wider">
          {proposal.projectType.name}
        </span>
        <ProposalStatusBadge status={proposal.status} />
      </div>

      {/* Body: Tên đề tài, người đề xuất, mô tả tóm tắt */}
      <div className="p-4 sm:p-5 space-y-3">
        {titleHref ? (
          <Link
            href={titleHref}
            onClick={(e) => e.stopPropagation()}
            className="block text-base sm:text-[17px] font-bold text-slate-900 dark:text-neutral-100 hover:text-primary dark:hover:text-primary transition-colors leading-snug break-words"
          >
            {proposal.title}
          </Link>
        ) : (
          <h3 className="text-base sm:text-[17px] font-bold text-slate-900 dark:text-neutral-100 leading-snug break-words">
            {proposal.title}
          </h3>
        )}

        {/* Thông tin người gửi */}
        <div
          className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-slate-600 dark:text-neutral-400"
          onClick={(e) => e.stopPropagation()}
        >
          {counterparty}
          {proposal.comments && proposal.comments.length > 0 && (
            <>
              <span className="text-slate-300 dark:text-neutral-700" aria-hidden="true">•</span>
              <span className="font-medium text-primary">
                {proposal.comments.length} phản hồi
              </span>
            </>
          )}
        </div>

        {/* Nội dung tóm tắt: Không tiêu đề rườm rà, dễ đọc, tương phản tốt */}
        {proposal.description && (
          <p className="text-sm text-slate-600 dark:text-neutral-300 leading-relaxed line-clamp-3 break-words">
            {proposal.description}
          </p>
        )}

        {/* Footer (lý do từ chối, kết quả chuyển đề tài...) */}
        {footer && <div onClick={(e) => e.stopPropagation()}>{footer}</div>}

        {/* Nút hành động & Ngày gửi ở góc phải */}
        <div
          className="flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-slate-100 dark:border-neutral-800"
          onClick={(e) => e.stopPropagation()}
        >
          {actions ? (
            <div className="flex flex-wrap items-center gap-2">
              {actions}
            </div>
          ) : (
            <div />
          )}

          <span className="text-xs text-slate-500 dark:text-neutral-400 ml-auto shrink-0">
            Gửi {dateFormat.format(new Date(proposal.createdAt))}
          </span>
        </div>
      </div>
    </article>
  );
}
