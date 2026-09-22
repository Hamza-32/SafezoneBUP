'use client';

// A row of mutually exclusive filter buttons.
//
// This exists because two pages were using Radix Tabs for filtering: a
// <Tabs> with a <TabsList> and no <TabsContent> anywhere. That renders
// role="tab" on each button with an aria-controls pointing at a panel that
// does not exist, so a screen reader following the reference finds nothing
// and axe reports a critical aria-valid-attr-value failure.
//
// Filtering a list in place is not a tab interface. These are buttons that
// report their pressed state, which is what they always were.

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface FilterOption {
  value: string;
  label: string;
}

interface FilterBarProps {
  options: FilterOption[];
  value: string;
  onChange: (value: string) => void;
  /** Names the group for assistive technology, e.g. "Filter by category". */
  label: string;
  className?: string;
}

export function FilterBar({ options, value, onChange, label, className }: FilterBarProps) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        'inline-flex w-full items-center gap-1 rounded-lg bg-muted p-1 text-muted-foreground',
        className
      )}
    >
      {options.map((option) => {
        const active = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            // aria-pressed is the correct state for a toggle button, and is
            // what a screen reader announces instead of a broken tab panel.
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={cn(
              'flex-1 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-all',
              'ring-offset-background focus-visible:outline-none focus-visible:ring-2',
              'focus-visible:ring-ring focus-visible:ring-offset-2',
              active
                ? 'bg-background text-foreground shadow-sm'
                : 'hover:bg-background/60 hover:text-foreground'
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
