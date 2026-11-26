'use client';

import React, { useState, useEffect, use, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api, ApiError } from '@/lib/api';
import { Auction } from '@/types/auction';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Chip } from '@/components/ui/chip';
import { Alert } from '@/components/ui/alert';
import { Card, CardBody } from '@/components/ui/card';
import { ArrowLeft, Lock, AlertCircle } from 'lucide-react';

const CATEGORIES = [
  'Electronics',
  'Watches & Jewelry',
  'Collectibles & Art',
  'Fashion & Apparel',
  'Home & Garden',
  'Sports & Outdoors',
  'Vehicles',
  'Other',
];

const CONDITIONS = [
  { value: 'new', label: 'New (Unused in original box)' },
  { value: 'like-new', label: 'Like New (Minimal or no signs of wear)' },
  { value: 'good', label: 'Good (Fully functional with minor wear)' },
  { value: 'fair', label: 'Fair (Functional with noticeable wear)' },
  { value: 'poor', label: 'Poor (Heavily used or needs repair)' },
];

function EditAuctionInner({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const auctionId = resolvedParams.id;

  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const [auction, setAuction] = useState<Auction | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [condition, setCondition] = useState('good');
  const [startingBid, setStartingBid] = useState('');
  const [endTime, setEndTime] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;

    let isMounted = true;
    async function loadAuction() {
      setIsLoading(true);
      setError(null);
      try {
        const data: Auction = await api.get(`/auctions/${auctionId}`);
        if (!isMounted) return;
        setAuction(data);
        setTitle(data.title || '');
        setCategory(data.category || CATEGORIES[0]);
        setDescription(data.description || '');
        setCondition(data.condition || 'good');
        setStartingBid(data.startingBid?.toString() || '');

        if (data.endTime) {
          const d = new Date(data.endTime);
          const pad = (n: number) => n.toString().padStart(2, '0');
          setEndTime(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`);
        }
      } catch (err: any) {
        if (!isMounted) return;
        setAuction(null);
        setError(err instanceof ApiError ? err.message : (err?.message || 'Auction listing not found'));
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadAuction();

    return () => {
      isMounted = false;
    };
  }, [auctionId, authLoading, isAuthenticated]);

  const sellerId =
    typeof auction?.sellerId === 'string'
      ? auction.sellerId
      : auction?.sellerId?._id || auction?.sellerId?.id || '';
  const isOwner = Boolean(user && auction && (sellerId === user.id || user.role === 'admin'));
  const isLocked = Boolean(auction && ((auction.bidCount ?? 0) > 0 || auction.status !== 'live'));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auction || !isOwner) return;
    setError(null);

    if (auction.bidCount > 0 || auction.status !== 'live') {
      setError('This auction can no longer be edited');
      return;
    }

    const numBid = Number(startingBid);
    if (!Number.isFinite(numBid) || numBid < 1) {
      setError('Starting bid must be at least $1');
      return;
    }

    const endDateTime = new Date(endTime);
    if (isNaN(endDateTime.getTime()) || endDateTime.getTime() <= Date.now()) {
      setError('End date must be set to a future date and time');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.put(`/auctions/${auctionId}`, {
        title: title.trim(),
        category,
        description: description.trim(),
        condition,
        startingBid: numBid,
        endTime: endDateTime.toISOString(),
      });

      router.push('/dashboard');
    } catch (err: any) {
      setError(err instanceof ApiError ? err.message : 'Failed to update auction');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading || authLoading) {
    return (
      <div className="max-w-3xl mx-auto p-6 sm:p-12">
        <div className="card-chai h-64 animate-pulse bg-neutral-200/50 dark:bg-neutral-800/50" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  if (!auction) {
    return (
      <div className="max-w-3xl mx-auto p-6 sm:p-12 space-y-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-3.5" /> Back to dashboard
        </Link>
        <Card className="sm:opacity-100">
          <CardBody className="p-6 space-y-4">
            <div className="space-y-1">
              <h1 className="text-xl font-medium text-foreground">Listing not found</h1>
              <p className="text-sm text-muted-foreground">
                We could not load this auction listing. It may have been removed or the ID is invalid.
              </p>
            </div>
            {error && <Alert tone="danger">{error}</Alert>}
            <div>
              <Button asChild variant="outline" size="sm">
                <Link href="/dashboard">Return to dashboard</Link>
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="max-w-3xl mx-auto p-6 sm:p-12 space-y-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-3.5" /> Back to dashboard
        </Link>
        <Card className="sm:opacity-100">
          <CardBody className="p-6 space-y-4">
            <div className="space-y-1">
              <h1 className="text-xl font-medium text-foreground">Access denied</h1>
              <p className="text-sm text-muted-foreground">
                Only the seller who created this auction can edit its details.
              </p>
            </div>
            <div>
              <Button asChild variant="outline" size="sm">
                <Link href="/dashboard">Return to dashboard</Link>
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 sm:p-12 space-y-6">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-foreground transition-colors"
      >
        <ArrowLeft className="size-3.5" /> Back to dashboard
      </Link>

      <Card className="sm:opacity-100">
        <CardBody className="p-6 sm:p-8 gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <h1 className="text-2xl font-medium tracking-tight text-foreground">Edit auction listing</h1>
              {isLocked && (
                <Chip tone="danger">
                  <Lock className="size-3" /> Locked
                </Chip>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {isLocked
                ? auction.status !== 'live'
                  ? `This auction is ${auction.status} and details cannot be modified.`
                  : 'This auction has received bids and details cannot be modified.'
                : 'Update auction details prior to receiving any bids.'}
            </p>
          </div>
          <div>
            {error && (
              <div className="mb-6">
                <Alert tone="danger">{error}</Alert>
              </div>
            )}

            {isLocked ? (
              <div className="p-6 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-100/50 dark:bg-black/30 space-y-3 text-center">
                <Lock className="size-8 text-neutral-400 mx-auto" />
                <h2 className="font-display font-semibold text-base text-foreground">
                  Listing details locked
                </h2>
                <p className="text-xs text-neutral-500 max-w-md mx-auto">
                  {auction.status !== 'live'
                    ? `Auctions with status "${auction.status}" are closed and cannot be modified.`
                    : 'Once a valid bid has been placed, auction properties (title, starting price, and duration) cannot be altered to protect the integrity of the active bidding room.'}
                </p>
                <div className="pt-2">
                  <Button asChild variant="outline" size="sm">
                    <Link href="/dashboard">Return to dashboard</Link>
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-1.5">
                  <label htmlFor="edit-title" className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                    Product title
                  </label>
                  <Input
                    id="edit-title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={120}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label htmlFor="edit-category" className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                      Category
                    </label>
                    <select
                      id="edit-category"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="flex h-10 w-full rounded-lg border border-neutral-300 bg-white/70 px-3 py-2 text-sm text-neutral-900 dark:border-neutral-800 dark:bg-black/30 dark:text-neutral-100"
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="edit-condition" className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                      Item condition
                    </label>
                    <select
                      id="edit-condition"
                      value={condition}
                      onChange={(e) => setCondition(e.target.value)}
                      className="flex h-10 w-full rounded-lg border border-neutral-300 bg-white/70 px-3 py-2 text-sm text-neutral-900 dark:border-neutral-800 dark:bg-black/30 dark:text-neutral-100"
                    >
                      {CONDITIONS.map((cond) => (
                        <option key={cond.value} value={cond.value}>
                          {cond.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="edit-description" className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                    Detailed description
                  </label>
                  <Textarea
                    id="edit-description"
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    maxLength={2000}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label htmlFor="edit-starting-bid" className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                      Starting bid ($)
                    </label>
                    <Input
                      id="edit-starting-bid"
                      type="number"
                      min="1"
                      step="1"
                      value={startingBid}
                      onChange={(e) => setStartingBid(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="edit-end-time" className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                      Auction end date and time
                    </label>
                    <Input
                      id="edit-end-time"
                      type="datetime-local"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="solid"
                  size="lg"
                  className="w-full mt-4"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Saving changes...' : 'Save changes'}
                </Button>
              </form>
            )}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

export default function EditAuctionPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense
      fallback={
        <div className="max-w-3xl mx-auto p-6 sm:p-12">
          <div className="card-chai h-64 animate-pulse bg-neutral-200/50 dark:bg-neutral-800/50" />
        </div>
      }
    >
      <EditAuctionInner params={params} />
    </Suspense>
  );
}
