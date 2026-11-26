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
          <h2 className="font-montserrat text-xl font-bold text-foreground">Access Denied</h2>
          <p className="text-xs text-neutral-500">
            This area is restricted to system administrators only.
          </p>
          <Link href="/" className="inline-block pt-2">
            <Button variant="soft" size="sm" iconRight={false}>
              <ArrowLeft className="size-4 mr-1" /> Return Home
            </Button>
          </Link>
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
    <div className="max-w-6xl mx-auto p-4 sm:p-8 space-y-6">
      {/* Admin Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200 dark:border-neutral-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg border border-neutral-300 dark:border-neutral-800 text-foreground">
              <ShieldAlert className="size-4" />
            </span>
            <h1 className="font-montserrat text-2xl font-bold tracking-tight text-foreground">
              Admin Portal
            </h1>
          </div>
          <p className="text-xs text-neutral-500">
            Platform monitoring, account management, auction moderation & dispute resolution
          </p>
        </div>

        <Link href="/" className="text-xs text-neutral-500 hover:text-foreground flex items-center gap-1 transition-colors">
          <ArrowLeft className="size-3.5" /> Back to store
        </Link>
      </div>

      {/* Admin Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-neutral-200 dark:border-neutral-800/80">
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
                  : 'text-neutral-500 hover:text-foreground hover:bg-neutral-100 dark:hover:bg-neutral-900'
              }`}
            >
              <Icon className="size-3.5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Main Admin Page Content */}
      <main>{children}</main>
    </div>
  );
}

