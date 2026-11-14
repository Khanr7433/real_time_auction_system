import React from 'react';
import Link from 'next/link';
import { Gavel, Activity } from 'lucide-react';

export function Footer() {
  return (
    <footer className="w-full border-t border-neutral-200/80 dark:border-neutral-800/80 bg-white/40 dark:bg-black/40 backdrop-blur-sm transition-colors mt-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Brand & Vision */}
          <div className="md:col-span-1 space-y-3">
            <Link href="/" className="flex items-center gap-2">
              <div className="size-7 rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-black flex items-center justify-center font-bold">
                <Gavel className="size-4" />
              </div>
              <span className="font-display font-bold text-base tracking-tight text-foreground">
                Bid<span className="text-yellow-800 dark:text-orange-100">Now</span>
              </span>
            </Link>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
              Real-time auctions with sub-second synchronization, anti-sniping protection, and optimistic concurrency safety.
            </p>
          </div>

          {/* Platform Navigation */}
          <div className="space-y-3">
            <h4 className="font-display text-xs font-semibold uppercase tracking-wider text-foreground">Platform</h4>
            <ul className="space-y-2 text-xs text-neutral-500 dark:text-neutral-400">
              <li>
                <Link href="/auctions" className="hover:text-brand transition-colors">
                  Live auctions
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-brand transition-colors">
                  User dashboard
                </Link>
              </li>
              <li>
                <Link href="/dashboard/notifications" className="hover:text-brand transition-colors">
                  Notifications
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-brand transition-colors">
                  Sign in
                </Link>
              </li>
            </ul>
          </div>

          {/* Architecture & Tech */}
          <div className="space-y-3">
            <h4 className="font-display text-xs font-semibold uppercase tracking-wider text-foreground">Architecture</h4>
            <ul className="space-y-2 text-xs text-neutral-500 dark:text-neutral-400">
              <li className="flex items-center gap-1.5">
                <span>Socket.io real-time engine</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span>Server-authoritative timers</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span>MongoDB OCC bid locking</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span>Next.js 16 App Router</span>
              </li>
            </ul>
          </div>

          {/* System Status & Standards */}
          <div className="space-y-3">
            <h4 className="font-display text-xs font-semibold uppercase tracking-wider text-foreground">System status</h4>
            <div className="p-3 card-chai space-y-2">
              <div className="flex items-center gap-2 text-xs text-foreground font-medium">
                <span className="size-2 rounded-full bg-emerald-500" />
                <span>Operational</span>
              </div>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                All WebSocket clusters and database replicas operating with sub-second latency.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom hairline & copyright */}
        <div className="pt-8 border-t border-neutral-200/60 dark:border-neutral-800/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-500 dark:text-neutral-400">
          <p>© 2026 BidNow. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <span>Built with the ChaiUI design system</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
