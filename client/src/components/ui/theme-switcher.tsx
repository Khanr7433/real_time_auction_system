'use client';

import * as React from 'react';
import { useTheme } from './theme-provider';
import { Sun, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ThemeSwitcherProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  className?: string;
}

export function ThemeSwitcher({ className, ...props }: ThemeSwitcherProps) {
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={mounted ? `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode` : 'Toggle theme'}
      title={mounted ? `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode` : 'Toggle theme'}
      className={cn(
        'relative inline-flex size-9 items-center justify-center rounded-lg border border-border bg-card/60 text-foreground hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors cursor-pointer',
        className
      )}
      {...props}
    >
      {mounted ? (
        theme === 'dark' ? (
          <Sun className="size-4 text-neutral-300 hover:text-amber-400 transition-colors" />
        ) : (
          <Moon className="size-4 text-neutral-700 hover:text-amber-600 transition-colors" />
        )
      ) : (
        <span className="size-4" />
      )}
    </button>
  );
}
