'use client';

import { useEffect, useState } from 'react';

/**
 * Custom hook to debounce any fast-changing value.
 * @param value The value to debounce
 * @param delay Milliseconds to wait before updating the debounced value (default: 300)
 */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

// Alias for backwards compatibility
export const useDebouncedValue = useDebounce;
