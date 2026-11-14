import * as React from 'react';
import { cn } from '@/lib/utils';

export interface LiveDotProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: 'live' | 'special' | 'success' | 'warning' | 'danger';
}

export function LiveDot({
  tone = 'live',
  className,
  ...props
}: LiveDotProps) {
  const toneClasses = {
    live: {
      ping: 'bg-red-400',
      dot: 'bg-red-500',
    },
    danger: {
      ping: 'bg-red-400',
      dot: 'bg-red-500',
    },
    success: {
      ping: 'bg-emerald-400',
      dot: 'bg-emerald-500',
    },
    special: {
      ping: 'bg-purple-400',
      dot: 'bg-purple-500',
    },
    warning: {
      ping: 'bg-amber-400',
      dot: 'bg-amber-500',
    },
  }[tone];

  return (
    <span
      className={cn('relative inline-flex size-2 shrink-0', className)}
      {...props}
    >
      <span
        aria-hidden="true"
        className={cn(
          'absolute inline-flex size-full rounded-full opacity-75 motion-safe:animate-ping motion-reduce:animate-none',
          toneClasses.ping
        )}
      />
      <span
        className={cn(
          'relative inline-flex size-2 rounded-full',
          toneClasses.dot
        )}
      />
    </span>
  );
}
