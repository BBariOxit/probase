'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

interface BreadcrumbContextValue {
  getLabel: (segment: string) => string | null;

  setSegmentLabel: (segment: string, label: string) => void;

  clearSegmentLabel: (segment: string) => void;
}

const BreadcrumbContext = createContext<BreadcrumbContextValue | null>(null);

export function BreadcrumbProvider({ children }: { children: ReactNode }) {
  const [labels, setLabels] = useState<Record<string, string>>({});

  const setSegmentLabel = useCallback((segment: string, label: string) => {
    setLabels((prev) => {
      if (prev[segment] === label) return prev;
      return { ...prev, [segment]: label };
    });
  }, []);

  const clearSegmentLabel = useCallback((segment: string) => {
    setLabels((prev) => {
      if (!(segment in prev)) return prev;
      const next = { ...prev };
      delete next[segment];
      return next;
    });
  }, []);

  const getLabel = useCallback(
    (segment: string) => labels[segment] ?? null,
    [labels],
  );

  return (
    <BreadcrumbContext.Provider
      value={{ getLabel, setSegmentLabel, clearSegmentLabel }}
    >
      {children}
    </BreadcrumbContext.Provider>
  );
}

export function useBreadcrumbLabel(
  segment: string,
  label: string | null | undefined,
) {
  const ctx = useContext(BreadcrumbContext);

  const setSegmentLabel = ctx?.setSegmentLabel;
  const clearSegmentLabel = ctx?.clearSegmentLabel;

  useEffect(() => {
    if (!setSegmentLabel || !clearSegmentLabel || !label) return;
    setSegmentLabel(segment, label);
    return () => {
      clearSegmentLabel(segment);
    };
  }, [setSegmentLabel, clearSegmentLabel, segment, label]);
}

export function useBreadcrumbContext() {
  return useContext(BreadcrumbContext);
}
