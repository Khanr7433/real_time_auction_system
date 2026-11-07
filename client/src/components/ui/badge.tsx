import * as React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'outline' | 'new' | 'hot' | 'rated';
}

export function Badge({
  className,
  variant = 'outline',
  children,
  ...props
}: BadgeProps) {
  const variantClasses = {
    outline: 'border-border text-foreground bg-transparent',
    new: 'border-emerald-500/40 text-emerald-400 bg-transparent',
    hot: 'border-amber-500/40 text-amber-400 bg-transparent',
    rated: 'border-purple-500/40 text-purple-400 bg-transparent',
  }[variant];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider border',
        variantClasses,
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

// ChaiUI signature AnimatedBadge with border glint
export function AnimatedBadge({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        'relative inline-flex w-fit overflow-hidden rounded-full p-px',
        className
      )}
      {...props}
    >
      <span
        aria-hidden
        className="absolute top-1/2 left-1/2 h-5 w-[300px] rounded-full bg-gradient-to-r from-transparent via-transparent to-orange-500 motion-safe:animate-[chai-spin_4s_linear_infinite]"
        style={{ transform: 'translate(-50%,-50%)' }}
      />
      <span className="relative z-10 rounded-full bg-neutral-100 dark:bg-neutral-900 border border-border px-3 py-1 text-xs font-medium text-foreground flex items-center gap-2">
        {children}
      </span>
    </span>
  );
}
