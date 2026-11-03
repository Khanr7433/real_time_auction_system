'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Auction, AuctionsResponse } from '@/types/auction';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, SlidersHorizontal, Clock, Tag, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';

const CATEGORIES = [
  'All',
  'Electronics',
  'Watches & Jewelry',
  'Collectibles & Art',
  'Fashion & Apparel',
  'Home & Garden',
  'Sports & Outdoors',
  'Vehicles',
  'Other',
];

function formatTimeRemaining(seconds?: number): string {
  if (seconds === undefined || seconds <= 0) return 'Auction ended';
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h ${minutes}m left`;
  return `${minutes}m ${secs}s left`;
}

export default function AuctionsBrowsePage() {
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const fetchAuctions = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('limit', '12');

      if (selectedCategory && selectedCategory !== 'All') {
        params.set('category', selectedCategory);
      }
      if (searchQuery.trim()) {
        params.set('search', searchQuery.trim());
      }
      if (minPrice && !isNaN(Number(minPrice))) {
        params.set('minPrice', minPrice);
      }
      if (maxPrice && !isNaN(Number(maxPrice))) {
        params.set('maxPrice', maxPrice);
      }

      const res: AuctionsResponse = await api.get(`/auctions?${params.toString()}`);
      setAuctions(res.auctions || []);
      setTotal(res.total || 0);
      setTotalPages(res.totalPages || 1);
    } catch {
      setAuctions([]);
      setTotal(0);
    } finally {
      setIsLoading(false);
    }
  }, [page, selectedCategory, searchQuery, minPrice, maxPrice]);

  useEffect(() => {
    fetchAuctions();
  }, [fetchAuctions]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchAuctions();
  };

  const handleResetFilters = () => {
    setSelectedCategory('All');
    setSearchQuery('');
    setMinPrice('');
    setMaxPrice('');
    setPage(1);
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-8 space-y-8">
      {/* Page Header */}
      <div className="space-y-2">
        <h1 className="font-montserrat text-3xl sm:text-4xl font-semibold tracking-tight">Live auctions</h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Discover and place bids on <span className="highlight">active live listings</span> from verified sellers.
        </p>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-neutral-400" />
            <Input
              type="text"
              placeholder="Search by product title or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button type="submit" variant="solid" size="md">
            Search
          </Button>
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={() => setShowFilters(!showFilters)}
            className="hidden sm:inline-flex"
          >
            <SlidersHorizontal className="size-4 mr-1.5" />
            Filters
          </Button>
        </form>

        {/* Collapsible Advanced Filters (Price range & reset) */}
        {showFilters && (
          <div className="card-chai p-4 flex flex-wrap items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-neutral-500 font-medium">Price range:</span>
              <Input
                type="number"
                placeholder="Min $"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                className="w-24 h-8 text-xs"
              />
              <span className="text-neutral-400">to</span>
              <Input
                type="number"
                placeholder="Max $"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                className="w-24 h-8 text-xs"
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleResetFilters}
              className="text-neutral-500 hover:text-foreground text-xs"
            >
              Reset all
            </Button>
          </div>
        )}

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  setSelectedCategory(cat);
                  setPage(1);
                }}
                className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  isSelected
                    ? 'bg-neutral-900 text-white dark:bg-white dark:text-black font-semibold'
                    : 'border border-neutral-200 dark:border-neutral-800 bg-white/50 dark:bg-black/30 text-neutral-600 dark:text-neutral-400 hover:text-foreground'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Results Count & Refresh */}
      <div className="flex items-center justify-between text-xs text-neutral-500 pt-2 border-t border-neutral-200 dark:border-neutral-800">
        <span>
          Showing <strong className="text-foreground">{auctions.length}</strong> of{' '}
          <strong className="text-foreground">{total}</strong> live auctions
        </span>
        <button
          type="button"
          onClick={() => fetchAuctions()}
          className="hover:text-foreground flex items-center gap-1 cursor-pointer"
        >
          <RefreshCw className={`size-3 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Grid of Auctions */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="card-chai h-72 animate-pulse bg-neutral-200/50 dark:bg-neutral-800/50" />
          ))}
        </div>
      ) : auctions.length === 0 ? (
        <div className="card-chai text-center py-16 space-y-3">
          <p className="text-base font-medium text-foreground">No auctions found</p>
          <p className="text-xs text-neutral-500 max-w-sm mx-auto">
            Try adjusting your search query, selecting another category, or removing price filters.
          </p>
          <Button variant="outline" size="sm" onClick={handleResetFilters}>
            Clear filters
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {auctions.map((auction) => {
            const hasEnded = (auction.timeRemainingSeconds ?? 0) <= 0;
            return (
              <Link
                key={auction._id}
                href={`/auctions/${auction._id}`}
                className="card-chai group flex flex-col overflow-hidden transition-all hover:scale-[1.01]"
              >
                {/* Image Slot */}
                <div className="aspect-[4/3] w-full bg-neutral-100 dark:bg-neutral-900 overflow-hidden relative">
                  {auction.images && auction.images.length > 0 ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={auction.images[0].startsWith('http') ? auction.images[0] : `${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000'}${auction.images[0]}`}
                      alt={auction.title}
                      className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div className="size-full flex items-center justify-center text-neutral-400 text-xs">
                      No photo provided
                    </div>
                  )}

                  {/* Top Badges */}
                  <div className="absolute top-2 left-2 flex items-center gap-1.5">
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-black/60 text-white backdrop-blur-md capitalize">
                      {auction.condition}
                    </span>
                  </div>

                  <div className="absolute top-2 right-2">
                    <span
                      className={`text-[10px] font-medium px-2 py-0.5 rounded-full backdrop-blur-md flex items-center gap-1 ${
                        hasEnded
                          ? 'bg-neutral-800/80 text-neutral-400'
                          : 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/30'
                      }`}
                    >
                      {!hasEnded && <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />}
                      {hasEnded ? 'Closed' : 'Live'}
                    </span>
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-4 flex flex-1 flex-col justify-between space-y-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-[11px] text-neutral-500">
                      <Tag className="size-3" />
                      <span>{auction.category}</span>
                    </div>
                    <h3 className="font-montserrat text-sm font-semibold leading-snug line-clamp-2 text-foreground group-hover:text-yellow-800 dark:group-hover:text-orange-100 transition-colors">
                      {auction.title}
                    </h3>
                  </div>

                  <div className="pt-2 border-t border-neutral-200/60 dark:border-neutral-800/60 flex items-end justify-between text-xs">
                    <div>
                      <span className="text-[10px] text-neutral-500 block">Current bid</span>
                      <span className="font-montserrat text-base font-bold text-foreground">
                        ${auction.currentBid.toLocaleString()}
                      </span>
                    </div>

                    <div className="text-right flex items-center gap-1 text-[11px] text-neutral-500">
                      <Clock className="size-3" />
                      <span>{formatTimeRemaining(auction.timeRemainingSeconds)}</span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            <ChevronLeft className="size-4" /> Previous
          </Button>
          <span className="text-xs text-neutral-500 px-3">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Next <ChevronRight className="size-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
