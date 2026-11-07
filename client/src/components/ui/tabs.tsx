'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface TabsContextValue {
  value: string;
  onValueChange: (val: string) => void;
  variant: 'line' | 'segmented';
}

const TabsContext = React.createContext<TabsContextValue | null>(null);

export interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
  onValueChange: (value: string) => void;
  variant?: 'line' | 'segmented';
}

export function Tabs({
  value,
  onValueChange,
  variant = 'line',
  className,
  children,
  ...props
}: TabsProps) {
  return (
    <TabsContext.Provider value={{ value, onValueChange, variant }}>
      <div className={cn('space-y-4', className)} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

export function TabsList({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const ctx = React.useContext(TabsContext);
  const isSegmented = ctx?.variant === 'segmented';

  return (
    <div
      role="tablist"
      className={cn(
        isSegmented
          ? 'inline-flex items-center gap-1 p-1 rounded-lg border border-border bg-neutral-900/50'
          : 'flex items-center gap-2 overflow-x-auto pb-2 border-b border-border',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
}

export function TabsTrigger({
  value,
  className,
  children,
  ...props
}: TabsTriggerProps) {
  const ctx = React.useContext(TabsContext);
  const isActive = ctx?.value === value;
  const isSegmented = ctx?.variant === 'segmented';

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      onClick={() => ctx?.onValueChange(value)}
      className={cn(
        'text-xs font-medium transition-all cursor-pointer whitespace-nowrap',
        isSegmented
          ? isActive
            ? 'bg-neutral-800 text-foreground border border-neutral-700/80 px-3 py-1.5 rounded-md'
            : 'text-neutral-500 hover:text-foreground px-3 py-1.5'
          : isActive
          ? 'text-foreground font-semibold border-b-2 border-foreground pb-2 -mb-2'
          : 'text-neutral-500 hover:text-foreground pb-2 -mb-2',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
}

export function TabsContent({
  value,
  className,
  children,
  ...props
}: TabsContentProps) {
  const ctx = React.useContext(TabsContext);
  if (ctx?.value !== value) return null;

  return (
    <div
      role="tabpanel"
      className={cn('focus-visible:outline-none animate-in fade-in duration-150', className)}
      {...props}
    >
      {children}
    </div>
  );
}
