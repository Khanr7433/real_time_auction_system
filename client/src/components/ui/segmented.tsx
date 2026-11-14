'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface SegmentedOption<T extends string = string> {
  value: T;
  label: React.ReactNode;
  count?: number;
  disabled?: boolean;
}

export interface SegmentedProps<T extends string = string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  size?: 'sm' | 'md';
}

export function Segmented<T extends string = string>({
  options,
  value,
  onChange,
  className,
  size = 'md',
}: SegmentedProps<T>) {
  return (
    <div
      role="tablist"
      className={cn(
        'inline-flex items-center gap-1 rounded-lg border border-neutral-200/80 dark:border-neutral-800/80 bg-neutral-100/60 dark:bg-black/40 p-1 backdrop-blur-sm overflow-x-auto max-w-full scrollbar-none',
        className
      )}
    >
      {options.map((option) => {
        const isActive = value === option.value;
        return (
          <button
            key={option.value}
            role="tab"
            aria-selected={isActive}
            disabled={option.disabled}
            onClick={() => onChange(option.value)}
            className={cn(
              'rounded-md font-medium transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
              size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-xs sm:text-sm',
              isActive
                ? 'bg-orange-100 text-orange-900 dark:bg-orange-900/40 dark:text-orange-100 font-semibold shadow-none border border-orange-500/20'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-foreground hover:bg-neutral-200/50 dark:hover:bg-neutral-800/50'
            )}
          >
            <span>{option.label}</span>
            {option.count !== undefined && (
              <span
                className={cn(
                  'text-[10px] px-1.5 py-0.2 rounded-full border',
                  isActive
                    ? 'border-orange-500/30 text-orange-900 dark:text-orange-100'
                    : 'border-neutral-300 dark:border-neutral-700 text-neutral-500'
                )}
              >
                {option.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
