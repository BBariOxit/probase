'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * Custom hook to copy text to clipboard with automatic reset timer.
 * @param timeout Milliseconds before `copied` resets to false (default: 2000)
 */
export function useCopyToClipboard(timeout = 2000) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), timeout);
    return () => clearTimeout(timer);
  }, [copied, timeout]);

  const copy = useCallback(async (text: string): Promise<boolean> => {
    if (typeof window === 'undefined' || !navigator?.clipboard) {
      return false;
    }

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      return true;
    } catch {
      setCopied(false);
      return false;
    }
  }, []);

  return { copied, copy };
}
