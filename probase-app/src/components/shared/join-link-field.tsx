'use client';

import { useEffect, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function joinUrl(code: string): string {
  const origin = typeof window === 'undefined' ? '' : window.location.origin;

  return `${origin}/join/${encodeURIComponent(code)}`;
}

export function JoinLinkField({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const url = joinUrl(code);

  useEffect(() => {
    if (!copied) return;

    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      // Clipboard refused — the field is selectable as fallback.
    }
  }

  return (
    <div className="flex gap-2">
      <Input
        value={url}
        readOnly
        onFocus={(event) => event.currentTarget.select()}
        aria-label="Link mời vào nhóm"
        className="border-transparent bg-muted font-mono text-xs shadow-none"
      />
      <Button type="button" onClick={copy} className="shrink-0">
        {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
        {copied ? 'Đã sao chép' : 'Sao chép'}
      </Button>
    </div>
  );
}
