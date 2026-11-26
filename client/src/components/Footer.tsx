import React from 'react';
import Link from 'next/link';
import { Gavel, Activity } from 'lucide-react';

export function Footer() {
  return (
    <footer className="relative w-full bg-background/60 backdrop-blur-sm transition-colors mt-auto before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-brand/40 before:to-transparent">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Brand & Vision */}
          <div className="md:col-span-1 space-y-3">
            <Link href="/" className="flex items-center gap-2">
              <div className="size-7 rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-black flex items-center justify-center font-bold">
                <Gavel className="size-4" />
              </div>
              <span className="font-brand font-bold text-base tracking-tight text-foreground">
                Bid<span className="text-yellow-800 dark:text-orange-100">Now</span>
              </span>
            </Link>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Real-time auctions with sub-second synchronization, anti-sniping protection, and optimistic concurrency safety.
            </p>
          </div>

          {/* Platform Navigation */}
          <div className="space-y-3">
            <h4 className="font-display text-xs font-semibold text-foreground">Platform</h4>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li>
                <Link href="/auctions" className="hover:text-foreground transition-colors">
                  Live auctions
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-foreground transition-colors">
                  User dashboard
                </Link>
              </li>
              <li>
                <Link href="/dashboard/notifications" className="hover:text-foreground transition-colors">
                  Notifications
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-foreground transition-colors">
                  Sign in
                </Link>
              </li>
            </ul>
          </div>

          {/* Architecture & Tech */}
          <div className="space-y-3">
            <h4 className="font-display text-xs font-semibold text-foreground">Architecture</h4>
            <ul className="space-y-2 text-xs text-muted-foreground">
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
            <h4 className="font-display text-xs font-semibold text-foreground">System status</h4>
            <div className="p-3 rounded-lg border border-card-edge bg-card-fill space-y-2">
              <div className="flex items-center gap-2 text-xs text-foreground font-medium">
                <span className="size-2 rounded-full bg-emerald-500" />
                <span>Operational</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                All WebSocket clusters and database replicas operating with sub-second latency.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom hairline & copyright */}
        <div className="pt-8 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>© 2026 BidNow. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <span>Built with the ChaiUI design system</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
