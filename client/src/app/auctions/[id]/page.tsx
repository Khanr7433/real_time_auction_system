'use client';

import React, { useState, useEffect, use, Suspense } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Auction } from '@/types/auction';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Clock, Shield, User, Tag, ArrowLeft, ArrowUpRight, AlertCircle } from 'lucide-react';

function AuctionDetailInner({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const auctionId = resolvedParams.id;

  const { user, isAuthenticated } = useAuth();
  const [auction, setAuction] = useState<Auction | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [bidAmount, setBidAmount] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

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
      } catch (err: any) {
        setError(err.message || 'Auction listing not found');
      } finally {
        setIsLoading(false);
      }
    }

    loadAuction();
  }, [auctionId]);

  // Client-side ticking countdown
  useEffect(() => {
    if (timeRemaining === null || timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => (prev !== null && prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining]);

  const formatCountdown = (totalSec: number | null) => {
    if (totalSec === null) return '--:--:--';
    if (totalSec <= 0) return 'Auction closed';
    const hours = Math.floor(totalSec / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const getFullImageUrl = (pathUrl: string) => {
    if (!pathUrl) return '';
    if (pathUrl.startsWith('http')) return pathUrl;
    const base = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';
    return `${base}${pathUrl}`;
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

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-8 space-y-6">
      {/* Back button */}
      <div>
        <Link
          href="/auctions"
          className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-3.5" /> Back to all auctions
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Image Gallery (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="aspect-[4/3] w-full rounded-xl overflow-hidden bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 relative">
            {selectedImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={getFullImageUrl(selectedImage)}
                alt={auction.title}
                className="size-full object-cover"
              />
            ) : (
              <div className="size-full flex items-center justify-center text-neutral-400 text-sm">
                No images available
              </div>
            )}

            {/* Condition tag */}
            <span className="absolute top-3 left-3 text-xs font-medium px-2.5 py-1 rounded-full bg-black/70 text-white backdrop-blur-md capitalize">
              {auction.condition}
            </span>

            {/* Live Status Badge */}
            <span
              className={`absolute top-3 right-3 text-xs font-medium px-3 py-1 rounded-full backdrop-blur-md flex items-center gap-1.5 ${
                isClosed
                  ? 'bg-neutral-900/80 text-neutral-400'
                  : 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/30'
              }`}
            >
              {!isClosed && <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />}
              {isClosed ? 'Ended' : 'Live Bidding'}
            </span>
          </div>

          {/* Thumbnails */}
          {auction.images && auction.images.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {auction.images.map((img, idx) => {
                const isSelected = selectedImage === img;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedImage(img)}
                    className={`size-18 rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                      isSelected ? 'border-yellow-800 dark:border-orange-200' : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={getFullImageUrl(img)}
                      alt={`Thumbnail ${idx + 1}`}
                      className="size-full object-cover"
                    />
                  </button>
                );
              })}
            </div>
          )}

          {/* Description Section */}
          <div className="pt-6 border-t border-neutral-200 dark:border-neutral-800 space-y-3">
            <h2 className="font-montserrat font-semibold text-lg text-foreground">About this item</h2>
            <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-300 whitespace-pre-line">
              {auction.description}
            </p>
          </div>
        </div>

        {/* Right Column: Bidding & Information Box (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Main Info Card */}
          <Card className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-neutral-500">
                <Tag className="size-3.5" />
                <span>{auction.category}</span>
              </div>
              <h1 className="font-montserrat text-2xl font-bold tracking-tight text-foreground leading-snug">
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
                <span className="font-montserrat text-3xl font-extrabold text-foreground">
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

            {/* Bid Placement Form */}
            <div className="space-y-3 pt-2 border-t border-neutral-200 dark:border-neutral-800">
              {isClosed ? (
                <div className="p-3 text-xs text-center rounded-md bg-neutral-200/50 dark:bg-neutral-800/50 text-neutral-500">
                  This auction is no longer accepting bids.
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
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    // Socket bidding integration will be handled in Phase 4
                    alert(`Bid of $${bidAmount} received (Real-time socket engine ready in Phase 4).`);
                  }}
                  className="space-y-3"
                >
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
                      required
                    />
                  </div>

                  <Button type="submit" variant="solid" size="lg" className="w-full">
                    Place bid <ArrowUpRight className="size-4" />
                  </Button>

                  <p className="text-[11px] text-neutral-500 text-center flex items-center justify-center gap-1">
                    <AlertCircle className="size-3" /> Anti-sniping active: bids under 30s extend time by 1m
                  </p>
                </form>
              )}
            </div>
          </Card>

          {/* Seller Card */}
          <Card className="p-4 space-y-3">
            <h3 className="font-montserrat text-xs font-semibold text-neutral-500 uppercase tracking-wider">
              Seller information
            </h3>
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-full bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center font-bold text-foreground">
                {sellerObj?.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={sellerObj.avatar} alt={sellerObj.displayName} className="size-full rounded-full object-cover" />
                ) : (
                  sellerObj?.displayName?.[0]?.toUpperCase() || <User className="size-5" />
                )}
              </div>
              <div>
                <p className="font-montserrat text-sm font-semibold text-foreground">
                  {sellerObj?.displayName || 'Verified Seller'}
                </p>
                <p className="text-[11px] text-neutral-500 flex items-center gap-1">
                  <Shield className="size-3 text-emerald-500" /> Community Member
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
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
