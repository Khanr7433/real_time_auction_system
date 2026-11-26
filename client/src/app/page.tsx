import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AnimatedBadge } from '@/components/animated-badge';
import {
  Gavel,
  Zap,
  ShieldCheck,
  Clock,
  UserPlus,
  Search,
  Trophy,
  FileText,
} from 'lucide-react';

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center p-6 sm:p-12 relative isolate overflow-x-clip">
      {/* Hero Section */}
      <section className="max-w-4xl w-full text-center pt-16 pb-12 sm:pt-24 sm:pb-20 space-y-6">
        {/* Animated Badge */}
        <AnimatedBadge>
          <span className="size-2 rounded-full bg-emerald-500" />
          Live real-time auction platform
        </AnimatedBadge>

        {/* Headline */}
        <h1 className="text-[42px] md:text-6xl lg:text-7xl font-semibold tracking-tight leading-[1.08] text-foreground">
          Real-time auctions with <span className="highlight">sub-second precision</span>
        </h1>

        {/* Lead */}
        <p className="mx-auto max-w-2xl text-base md:text-xl text-neutral-600 dark:text-neutral-400">
          BidNow eliminates the traditional refresh button, delivering{' '}
          <span className="highlight">an instant live bidding experience</span> with synchronized server timers,
          anti-sniping protection, and real-time outbid notifications.
        </p>

        {/* Action Buttons */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button asChild variant="solid" size="lg" className="w-full sm:w-auto">
            <Link href="/auctions">Explore live auctions</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
            <Link href="/register">Create an account</Link>
          </Button>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="max-w-6xl w-full py-16 sm:py-20 space-y-10 border-t border-neutral-200/60 dark:border-neutral-800/60">
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <h2 className="text-2xl sm:text-[30px] font-medium tracking-tight text-foreground">
            How the auction <span className="highlight">lifecycle operates</span>
          </h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            From initial catalog discovery to final settlement, every step executes through synchronized server events.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="card-chai p-6 space-y-3">
            <div className="size-10 rounded-lg bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center text-foreground">
              <UserPlus className="size-5" />
            </div>
            <h3 className="font-display font-semibold text-sm text-foreground">1. Register and verify</h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
              Create an account in seconds to unlock live bidding, instant outbid alerts, and personal watchlist tracking.
            </p>
          </div>

          <div className="card-chai p-6 space-y-3">
            <div className="size-10 rounded-lg bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center text-foreground">
              <Search className="size-5" />
            </div>
            <h3 className="font-display font-semibold text-sm text-foreground">2. Discover listings</h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
              Browse active lots with live synchronized countdown clocks, verified item media, and starting bid baselines.
            </p>
          </div>

          <div className="card-chai p-6 space-y-3">
            <div className="size-10 rounded-lg bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center text-foreground">
              <Gavel className="size-5" />
            </div>
            <h3 className="font-display font-semibold text-sm text-foreground">3. Compete in real time</h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
              Place instantaneous increments with zero page refreshes. Anti-sniping logic extends time if bids land near closing.
            </p>
          </div>

          <div className="card-chai p-6 space-y-3">
            <div className="size-10 rounded-lg bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center text-foreground">
              <Trophy className="size-5" />
            </div>
            <h3 className="font-display font-semibold text-sm text-foreground">4. Win and settle</h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
              Winning bids settle instantaneously upon timer expiration with immutable audit records and automated alerts.
            </p>
          </div>
        </div>
      </section>

      {/* Architecture & Reliability Section */}
      <section className="max-w-6xl w-full py-16 sm:py-20 space-y-10 border-t border-neutral-200/60 dark:border-neutral-800/60">
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <h2 className="text-2xl sm:text-[30px] font-medium tracking-tight text-foreground">
            Engineered with <span className="highlight">resilient architecture</span>
          </h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Constructed to guarantee race condition immunity and reliable outbid notifications during peak traffic.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="card-chai p-6 space-y-3">
            <div className="size-10 rounded-lg bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center text-foreground">
              <Zap className="size-5" />
            </div>
            <h3 className="font-display font-semibold text-sm text-foreground">Sub-second room sync</h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
              WebSocket rooms broadcast bid increments and participant counts with sub-second latency across all spectators.
            </p>
          </div>

          <div className="card-chai p-6 space-y-3">
            <div className="size-10 rounded-lg bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center text-foreground">
              <Clock className="size-5" />
            </div>
            <h3 className="font-display font-semibold text-sm text-foreground">Anti-sniping defense</h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
              Bids placed in the final 30 seconds automatically extend the auction clock by 60 seconds to prevent bot sniping.
            </p>
          </div>

          <div className="card-chai p-6 space-y-3">
            <div className="size-10 rounded-lg bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center text-foreground">
              <ShieldCheck className="size-5" />
            </div>
            <h3 className="font-display font-semibold text-sm text-foreground">Atomic OCC safety</h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
              Database document version checks prevent collision conflicts during simultaneous high-velocity bidding bursts.
            </p>
          </div>

          <div className="card-chai p-6 space-y-3">
            <div className="size-10 rounded-lg bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center text-foreground">
              <FileText className="size-5" />
            </div>
            <h3 className="font-display font-semibold text-sm text-foreground">Audit ledger feed</h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
              Every bid is appended to a chronological audit feed, ensuring verifiable transaction provenance and transparency.
            </p>
          </div>
        </div>
      </section>

      {/* Secondary Call to Action */}
      <section className="max-w-4xl w-full py-16 sm:py-24 border-t border-neutral-200/60 dark:border-neutral-800/60">
        <div className="card-chai p-8 sm:p-12 text-center space-y-6">
          <h2 className="text-2xl sm:text-[32px] font-medium tracking-tight text-foreground">
            Experience <span className="highlight">frictionless live bidding</span>
          </h2>
          <p className="mx-auto max-w-xl text-sm sm:text-base text-neutral-500 dark:text-neutral-400 leading-relaxed">
            Join collectors and traders participating in auctions with transparent real-time updates and guaranteed execution safety.
          </p>
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button asChild variant="soft" size="lg" className="w-full sm:w-auto">
              <Link href="/auctions">Explore active auctions</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
              <Link href="/register">Create account</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
