'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { ArrowLeft, Upload, AlertCircle } from 'lucide-react';

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

export default function CreateAuctionPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [condition, setCondition] = useState('good');
  const [startingBid, setStartingBid] = useState('');
  const [endTime, setEndTime] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  // Set default end time to 24 hours from now
  useEffect(() => {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    // Format to YYYY-MM-DDTHH:mm for datetime-local
    const pad = (n: number) => n.toString().padStart(2, '0');
    const defaultTime = `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}T${pad(tomorrow.getHours())}:${pad(tomorrow.getMinutes())}`;
    setEndTime(defaultTime);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      if (filesArray.length > 5) {
        setError('Maximum 5 images allowed per auction listing');
        return;
      }
      // Check file size (5MB max)
      const oversized = filesArray.some((f) => f.size > 5 * 1024 * 1024);
      if (oversized) {
        setError('Each image file must be smaller than 5 MB');
        return;
      }
      setSelectedFiles(filesArray);
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    if (!description.trim()) {
      setError('Description is required');
      return;
    }
    const numBid = Number(startingBid);
    if (isNaN(numBid) || numBid <= 0) {
      setError('Starting bid must be greater than zero');
      return;
    }
    const endDateTime = new Date(endTime);
    if (isNaN(endDateTime.getTime()) || endDateTime.getTime() <= Date.now()) {
      setError('End date must be set to a future date and time');
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('category', category);
      formData.append('description', description.trim());
      formData.append('condition', condition);
      formData.append('startingBid', startingBid);
      formData.append('endTime', new Date(endTime).toISOString());

      for (const file of selectedFiles) {
        formData.append('images', file);
      }

      const res = await api.post('/auctions', formData);
      if (res && res.auctionId) {
        router.push('/dashboard');
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err instanceof ApiError ? err.message : (err?.message || 'Failed to create auction listing'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-8 space-y-6">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-foreground transition-colors"
      >
        <ArrowLeft className="size-3.5" /> Back to dashboard
      </Link>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-semibold">Create auction listing</CardTitle>
          <CardDescription>
            Publish a product for real-time bidding with <span className="highlight">automatic anti-sniping protection</span>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-6 p-3 text-xs rounded-md bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 flex items-center gap-2">
              <AlertCircle className="size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Title */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                Product title
              </label>
              <Input
                type="text"
                placeholder="e.g. Vintage 1984 Mechanical Chronograph Watch"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={120}
                required
              />
            </div>

            {/* Category & Condition */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                  Category
                </label>
                <select
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
                <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                  Item condition
                </label>
                <select
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

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                Detailed description
              </label>
              <textarea
                rows={4}
                placeholder="Provide accurate details about condition, authenticity, specifications, and included accessories..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={2000}
                required
                className="flex w-full rounded-lg border border-neutral-300 bg-white/70 px-3 py-2 text-sm text-neutral-900 dark:border-neutral-800 dark:bg-black/30 dark:text-neutral-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-400"
              />
            </div>

            {/* Pricing and End Time */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                  Starting bid ($)
                </label>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  placeholder="e.g. 50"
                  value={startingBid}
                  onChange={(e) => setStartingBid(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                  Auction end date and time
                </label>
                <Input
                  type="datetime-local"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Images upload */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                <Upload className="size-3.5" /> Product photos (up to 5 images, max 5 MB each)
              </label>
              <Input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={handleFileChange}
                className="cursor-pointer text-xs"
              />
              {selectedFiles.length > 0 && (
                <p className="text-[11px] text-neutral-500 pt-1">
                  Selected {selectedFiles.length} file(s): {selectedFiles.map((f) => f.name).join(', ')}
                </p>
              )}
            </div>

            <Button
              type="submit"
              variant="solid"
              size="lg"
              className="w-full mt-4"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Publishing listing...' : 'Publish auction'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

