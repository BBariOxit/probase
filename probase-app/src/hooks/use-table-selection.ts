'use client';

import { useCallback, useMemo, useState } from 'react';

export function useTableSelection<T extends { id: number }>(visibleItems: T[]) {
  const [selectedById, setSelectedById] = useState<Record<number, T>>({});

  const selectedItems = useMemo(
    () => Object.values(selectedById),
    [selectedById],
  );

  const selectedIds = useMemo(
    () => selectedItems.map((item) => item.id),
    [selectedItems],
  );

  const allOnPageSelected =
    visibleItems.length > 0 &&
    visibleItems.every((item) => Boolean(selectedById[item.id]));

  const isSelected = useCallback(
    (id: number) => Boolean(selectedById[id]),
    [selectedById],
  );

  const toggleRow = useCallback((item: T, checked: boolean) => {
    setSelectedById((prev) => {
      if (checked) {
        return { ...prev, [item.id]: item };
      }
      const next = { ...prev };
      delete next[item.id];
      return next;
    });
  }, []);

  const toggleAllOnPage = useCallback(
    (checked: boolean) => {
      setSelectedById((prev) => {
        const next = { ...prev };
        for (const item of visibleItems) {
          if (checked) {
            next[item.id] = item;
          } else {
            delete next[item.id];
          }
        }
        return next;
      });
    },
    [visibleItems],
  );

  const clearSelection = useCallback(() => {
    setSelectedById({});
  }, []);

  const removeSelectedIds = useCallback((ids: number[]) => {
    if (ids.length === 0) return;
    setSelectedById((prev) => {
      const next = { ...prev };
      for (const id of ids) {
        delete next[id];
      }
      return next;
    });
  }, []);

  return {
    selectedById,
    selectedItems,
    selectedIds,
    selectedCount: selectedItems.length,
    allOnPageSelected,
    isSelected,
    toggleRow,
    toggleAllOnPage,
    clearSelection,
    removeSelectedIds,
  };
}

