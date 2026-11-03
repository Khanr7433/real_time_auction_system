import * as React from 'react';
import { cn } from '@/lib/utils';
import { ArrowUpRight } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'solid' | 'outline' | 'soft' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  iconRight?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'solid', size = 'md', iconRight, children, ...props }, ref) => {
    const sizeClasses = {
      sm: 'h-8 px-3 text-xs',
      md: 'h-9 px-4 text-sm',
      lg: 'h-11 px-6 text-base',
      icon: 'size-9 p-0 flex items-center justify-center',
    }[size];

    const variantClasses = {
      // Solid: ChaiUI signature asymmetric corners, white on dark
      solid: 'btn-asym bg-neutral-900 text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-neutral-200 font-medium',
      // Outline: mirrored asymmetric corners
      outline: 'btn-asym-mirror border border-border bg-transparent hover:bg-neutral-100 dark:hover:bg-neutral-900 text-foreground font-medium',
      // Soft / card button: rounded-md
      soft: 'rounded-md bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-foreground font-medium',
      // Ghost: no border
      ghost: 'rounded-md bg-transparent hover:bg-neutral-100 dark:hover:bg-neutral-800 text-foreground',
      // Danger: red fill for confirmations
      danger: 'rounded-md bg-red-600 text-white hover:bg-red-700 font-medium',
    }[variant];

    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center gap-2 transition-colors duration-200 disabled:opacity-50 disabled:pointer-events-none cursor-pointer',
          sizeClasses,
          variantClasses,
          className
        )}
        {...props}
      >
        {children}
        {iconRight !== false && variant === 'solid' && size !== 'icon' && (
          <ArrowUpRight className="-ml-1 size-4" aria-hidden />
        )}
      </button>
    );
  }
);
Button.displayName = 'Button';
