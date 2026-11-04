import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', error, ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        className={cn(
          'flex h-10 w-full rounded-lg border border-neutral-300 bg-white/70 px-3 py-2 text-sm text-neutral-900 transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-neutral-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-400 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-800 dark:bg-black/30 dark:text-neutral-100 dark:placeholder:text-neutral-500 dark:focus-visible:ring-neutral-600',
          error && 'border-red-500 dark:border-red-500 focus-visible:ring-red-500',
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

