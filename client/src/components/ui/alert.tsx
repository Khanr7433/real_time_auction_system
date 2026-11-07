import * as React from 'react';
import { cn } from '@/lib/utils';
import { AlertCircle, CheckCircle2, AlertTriangle, Info } from 'lucide-react';

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  tone?: 'info' | 'success' | 'warning' | 'danger';
  title?: string;
  onDismiss?: () => void;
}

export function Alert({
  className,
  tone = 'info',
  title,
  onDismiss,
  children,
  ...props
}: AlertProps) {
  const toneClasses = {
    // ChaiUI Rule: Subtle 1px outline with faint fill, zero drop shadows
    info: 'border-neutral-700/80 text-neutral-300 bg-neutral-900/60',
    success: 'border-emerald-500/30 text-emerald-300 bg-emerald-950/20',
    warning: 'border-amber-500/40 text-amber-300 bg-neutral-900/60',
    danger: 'border-red-500/30 text-red-300 bg-red-950/20',
  }[tone];

  const Icon = {
    info: Info,
    success: CheckCircle2,
    warning: AlertTriangle,
    danger: AlertCircle,
  }[tone];

  return (
    <div
      role="alert"
      className={cn(
        'flex items-start gap-3 p-3.5 rounded-lg border text-xs leading-relaxed transition-colors',
        toneClasses,
        className
      )}
      {...props}
    >
      <Icon className="size-4 shrink-0 mt-0.5" aria-hidden />
      <div className="flex-1 space-y-0.5 min-w-0">
        {title && <h5 className="font-semibold tracking-tight text-foreground">{title}</h5>}
        <div className="text-[11px] opacity-90">{children}</div>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss alert"
          className="text-neutral-400 hover:text-foreground text-xs shrink-0 cursor-pointer"
        >
          ✕
        </button>
      )}
    </div>
  );
}
