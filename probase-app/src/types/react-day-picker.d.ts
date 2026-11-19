declare module 'react-day-picker' {
  import type * as React from 'react';

  export interface DayPickerProps {
    className?: string;
    classNames?: Record<string, string | undefined>;
    showOutsideDays?: boolean;
    components?: Record<
      string,
      React.ComponentType<{ orientation?: string }>
    >;
    [key: string]: unknown;
  }

  export const DayPicker: React.ComponentType<DayPickerProps>;
  export function getDefaultClassNames(): Record<string, string>;
}

