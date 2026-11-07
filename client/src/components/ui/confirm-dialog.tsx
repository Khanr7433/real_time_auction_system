'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Button } from './button';
import { AlertTriangle, AlertCircle } from 'lucide-react';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'warning' | 'default';
  busy?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'danger',
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  React.useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onCancel();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, busy, onCancel]);

  if (!open) return null;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onCancel();
      }}
    >
      <div
        className={cn(
          'card-chai relative w-full max-w-md p-6 bg-card text-foreground border border-card-edge space-y-4'
        )}
      >
        <div className="flex items-start gap-3">
          <div
            className={cn(
              'p-2 rounded-xl shrink-0 border',
              tone === 'danger'
                ? 'border-red-500/40 text-red-500 bg-red-500/10'
                : 'border-neutral-700 text-neutral-300 bg-neutral-800'
            )}
          >
            {tone === 'danger' ? (
              <AlertTriangle className="size-5" />
            ) : (
              <AlertCircle className="size-5" />
            )}
          </div>
          <div className="space-y-1">
            <h3 className="font-montserrat text-sm font-semibold tracking-tight text-foreground">
              {title}
            </h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              {description}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={onCancel}
            className="text-xs"
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={tone === 'danger' ? 'danger' : 'soft'}
            size="sm"
            disabled={busy}
            onClick={onConfirm}
            className="text-xs"
          >
            {busy ? 'Processing...' : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
