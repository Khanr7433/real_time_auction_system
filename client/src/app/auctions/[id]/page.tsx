'use client';

import React, { useState, useEffect, use, Suspense } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { getMediaUrl } from '@/lib/utils';
import { Auction } from '@/types/auction';
import { useAuth } from '@/context/AuthContext';
import { useSocket } from '@/context/SocketContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { LiveDot } from '@/components/ui/live-dot';
import { Alert } from '@/components/ui/alert';
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Clock,
  Shield,
  User,
  Tag,
  ArrowLeft,
  ArrowUpRight,
  AlertCircle,
  CheckCircle2,
  Zap,
  History,
  Flag,
} from 'lucide-react';

interface BidHistoryItem {
  _id: string;
  amount: number;
  createdAt: string;
  bidderName: string;
  bidderId?: string;
}

function AuctionDetailInner({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const auctionId = resolvedParams.id;

  const { user, isAuthenticated } = useAuth();
  const { socket, isConnected } = useSocket();

  const [auction, setAuction] = useState<Auction | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [bidAmount, setBidAmount] = useState<string>('');
  const [bidHistory, setBidHistory] = useState<BidHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Live feedback states
  const [bidError, setBidError] = useState<string | null>(null);
  const [bidSuccess, setBidSuccess] = useState<string | null>(null);
  const [isSubmittingBid, setIsSubmittingBid] = useState<boolean>(false);
  const [snipingNotice, setSnipingNotice] = useState<string | null>(null);
  const [endingSoonNotice, setEndingSoonNotice] = useState<string | null>(null);
  const [closedNotice, setClosedNotice] = useState<string | null>(null);

  // Dispute modal states
  const [isDisputeOpen, setIsDisputeOpen] = useState<boolean>(false);
  const [disputeTitle, setDisputeTitle] = useState<string>('');
  const [disputeDescription, setDisputeDescription] = useState<string>('');
  const [isSubmittingDispute, setIsSubmittingDispute] = useState<boolean>(false);
  const [disputeMessage, setDisputeMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleFileDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disputeDescription.trim()) return;

    setIsSubmittingDispute(true);
    setDisputeMessage(null);
    try {
      await api.post('/disputes', {
        auctionId,
        title: disputeTitle.trim() || undefined,
        description: disputeDescription.trim(),
      });
      setDisputeMessage({
        type: 'success',
        text: 'Dispute submitted successfully and queued for admin review.',
      });
      setTimeout(() => {
        setIsDisputeOpen(false);
        setDisputeTitle('');
        setDisputeDescription('');
        setDisputeMessage(null);
      }, 2000);
    } catch (err: any) {
      setDisputeMessage({
        type: 'error',
        text: err.message || 'Failed to submit dispute',
      });
    } finally {
      setIsSubmittingDispute(false);
    }
  };

  // Initial load via REST API
  useEffect(() => {
    async function loadAuction() {
      setIsLoading(true);
      try {
        const data = await api.get(`/auctions/${auctionId}`);
        setAuction(data);
        if (data.images && data.images.length > 0) {
          setSelectedImage(data.images[0]);
        }
        if (data.timeRemainingSeconds !== undefined) {
          setTimeRemaining(data.timeRemainingSeconds);
        }

        // Fetch initial bid history ledger
        try {
          const bidsRes = await api.get(`/auctions/${auctionId}/bids`);
          if (bidsRes && Array.isArray(bidsRes.bids)) {
            setBidHistory(bidsRes.bids);
          }
        } catch {
          // Non-blocking fallback
        }
      } catch (err: any) {
        setError(err.message || 'Auction listing not found');
      } finally {
        setIsLoading(false);
      }
    }

    loadAuction();
  }, [auctionId]);

  // Client-side ticking countdown for smooth second-by-second updates
  useEffect(() => {
    if (timeRemaining === null || timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => (prev !== null && prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining]);

  // Real-time WebSocket room subscription & listeners
  useEffect(() => {
    if (!socket || !auctionId) return;

    // Join the auction room
    socket.emit('join_auction', { auctionId });

    // Handle initial state from room
    const handleAuctionState = (state: any) => {
      if (state.auctionId === auctionId) {
        setAuction((prev) =>
          prev
            ? {
                ...prev,
                currentBid: state.currentBid ?? prev.currentBid,
                bidCount: state.bidCount ?? prev.bidCount,
                highestBidderId: state.highestBidderId ?? prev.highestBidderId,
                status: state.status ?? prev.status,
              }
            : null
        );
        if (state.secondsLeft !== undefined) {
          setTimeRemaining(state.secondsLeft);
        }
      }
    };

    // Handle real-time bid updates
    const handleBidUpdated = (data: any) => {
      if (data.auctionId === auctionId) {
        setAuction((prev) =>
          prev
            ? {
                ...prev,
                currentBid: data.currentBid,
                bidCount: data.bidCount,
                highestBidderId: data.highestBidderId,
              }
            : null
        );

        if (data.secondsLeft !== undefined) {
          setTimeRemaining(data.secondsLeft);
        }

        // Prepend new bid to live history ledger
        const rawName = data.bidderName || 'Bidder';
        const masked =
          rawName.length > 2
            ? `${rawName[0]}***${rawName[rawName.length - 1]}`
            : `${rawName[0]}*`;

        setBidHistory((prev) => [
          {
            _id: `bid-${Date.now()}`,
            amount: data.currentBid,
            createdAt: new Date().toISOString(),
            bidderName: masked,
            bidderId: data.highestBidderId,
          },
          ...prev,
        ]);

        setIsSubmittingBid(false);
        setBidError(null);
        setBidSuccess(
          `Bid of $${data.currentBid.toLocaleString()} accepted${
            data.bidderName ? ` from ${data.bidderName}` : ''
          }!`
        );

        // Auto-dismiss success banner
        setTimeout(() => setBidSuccess(null), 5000);
      }
    };

    // Handle bid rejection
    const handleBidRejected = (data: any) => {
      setIsSubmittingBid(false);
      setBidError(data.reason || 'Bid was rejected');
      setTimeout(() => setBidError(null), 6000);
    };

    // Handle timer sync & anti-sniping extension
    const handleTimeRemaining = (data: any) => {
      if (data.auctionId === auctionId && data.secondsLeft !== undefined) {
        setTimeRemaining(data.secondsLeft);
        if (data.antiSnipingExtended) {
          setSnipingNotice('Anti-sniping triggered! Timer extended by 60 seconds.');
          setTimeout(() => setSnipingNotice(null), 6000);
        }
      }
    };

    // Handle 5-minute warning
    const handleEndingSoon = (data: any) => {
      if (data.auctionId === auctionId) {
        setEndingSoonNotice(data.message || 'Warning: Auction ending in less than 5 minutes!');
      }
    };

    // Handle auction close
    const handleAuctionEnded = (data: any) => {
      if (data.auctionId === auctionId) {
        setTimeRemaining(0);
        setAuction((prev) => (prev ? { ...prev, status: data.status } : null));
        setClosedNotice(
          data.winnerId
            ? `Auction ended! Winning bid: $${data.finalBid?.toLocaleString() || ''}`
            : 'Auction ended with no winning bids.'
        );
      }
    };

    socket.on('auction_state', handleAuctionState);
    socket.on('bid_updated', handleBidUpdated);
    socket.on('bid_rejected', handleBidRejected);
    socket.on('time_remaining', handleTimeRemaining);
    socket.on('auction_ending_soon', handleEndingSoon);
    socket.on('auction_ended', handleAuctionEnded);

    return () => {
      socket.emit('leave_auction', { auctionId });
      socket.off('auction_state', handleAuctionState);
      socket.off('bid_updated', handleBidUpdated);
      socket.off('bid_rejected', handleBidRejected);
      socket.off('time_remaining', handleTimeRemaining);
      socket.off('auction_ending_soon', handleEndingSoon);
      socket.off('auction_ended', handleAuctionEnded);
    };
  }, [socket, auctionId]);

  const handlePlaceBid = (e: React.FormEvent) => {
    e.preventDefault();
    setBidError(null);
    setBidSuccess(null);

    if (!auction) return;

    const numBid = Number(bidAmount);
    if (isNaN(numBid) || numBid <= auction.currentBid) {
      setBidError(`Bid must be at least $${(auction.currentBid + 1).toLocaleString()}`);
      return;
    }

    const sellerId = typeof auction.sellerId === 'object' ? auction.sellerId._id : auction.sellerId;
    if (user?.id && sellerId && sellerId.toString() === user.id) {
      setBidError('You cannot bid on your own auction listing');
      return;
    }

    if (!socket || !isConnected) {
      setBidError('Connecting to live bidding server... Please try again in a moment.');
      return;
    }

    setIsSubmittingBid(true);
    socket.emit('place_bid', {
      auctionId,
      amount: numBid,
    });

    setBidAmount('');
  };

  const formatCountdown = (totalSec: number | null) => {
    if (totalSec === null) return '--:--:--';
    if (totalSec <= 0) return 'Auction closed';
    const hours = Math.floor(totalSec / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto p-6 sm:p-12">
        <div className="card-chai h-96 animate-pulse bg-neutral-200/50 dark:bg-neutral-800/50" />
      </div>
    );
  }

  if (error || !auction) {
    return (
      <div className="max-w-4xl mx-auto p-6 sm:p-12 text-center space-y-4">
        <p className="text-base text-red-500">{error || 'Auction not found'}</p>
        <Link href="/auctions">
          <Button variant="outline" size="sm">
            <ArrowLeft className="size-4 mr-1" /> Back to auctions
          </Button>
        </Link>
      </div>
    );
  }

  const isClosed = (timeRemaining ?? 0) <= 0 || auction.status !== 'live';
  const minRequiredBid = auction.currentBid + 1;
  const sellerObj = typeof auction.sellerId === 'object' ? auction.sellerId : null;
  const isSeller = Boolean(user?.id && sellerObj && (sellerObj._id === user.id || sellerObj.id === user.id));

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-8 space-y-6">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/auctions"
          className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-3.5" /> Back to all listings
        </Link>
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border border-neutral-200 dark:border-neutral-800 bg-neutral-100/50 dark:bg-black/40">
            <LiveDot tone={isConnected ? 'success' : 'warning'} />
            <span>{isConnected ? 'Live updates' : 'Connecting'}</span>
          </div>
          <span className="text-xs uppercase tracking-wider font-semibold px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
            {auction.condition}
          </span>
        </div>
      </div>

      {/* Notifications and Alerts */}
      {snipingNotice && (
        <Alert tone="warning" title="Anti-Sniping Active">
          {snipingNotice}
        </Alert>
      )}

      {endingSoonNotice && (
        <Alert tone="danger" title="Auction Ending Soon">
          {endingSoonNotice}
        </Alert>
      )}

      {closedNotice && (
        <Alert tone="info" title="Auction Closed">
          {closedNotice}
        </Alert>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Image Gallery (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="relative aspect-4/3 w-full rounded-2xl overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900/60 flex items-center justify-center">
            {selectedImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={getMediaUrl(selectedImage)}
                alt={auction.title}
                className="size-full object-cover object-center"
              />
            ) : (
              <div className="text-neutral-400 text-sm">No image provided</div>
            )}
          </div>

          {/* Thumbnails */}
          {auction.images && auction.images.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {auction.images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImage(img)}
                  className={`relative size-20 shrink-0 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                    selectedImage === img
                      ? 'border-yellow-800 dark:border-orange-100 scale-102'
                      : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={getMediaUrl(img)}
                    alt={`Thumbnail ${idx + 1}`}
                    className="size-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}

          {/* Item Description Card */}
          <Card className="space-y-3">
            <h2 className="font-display font-semibold text-lg text-foreground">About this item</h2>
            <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-300 whitespace-pre-line">
              {auction.description}
            </p>
          </Card>

          {/* Bid History Ledger Card */}
          <Card className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display font-semibold text-lg text-foreground flex items-center gap-2">
                <History className="size-4.5 text-neutral-400" /> Live Bid Ledger
              </h2>
              <Chip tone="default">
                {bidHistory.length} {bidHistory.length === 1 ? 'bid' : 'bids'}
              </Chip>
            </div>

            {bidHistory.length === 0 ? (
              <p className="text-xs text-neutral-500 py-4 text-center">
                No bids placed yet. Be the first to place a live bid!
              </p>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto divide-y divide-neutral-200/60 dark:divide-neutral-800/60 pr-1">
                {bidHistory.map((item, idx) => (
                  <div
                    key={item._id || idx}
                    className="flex items-center justify-between pt-2.5 first:pt-0 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <div className="size-6 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-[10px] font-semibold text-neutral-600 dark:text-neutral-300">
                        {idx === 0 ? '★' : `#${bidHistory.length - idx}`}
                      </div>
                      <span className="font-medium text-foreground">{item.bidderName}</span>
                      {idx === 0 && (
                        <Chip tone="success" className="text-[10px] py-0 px-1.5">
                          Highest
                        </Chip>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-montserrat font-bold text-sm text-foreground">
                        ${item.amount.toLocaleString()}
                      </span>
                      <span className="text-[11px] text-neutral-400">
                        {new Date(item.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Right Column: Bidding Action Card (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-neutral-500">
                <Tag className="size-3.5" />
                <span>{auction.category}</span>
              </div>
              <h1 className="font-display text-2xl font-bold tracking-tight text-foreground leading-snug">
                {auction.title}
              </h1>
            </div>

            {/* Countdown Banner */}
            <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-100/60 dark:bg-black/30 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400">
                <Clock className="size-4 text-yellow-800 dark:text-orange-200" />
                <span>Time remaining:</span>
              </div>
              <span className="font-mono text-lg font-bold text-foreground">
                {formatCountdown(timeRemaining)}
              </span>
            </div>

            {/* Price Box */}
            <div className="p-4 rounded-xl border border-neutral-200/80 dark:border-neutral-800/80 space-y-1">
              <span className="text-xs text-neutral-500">Current highest bid</span>
              <div className="flex items-baseline justify-between">
                <span className="font-display text-3xl font-extrabold text-foreground">
                  ${auction.currentBid.toLocaleString()}
                </span>
                <span className="text-xs text-neutral-500">
                  {auction.bidCount} {auction.bidCount === 1 ? 'bid' : 'bids'} placed
                </span>
              </div>
              <p className="text-[11px] text-neutral-500 pt-1">
                Starting bid was ${auction.startingBid.toLocaleString()}
              </p>
            </div>

            {/* Bidding Feedback Messages */}
            {bidSuccess && (
              <div className="p-3 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-xs flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5 shrink-0" />
                <span>{bidSuccess}</span>
              </div>
            )}

            {bidError && (
              <div className="p-3 rounded-md bg-red-500/10 border border-red-500/30 text-red-500 text-xs flex items-center gap-1.5">
                <AlertCircle className="size-3.5 shrink-0" />
                <span>{bidError}</span>
              </div>
            )}

            {/* Bid Placement Form */}
            <div className="space-y-3 pt-2 border-t border-neutral-200 dark:border-neutral-800">
              {isClosed ? (
                <div className="p-3 text-xs text-center rounded-md bg-neutral-200/50 dark:bg-neutral-800/50 text-neutral-500">
                  This auction is closed and no longer accepting bids.
                </div>
              ) : isSeller ? (
                <div className="p-3 text-xs text-center rounded-md bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-500">
                  You are the seller of this auction listing.
                </div>
              ) : !isAuthenticated ? (
                <div className="space-y-3 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/40 text-center">
                  <p className="text-xs text-neutral-600 dark:text-neutral-400">
                    You must sign in to place live bids on this listing.
                  </p>
                  <Link href="/login" className="block">
                    <Button variant="solid" size="md" className="w-full">
                      Sign in to bid
                    </Button>
                  </Link>
                </div>
              ) : (
                <form onSubmit={handlePlaceBid} className="space-y-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                        Your bid amount ($)
                      </label>
                      <span className="text-[11px] text-neutral-500">
                        Minimum: ${minRequiredBid.toLocaleString()}
                      </span>
                    </div>
                    <Input
                      type="number"
                      min={minRequiredBid}
                      step="1"
                      placeholder={`Enter at least $${minRequiredBid}`}
                      value={bidAmount}
                      onChange={(e) => setBidAmount(e.target.value)}
                      disabled={isSubmittingBid}
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    variant="solid"
                    size="lg"
                    className="w-full"
                    disabled={isSubmittingBid || !isConnected}
                  >
                    {isSubmittingBid ? 'Placing bid...' : 'Place live bid'}
                  </Button>

                  <p className="text-[11px] text-neutral-500 text-center flex items-center justify-center gap-1">
                    <AlertCircle className="size-3" /> Anti-sniping active: bids under 30s extend time by 1m
                  </p>
                </form>
              )}
            </div>
          </Card>

          {/* Seller Profile Summary */}
          <Card className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center font-bold text-foreground">
              {sellerObj?.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={getMediaUrl(sellerObj.avatar)}
                  alt={sellerObj.displayName}
                  className="size-full rounded-full object-cover"
                />
              ) : (
                sellerObj?.displayName?.[0]?.toUpperCase() || <User className="size-5" />
              )}
            </div>
            <div>
              <p className="font-display text-sm font-semibold text-foreground">
                {sellerObj?.displayName || 'Verified Seller'}
              </p>
              <p className="text-[11px] text-neutral-500 flex items-center gap-1">
                <Shield className="size-3 text-emerald-500" /> Community Member
              </p>
            </div>
          </Card>

          {/* Dispute / Reporting Link */}
          {isAuthenticated && (
            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => setIsDisputeOpen(true)}
                className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-red-500 transition-colors cursor-pointer"
              >
                <Flag className="size-3" /> Report an issue or dispute with this listing
              </button>
            </div>
          )}
        </div>
      </div>

      {/* File Dispute Dialog */}
      <Dialog open={isDisputeOpen} onClose={() => setIsDisputeOpen(false)}>
        <DialogHeader>
          <DialogTitle>File a Dispute</DialogTitle>
          <DialogDescription>
            Submit an official dispute regarding &quot;{auction.title}&quot;. Our administration team will review all details and evidence.
          </DialogDescription>
        </DialogHeader>

        {disputeMessage && (
          <div
            className={`p-3 rounded-md text-xs mb-3 ${
              disputeMessage.type === 'success'
                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-500'
                : 'bg-red-500/10 border border-red-500/30 text-red-500'
            }`}
          >
            {disputeMessage.text}
          </div>
        )}

        <form onSubmit={handleFileDispute} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
              Dispute Title (Optional)
            </label>
            <Input
              type="text"
              placeholder="e.g. Item not as described, suspicious bidding"
              value={disputeTitle}
              onChange={(e) => setDisputeTitle(e.target.value)}
              disabled={isSubmittingDispute}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
              Description of the Issue <span className="text-red-400">*</span>
            </label>
            <Textarea
              rows={4}
              placeholder="Describe the problem, communication breakdown, or listing inaccuracy in detail..."
              value={disputeDescription}
              onChange={(e) => setDisputeDescription(e.target.value)}
              disabled={isSubmittingDispute}
              required
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsDisputeOpen(false)}
              disabled={isSubmittingDispute}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="outline"
              size="sm"
              disabled={isSubmittingDispute || !disputeDescription.trim()}
            >
              {isSubmittingDispute ? 'Submitting...' : 'Submit dispute'}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </div>
  );
}

export default function AuctionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense
      fallback={
        <div className="max-w-6xl mx-auto p-6 sm:p-12">
          <div className="card-chai h-96 animate-pulse bg-neutral-200/50 dark:bg-neutral-800/50" />
        </div>
      }
    >
      <AuctionDetailInner params={params} />
    </Suspense>
  );
}
