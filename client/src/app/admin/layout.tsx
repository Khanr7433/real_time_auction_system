'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import {
  ShieldAlert,
  BarChart3,
  Users,
  Gavel,
  AlertTriangle,
  ArrowLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { isLoading, isAuthorized } = useAdminAccess();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !isAuthorized) {
      router.replace('/');
    }
  }, [isLoading, isAuthorized, router]);

  if (isLoading) {
    return (
      <>
        <div className="max-w-6xl mx-auto p-6 sm:p-12 space-y-4">
          <div className="h-8 w-48 bg-neutral-200/40 dark:bg-neutral-800/40 rounded animate-pulse" />
          <div className="card-chai h-96 bg-neutral-200/20 dark:bg-neutral-800/20 animate-pulse" />
        </div>
        {children}
      </>
    );
  }

  if (!isAuthorized) {
    return (
      <>
        <div className="max-w-md mx-auto my-16 p-8 text-center space-y-4 card-chai">
          <ShieldAlert className="size-12 mx-auto text-red-500" />
          <h1 className="text-xl font-medium text-foreground">Access denied</h1>
          <p className="text-xs text-muted-foreground">
            This area is restricted to system administrators only.
          </p>
          <div className="pt-2">
            <Button asChild variant="soft" size="sm">
              <Link href="/">
                <ArrowLeft className="size-4 mr-1" /> Return home
              </Link>
            </Button>
          </div>
        </div>
        {children}
      </>
    );
  }

  const navItems = [
    { href: '/admin', label: 'Overview', icon: BarChart3, exact: true },
    { href: '/admin/users', label: 'Users', icon: Users },
    { href: '/admin/auctions', label: 'Auctions', icon: Gavel },
    { href: '/admin/disputes', label: 'Disputes', icon: AlertTriangle },
  ];

  return (
    <div className="max-w-6xl mx-auto p-6 sm:p-12 space-y-6">
      {/* Admin Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg border border-border text-foreground">
              <ShieldAlert className="size-4" />
            </span>
            <h1 className="text-2xl font-medium tracking-tight text-foreground">
              Admin portal
            </h1>
          </div>
          <p className="text-xs text-muted-foreground">
            Platform monitoring, account management, auction moderation &amp; dispute resolution
          </p>
        </div>

        <Link href="/" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
          <ArrowLeft className="size-3.5" /> Back to store
        </Link>
      </div>

      {/* Admin Navigation Tabs */}
      <nav aria-label="Admin sections" className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-border/80">
        {navItems.map((item) => {
          const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-black'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/60'
              }`}
            >
              <Icon className="size-3.5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Main Admin Page Content */}
      <main>{children}</main>
    </div>
  );
}

