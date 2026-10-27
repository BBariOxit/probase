'use client';

import { Check, Copy } from 'lucide-react';
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function joinUrl(code: string): string {
  const origin = typeof window === 'undefined' ? '' : window.location.origin;

  return `${origin}/join/${encodeURIComponent(code)}`;
}

export function JoinLinkField({ code }: { code: string }) {
  const { copied, copy } = useCopyToClipboard();
  const url = joinUrl(code);

  return (
    <div className="flex gap-2">
      <Input
        value={url}
        readOnly
        onFocus={(event) => event.currentTarget.select()}
        aria-label="Link mời vào nhóm"
        className="border-transparent bg-muted font-mono text-xs shadow-none"
      />
      <Button type="button" onClick={() => copy(url)} className="shrink-0">
        {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
        {copied ? 'Đã sao chép' : 'Sao chép'}
      </Button>
    </div>
  );
}
