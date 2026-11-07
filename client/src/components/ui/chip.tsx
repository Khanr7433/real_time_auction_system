import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ChipProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: 'default' | 'success' | 'danger' | 'warning' | 'special';
  dot?: boolean;
  icon?: React.ReactNode;
}

export function Chip({
  className,
  tone = 'default',
  dot = false,
  icon,
  children,
  ...props
}: ChipProps) {
  const toneClasses = {
    // ChaiUI Rule: Status is text and outline, never filled status pills.
    default: 'border-neutral-700/80 text-neutral-400 bg-transparent',
    success: 'border-emerald-500/40 text-emerald-400 bg-transparent',
    danger: 'border-red-500/40 text-red-400 bg-transparent',
    warning: 'border-amber-500/40 text-amber-400 bg-transparent',
    special: 'border-purple-500/40 text-purple-400 bg-transparent',
  }[tone];

  const dotClasses = {
    default: 'bg-neutral-400',
    success: 'bg-emerald-500',
    danger: 'bg-red-500',
    warning: 'bg-amber-500',
    special: 'bg-purple-500',
  }[tone];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium border transition-colors',
        toneClasses,
        className
      )}
      {...props}
    >
      {dot && <span className={cn('size-1.5 rounded-full shrink-0', dotClasses)} aria-hidden />}
      {icon && <span className="inline-flex shrink-0">{icon}</span>}
      {children}
    </span>
  );
}
