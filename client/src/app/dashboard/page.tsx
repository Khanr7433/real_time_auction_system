'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { Auction } from '@/types/auction';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { Alert } from '@/components/ui/alert';
import { Plus, Edit, Trash2, Lock, Eye, AlertCircle, RefreshCw } from 'lucide-react';

export default function SellerDashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const [activeTab, setActiveTab] = useState<'listings' | 'bids' | 'won'>('listings');
  const [myListings, setMyListings] = useState<Auction[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [actionError, setActionError] = useState<string | null>(null);

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
      // Query seller's auctions across statuses
      const res = await api.get(`/auctions?sellerId=${user.id}&status=live&limit=50`);
      setMyListings(res.auctions || []);
    } catch {
      setMyListings([]);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadMyListings();
    }
  }, [user, loadMyListings]);

  const handleDeleteListing = async (auctionId: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) return;
    setActionError(null);
    try {
      await api.delete(`/auctions/${auctionId}`);
      setMyListings((prev) => prev.filter((a) => a._id !== auctionId));
    } catch (err: any) {
      setActionError(err.message || 'Failed to delete auction');
    }
  };

  if (authLoading) {
    return (
      <div className="max-w-6xl mx-auto p-6 sm:p-12">
        <p className="text-sm text-neutral-500">Checking credentials...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-8 space-y-8">
      {/* Top Banner & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-montserrat text-2xl sm:text-3xl font-semibold tracking-tight">Seller dashboard</h1>
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

      {/* Tabs */}
      <div className="flex border-b border-neutral-200 dark:border-neutral-800 space-x-6">
        <button
          onClick={() => setActiveTab('listings')}
          className={`pb-3 text-sm font-medium transition-colors cursor-pointer ${
            activeTab === 'listings'
              ? 'border-b-2 border-neutral-900 dark:border-white text-foreground'
              : 'text-neutral-500 hover:text-foreground'
          }`}
        >
          My Listings ({myListings.length})
        </button>
        <button
          onClick={() => setActiveTab('bids')}
          className={`pb-3 text-sm font-medium transition-colors cursor-pointer ${
            activeTab === 'bids'
              ? 'border-b-2 border-neutral-900 dark:border-white text-foreground'
              : 'text-neutral-500 hover:text-foreground'
          }`}
        >
          My Bids
        </button>
        <button
          onClick={() => setActiveTab('won')}
          className={`pb-3 text-sm font-medium transition-colors cursor-pointer ${
            activeTab === 'won'
              ? 'border-b-2 border-neutral-900 dark:border-white text-foreground'
              : 'text-neutral-500 hover:text-foreground'
          }`}
        >
          Won Auctions
        </button>
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
                const isLocked = listing.bidCount > 0;
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
                            src={
                              listing.images[0].startsWith('http')
                                ? listing.images[0]
                                : `${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000'}${listing.images[0]}`
                            }
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
                        <Chip tone="default" title="Locked after first bid">
                          <Lock className="size-3" /> Locked
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
                            onClick={() => handleDeleteListing(listing._id, listing.title)}
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
        <Card className="text-center py-12 space-y-2">
          <p className="text-sm font-medium text-foreground">Active Bids</p>
          <p className="text-xs text-neutral-500">
            Real-time bid tracking and outbid history will populate here as you bid on live auctions.
          </p>
          <Link href="/auctions">
            <Button variant="outline" size="sm" className="mt-2">
              Browse auctions to bid
            </Button>
          </Link>
        </Card>
      )}

      {/* Tab Content: Won */}
      {activeTab === 'won' && (
        <Card className="text-center py-12 space-y-2">
          <p className="text-sm font-medium text-foreground">Won Auctions</p>
          <p className="text-xs text-neutral-500">
            Auctions where you hold the winning bid upon expiration will be listed here.
          </p>
        </Card>
      )}
    </div>
  );
}

