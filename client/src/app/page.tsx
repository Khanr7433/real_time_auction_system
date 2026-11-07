import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AnimatedBadge } from '@/components/ui/badge';
import { Gavel, Zap, ShieldCheck, Clock } from 'lucide-react';

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center p-6 sm:p-12 relative isolate overflow-x-clip">
      {/* Hero Section */}
      <section className="max-w-4xl w-full text-center py-16 sm:py-24 space-y-6">
        {/* Animated Badge */}
        <AnimatedBadge>
          <span className="size-2 rounded-full bg-emerald-500" />
          MCA Mini-Project Edition
        </AnimatedBadge>

        {/* Headline */}
        <h1 className="font-montserrat text-4xl sm:text-6xl font-semibold tracking-tight leading-tight">
          Real-time auctions with <span className="highlight">sub-second precision</span>
        </h1>

        {/* Lead */}
        <p className="mx-auto max-w-2xl text-base sm:text-lg text-neutral-600 dark:text-neutral-400">
          BidNow eliminates the traditional refresh button, delivering{' '}
          <span className="highlight">an instant live bidding experience</span> with synchronized server timers,
          anti-sniping protection, and real-time outbid notifications.
        </p>

        {/* Buttons */}
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/auctions">
            <Button variant="solid" size="lg" className="w-full sm:w-auto">
              Explore live auctions
            </Button>
          </Link>
          <Link href="/register">
            <Button variant="outline" size="lg" className="w-full sm:w-auto">
              Create an account
            </Button>
          </Link>
        </div>

        {/* Feature Highlights Grid */}
        <div className="pt-16 grid grid-cols-1 sm:grid-cols-3 gap-6 text-left">
          <div className="card-chai p-5 space-y-2">
            <div className="size-9 rounded-lg bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center text-foreground">
              <Zap className="size-5" />
            </div>
            <h3 className="font-montserrat font-semibold text-sm text-foreground">Sub-second updates</h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Live WebSocket rooms push bid increments and time checks instantly to all active watchers.
            </p>
          </div>

          <div className="card-chai p-5 space-y-2">
            <div className="size-9 rounded-lg bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center text-foreground">
              <Clock className="size-5" />
            </div>
            <h3 className="font-montserrat font-semibold text-sm text-foreground">Anti-sniping defense</h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Bids placed in the final 30 seconds automatically extend the auction clock by 60 seconds.
            </p>
          </div>

          <div className="card-chai p-5 space-y-2">
            <div className="size-9 rounded-lg bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center text-foreground">
              <ShieldCheck className="size-5" />
            </div>
            <h3 className="font-montserrat font-semibold text-sm text-foreground">Atomic OCC safety</h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Database version checks prevent collision conflicts during simultaneous high-velocity bids.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
