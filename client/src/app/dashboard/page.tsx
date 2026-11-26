'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api, ApiError } from '@/lib/api';
import { getMediaUrl } from '@/lib/utils';
import { Auction } from '@/types/auction';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { Alert } from '@/components/ui/alert';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Segmented } from '@/components/ui/segmented';
import { Plus, Edit, Trash2, Lock, Eye, AlertCircle, RefreshCw, Trophy, Gavel, Clock, CheckCircle2 } from 'lucide-react';

interface UserBidItem {
  auction: Auction;
  myHighestBid: number;
  lastBidAt: string;
  totalUserBids: number;
  isWinning: boolean;
  timeRemainingSeconds: number;
}

export default function SellerDashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const [activeTab, setActiveTab] = useState<'listings' | 'bids' | 'won'>('listings');
  const [myListings, setMyListings] = useState<Auction[]>([]);
  const [myBids, setMyBids] = useState<UserBidItem[]>([]);
  const [wonAuctions, setWonAuctions] = useState<Auction[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  const loadMyListings = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    setActionError(null);
    try {
      const res = await api.get(`/auctions?sellerId=${user.id}&status=all&limit=50`);
      setMyListings(res.auctions || []);
    } catch (err: any) {
      setMyListings([]);
      setActionError(err instanceof ApiError ? err.message : (err?.message || 'Failed to load your listings'));
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const loadMyBids = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    setActionError(null);
    try {
      const res = await api.get('/users/bids');
      setMyBids(res.bids || []);
    } catch (err: any) {
      setMyBids([]);
      setActionError(err instanceof ApiError ? err.message : (err?.message || 'Failed to load your bids'));
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const loadWonAuctions = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    setActionError(null);
    try {
      const res = await api.get('/users/won');
      setWonAuctions(res.auctions || []);
    } catch (err: any) {
      setWonAuctions([]);
      setActionError(err instanceof ApiError ? err.message : (err?.message || 'Failed to load won auctions'));
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let isMounted = true;

    async function prefetchDashboard() {
      setIsLoading(true);
      setActionError(null);
      const [listingsRes, bidsRes, wonRes] = await Promise.allSettled([
        api.get(`/auctions?sellerId=${user!.id}&status=all&limit=50`),
        api.get('/users/bids'),
        api.get('/users/won'),
      ]);

      if (!isMounted) return;

      const errors: string[] = [];
      if (listingsRes.status === 'fulfilled') {
        setMyListings(listingsRes.value?.auctions || []);
      } else {
        setMyListings([]);
        errors.push(listingsRes.reason?.message || 'Failed to load listings');
      }

      if (bidsRes.status === 'fulfilled') {
        setMyBids(bidsRes.value?.bids || []);
      } else {
        setMyBids([]);
        errors.push(bidsRes.reason?.message || 'Failed to load bids');
      }

      if (wonRes.status === 'fulfilled') {
        setWonAuctions(wonRes.value?.auctions || []);
      } else {
        setWonAuctions([]);
        errors.push(wonRes.reason?.message || 'Failed to load won auctions');
      }

      if (errors.length > 0) {
        setActionError(errors[0]);
      }
      setIsLoading(false);
    }

    prefetchDashboard();

    return () => {
      isMounted = false;
    };
  }, [user]);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setActionError(null);
    try {
      await api.delete(`/auctions/${deleteTarget.id}`);
      setMyListings((prev) => prev.filter((a) => a._id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err: any) {
      setActionError(err.message || 'Failed to delete auction');
    } finally {
      setIsDeleting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="max-w-6xl mx-auto p-6 sm:p-12">
        <p className="text-sm text-neutral-500">Checking credentials...</p>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-8 space-y-8">
      {/* Top Banner & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight">Seller dashboard</h1>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Track your listings, active bidding activity, and <span className="highlight">won auctions</span>.
          </p>
        </div>

        <Link href="/dashboard/create">
          <Button variant="solid" size="md">
            <Plus className="size-4" /> Create new listing
          </Button>
        </Link>
      </div>

      {actionError && (
        <Alert tone="danger" title="Error" onDismiss={() => setActionError(null)}>
          {actionError}
        </Alert>
      )}

      {/* Segmented Navigation */}
      <div className="overflow-x-auto pb-1 scrollbar-none">
        <Segmented<'listings' | 'bids' | 'won'>
          options={[
            { value: 'listings', label: 'My Listings', count: myListings.length },
            { value: 'bids', label: 'My Bids', count: myBids.length },
            { value: 'won', label: 'Won Auctions', count: wonAuctions.length },
          ]}
          value={activeTab}
          onChange={setActiveTab}
        />
      </div>

      {/* Tab Content: Listings */}
      {activeTab === 'listings' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-neutral-500">
            <span>Manage your auction products</span>
            <button
              onClick={loadMyListings}
              className="flex items-center gap-1 hover:text-foreground cursor-pointer"
            >
              <RefreshCw className={`size-3 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="card-chai h-20 animate-pulse bg-neutral-200/50 dark:bg-neutral-800/50" />
              ))}
            </div>
          ) : myListings.length === 0 ? (
            <Card className="text-center py-12 space-y-3">
              <p className="text-base font-medium text-foreground">You have not created any listings yet</p>
              <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                List an item for auction to start receiving bids in real-time.
              </p>
              <Link href="/dashboard/create">
                <Button variant="soft" size="sm">
                  Create your first listing
                </Button>
              </Link>
            </Card>
          ) : (
            <div className="space-y-3">
              {myListings.map((listing) => {
                const isLocked = listing.bidCount > 0 || listing.status !== 'live';
                return (
                  <div
                    key={listing._id}
                    className="card-chai p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className="size-14 rounded-lg bg-neutral-100 dark:bg-neutral-900 overflow-hidden shrink-0 border border-neutral-200 dark:border-neutral-800">
                        {listing.images && listing.images.length > 0 ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={getMediaUrl(listing.images[0])}
                            alt={listing.title}
                            className="size-full object-cover"
                          />
                        ) : (
                          <div className="size-full flex items-center justify-center text-[10px] text-neutral-400">
                            No img
                          </div>
                        )}
                      </div>

                      <div className="space-y-1">
                        <Link
                          href={`/auctions/${listing._id}`}
                          className="font-montserrat font-semibold text-sm text-foreground hover:text-brand"
                        >
                          {listing.title}
                        </Link>
                        <div className="flex items-center gap-3 text-xs text-neutral-500">
                          <span>Starting: ${listing.startingBid}</span>
                          <span>•</span>
                          <span className="font-semibold text-foreground">
                            Current: ${listing.currentBid}
                          </span>
                          <span>•</span>
                          <span>{listing.bidCount} {listing.bidCount === 1 ? 'bid' : 'bids'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <Link href={`/auctions/${listing._id}`}>
                        <Button variant="ghost" size="sm" title="View listing">
                          <Eye className="size-4" />
                        </Button>
                      </Link>

                      {isLocked ? (
                        <Chip
                          tone={listing.status === 'admin-terminated' ? 'danger' : 'default'}
                          title={listing.bidCount > 0 ? 'Locked after first bid' : `Status: ${listing.status}`}
                        >
                          <Lock className="size-3" /> {listing.bidCount > 0 && listing.status === 'live' ? 'Locked' : listing.status}
                        </Chip>
                      ) : (
                        <>
                          <Link href={`/dashboard/edit/${listing._id}`}>
                            <Button variant="outline" size="sm" title="Edit listing">
                              <Edit className="size-4" />
                            </Button>
                          </Link>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => setDeleteTarget({ id: listing._id, title: listing.title })}
                            title="Delete listing"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab Content: Bids */}
      {activeTab === 'bids' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-neutral-500">
            <span>Auctions you have actively placed bids on</span>
            <button
              onClick={loadMyBids}
              className="flex items-center gap-1 hover:text-foreground cursor-pointer"
            >
              <RefreshCw className={`size-3 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="card-chai h-20 animate-pulse bg-neutral-200/50 dark:bg-neutral-800/50" />
              ))}
            </div>
          ) : myBids.length === 0 ? (
            <Card className="text-center py-12 space-y-3">
              <p className="text-base font-medium text-foreground">You have not placed bids on any auctions yet</p>
              <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                Explore active auctions and place bids in real-time.
              </p>
              <Link href="/auctions">
                <Button variant="soft" size="sm">
                  Browse live auctions
                </Button>
              </Link>
            </Card>
          ) : (
            <div className="space-y-3">
              {myBids.map((item) => (
                <div
                  key={item.auction._id}
                  className="card-chai p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/auctions/${item.auction._id}`}
                        className="font-montserrat font-semibold text-sm text-foreground hover:text-brand"
                      >
                        {item.auction.title}
                      </Link>
                      <Chip tone={item.isWinning ? 'success' : 'warning'} dot>
                        {item.isWinning ? 'Winning' : 'Outbid'}
                      </Chip>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-neutral-500">
                      <span>Your highest: <strong className="text-foreground">${item.myHighestBid.toLocaleString()}</strong></span>
                      <span>•</span>
                      <span>Current: <strong className="text-foreground">${item.auction.currentBid.toLocaleString()}</strong></span>
                      <span>•</span>
                      <span>{item.totalUserBids} {item.totalUserBids === 1 ? 'bid placed' : 'bids placed'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <Link href={`/auctions/${item.auction._id}`}>
                      <Button variant="outline" size="sm">
                        View live room
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab Content: Won */}
      {activeTab === 'won' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-neutral-500">
            <span>Auctions you have won</span>
            <button
              onClick={loadWonAuctions}
              className="flex items-center gap-1 hover:text-foreground cursor-pointer"
            >
              <RefreshCw className={`size-3 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="card-chai h-20 animate-pulse bg-neutral-200/50 dark:bg-neutral-800/50" />
              ))}
            </div>
          ) : wonAuctions.length === 0 ? (
            <Card className="text-center py-12 space-y-3">
              <p className="text-base font-medium text-foreground">No won auctions yet</p>
              <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                Keep an eye on your active bids. When an auction countdown expires while you hold the highest bid, your won items will appear here!
              </p>
              <Link href="/auctions">
                <Button variant="soft" size="sm">
                  Find auctions to bid
                </Button>
              </Link>
            </Card>
          ) : (
            <div className="space-y-3">
              {wonAuctions.map((won) => (
                <div
                  key={won._id}
                  className="card-chai p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/auctions/${won._id}`}
                        className="font-montserrat font-semibold text-sm text-foreground hover:text-brand"
                      >
                        {won.title}
                      </Link>
                      <Chip tone="success" dot>
                        <Trophy className="size-3" /> Won
                      </Chip>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-neutral-500">
                      <span>Winning bid: <strong className="text-foreground">${won.currentBid.toLocaleString()}</strong></span>
                      <span>•</span>
                      <span>Category: {won.category}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <Link href={`/auctions/${won._id}`}>
                      <Button variant="outline" size="sm">
                        View item details
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Delete Listing Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete listing"
        description={`Are you sure you want to permanently delete "${deleteTarget?.title}"? This action cannot be reversed.`}
        confirmLabel="Delete listing"
        cancelLabel="Keep listing"
        tone="danger"
        busy={isDeleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

