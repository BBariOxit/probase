'use client';

import { useCallback, useEffect, useState } from 'react';
import { DEFAULT_PAGE_SIZE } from '@/constants/pagination.constant';

export const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;
export type PageSizeOption = (typeof PAGE_SIZE_OPTIONS)[number];

const STORAGE_KEY = 'probase_table_page_size';

export interface UsePaginationOptions {
  initialPage?: number;
  initialPageSize?: number;
  storageKey?: string;
  syncUrl?: boolean;
}

function getInitialPage(): number {
  if (typeof window === 'undefined') return 1;
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const pageParam = urlParams.get('page');
    if (pageParam && Number(pageParam) >= 1) {
      return Number(pageParam);
    }
  } catch {}
  return 1;
}

function getInitialPageSize(fallback: number, storageKey: string): number {
  if (typeof window === 'undefined') return fallback;
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const sizeParam = urlParams.get('size');
    if (sizeParam && PAGE_SIZE_OPTIONS.includes(Number(sizeParam) as PageSizeOption)) {
      return Number(sizeParam);
    }
    const stored = localStorage.getItem(storageKey);
    if (stored && PAGE_SIZE_OPTIONS.includes(Number(stored) as PageSizeOption)) {
      return Number(stored);
    }
  } catch {}
  return fallback;
}

export function usePagination({
  initialPage = 1,
  initialPageSize = DEFAULT_PAGE_SIZE,
  storageKey = STORAGE_KEY,
  syncUrl = true,
}: UsePaginationOptions = {}) {
  const [page, setPageState] = useState(() => {
    if (!syncUrl) return initialPage;
    return getInitialPage();
  });

  const [pageSize, setPageSizeState] = useState(() =>
    getInitialPageSize(initialPageSize, storageKey),
  );

  const setPage = useCallback(
    (newPage: number) => {
      setPageState(newPage);
      if (typeof window !== 'undefined' && syncUrl) {
        try {
          const url = new URL(window.location.href);
          if (newPage <= 1) {
            url.searchParams.delete('page');
          } else {
            url.searchParams.set('page', String(newPage));
          }
          window.history.replaceState(null, '', url.pathname + url.search);
        } catch {}
      }
    },
    [syncUrl],
  );

  const resetPage = useCallback(() => {
    setPage(1);
  }, [setPage]);

  const setPageSize = useCallback(
    (newSize: number) => {
      setPageSizeState(newSize);
      setPage(1);
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(storageKey, String(newSize));
          if (syncUrl) {
            const url = new URL(window.location.href);
            url.searchParams.set('size', String(newSize));
            url.searchParams.delete('page');
            window.history.replaceState(null, '', url.pathname + url.search);
          }
        } catch {}
      }
    },
    [storageKey, syncUrl, setPage],
  );

  useEffect(() => {
    if (!syncUrl || typeof window === 'undefined') return;
    const handlePopState = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const sizeParam = urlParams.get('size');
      if (sizeParam && PAGE_SIZE_OPTIONS.includes(Number(sizeParam) as PageSizeOption)) {
        setPageSizeState(Number(sizeParam));
      }
      const pageParam = urlParams.get('page');
      if (pageParam && Number(pageParam) >= 1) {
        setPageState(Number(pageParam));
      } else {
        setPageState(1);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [syncUrl]);

  return {
    page,
    setPage,
    pageSize,
    setPageSize,
    resetPage,
  };
}
