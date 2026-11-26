"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { getMediaUrl } from "@/lib/utils";
import { Auction, AuctionsResponse } from "@/types/auction";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Segmented } from "@/components/ui/segmented";
import { LiveDot } from "@/components/ui/live-dot";
import {
  Search,
  SlidersHorizontal,
  Clock,
  Tag,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from "lucide-react";

const CATEGORIES = [
  "All",
  "Electronics",
  "Watches & Jewelry",
  "Collectibles & Art",
  "Fashion & Apparel",
  "Home & Garden",
  "Sports & Outdoors",
  "Vehicles",
  "Other",
];

function formatTimeRemaining(seconds?: number): string {
  if (seconds === undefined || seconds <= 0) return "Auction ended";
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
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [debouncedFilters, setDebouncedFilters] = useState({
    search: "",
    minPrice: "",
    maxPrice: "",
  });
  const [showFilters, setShowFilters] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);
  const [nowMs, setNowMs] = useState<number | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const minNum = minPrice !== "" ? Number(minPrice) : null;
  const maxNum = maxPrice !== "" ? Number(maxPrice) : null;
  const priceValidationError =
    (minNum !== null && (isNaN(minNum) || minNum < 0)) ||
    (maxNum !== null && (isNaN(maxNum) || maxNum < 0))
      ? "Prices cannot be negative."
      : minNum !== null && maxNum !== null && minNum > maxNum
        ? "Minimum price cannot exceed maximum price."
        : null;

  // Debounce search and price inputs (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedFilters({
        search: searchQuery.trim(),
        minPrice,
        maxPrice,
      });
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, minPrice, maxPrice]);

  // Live countdown ticker for visible auction cards
  useEffect(() => {
    if (auctions.length === 0) return;
    setNowMs(Date.now());
    const interval = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [auctions.length]);

  const fetchAuctions = useCallback(async () => {
    const dMin = debouncedFilters.minPrice !== "" ? Number(debouncedFilters.minPrice) : null;
    const dMax = debouncedFilters.maxPrice !== "" ? Number(debouncedFilters.maxPrice) : null;
    if (
      (dMin !== null && (isNaN(dMin) || dMin < 0)) ||
      (dMax !== null && (isNaN(dMax) || dMax < 0)) ||
      (dMin !== null && dMax !== null && dMin > dMax)
    ) {
      return;
    }

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("limit", "12");

      if (selectedCategory && selectedCategory !== "All") {
        params.set("category", selectedCategory);
      }
      if (debouncedFilters.search) {
        params.set("search", debouncedFilters.search);
      }
      if (dMin !== null) {
        params.set("minPrice", dMin.toString());
      }
      if (dMax !== null) {
        params.set("maxPrice", dMax.toString());
      }

      const res: AuctionsResponse = await api.get(
        `/auctions?${params.toString()}`,
        { signal: controller.signal },
      );
      if (controller.signal.aborted) return;
      setAuctions(res.auctions || []);
      setTotal(res.total || 0);
      setTotalPages(res.totalPages || 1);
      setNowMs(Date.now());
    } catch (err: any) {
      if (err?.name === "AbortError") return;
      setAuctions([]);
      setTotal(0);
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, [page, selectedCategory, debouncedFilters, refreshTick]);

  useEffect(() => {
    fetchAuctions();
    return () => {
      abortControllerRef.current?.abort();
    };
  }, [fetchAuctions]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setDebouncedFilters({
      search: searchQuery.trim(),
      minPrice,
      maxPrice,
    });
    setRefreshTick((t) => t + 1);
  };

  const handleResetFilters = () => {
    setSelectedCategory("All");
    setSearchQuery("");
    setMinPrice("");
    setMaxPrice("");
    setDebouncedFilters({ search: "", minPrice: "", maxPrice: "" });
    setPage(1);
  };

  return (
    <div className="max-w-6xl mx-auto p-6 sm:p-12 space-y-8">
      {/* Page Header */}
      <div className="space-y-2">
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">
          Live auctions
        </h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Discover and place bids on{" "}
          <span className="highlight">active live listings</span> from verified
          sellers.
        </p>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-neutral-400" />
            <Input
              type="text"
              aria-label="Search auctions"
              placeholder="Search by product title or description..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="pl-9"
            />
          </div>
          <Button type="submit" variant="soft" size="md">
            Search
          </Button>
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={() => setShowFilters(!showFilters)}
            aria-expanded={showFilters}
            className="inline-flex"
          >
            <SlidersHorizontal className="size-4 mr-1.5" />
            Filters
          </Button>
        </form>

        {/* Collapsible Advanced Filters (Price range & reset) */}
        {showFilters && (
          <div className="card-chai p-4 flex flex-wrap items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <label htmlFor="min-price-filter" className="text-neutral-500 font-medium">
                Price range:
              </label>
              <Input
                id="min-price-filter"
                type="number"
                min={0}
                aria-label="Minimum price"
                placeholder="Min $"
                value={minPrice}
                onChange={(e) => {
                  setMinPrice(e.target.value);
                  setPage(1);
                }}
                className="w-24 h-8 text-xs"
              />
              <span className="text-neutral-400">to</span>
              <Input
                id="max-price-filter"
                type="number"
                min={0}
                aria-label="Maximum price"
                placeholder="Max $"
                value={maxPrice}
                onChange={(e) => {
                  setMaxPrice(e.target.value);
                  setPage(1);
                }}
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
            {priceValidationError && (
              <span className="text-red-500 text-xs font-medium">
                {priceValidationError}
              </span>
            )}
          </div>
        )}

        {/* Category Segmented Control */}
        <div className="overflow-x-auto pb-1 scrollbar-none">
          <Segmented
            label="Category filter"
            options={CATEGORIES.map((cat) => ({ value: cat, label: cat }))}
            value={selectedCategory}
            onChange={(cat) => {
              setSelectedCategory(cat);
              setPage(1);
            }}
          />
        </div>
      </div>

      {/* Results Count & Refresh */}
      <div className="flex items-center justify-between text-xs text-neutral-500 pt-2 border-t border-neutral-200 dark:border-neutral-800">
        <span>
          Showing <strong className="text-foreground">{auctions.length}</strong>{" "}
          of <strong className="text-foreground">{total}</strong> live auctions
        </span>
        <button
          type="button"
          onClick={() => fetchAuctions()}
          className="hover:text-foreground flex items-center gap-1 cursor-pointer"
        >
          <RefreshCw className={`size-3 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Grid of Auctions */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="card-chai h-72 animate-pulse bg-neutral-200/50 dark:bg-neutral-800/50"
            />
          ))}
        </div>
      ) : auctions.length === 0 ? (
        <div className="card-chai text-center py-16 space-y-3">
          <p className="text-base font-medium text-foreground">
            No auctions found
          </p>
          <p className="text-xs text-neutral-500 max-w-sm mx-auto">
            Try adjusting your search query, selecting another category, or
            removing price filters.
          </p>
          <Button variant="outline" size="sm" onClick={handleResetFilters}>
            Clear filters
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {auctions.map((auction) => {
            const parsedEndMs = auction.endTime ? new Date(auction.endTime).getTime() : NaN;
            const liveRemaining =
              nowMs !== null && Number.isFinite(parsedEndMs)
                ? Math.max(0, Math.ceil((parsedEndMs - nowMs) / 1000))
                : (auction.timeRemainingSeconds ?? 0);
            const hasEnded = liveRemaining <= 0 || auction.status !== "live";
            return (
              <Link
                key={auction._id}
                href={`/auctions/${auction._id}`}
                className="card-chai group flex flex-col overflow-hidden transition-all hover:scale-[1.01]"
              >
                {/* Image Slot */}
                <div className="aspect-4/3 w-full bg-neutral-100 dark:bg-neutral-900 overflow-hidden relative">
                  {auction.images && auction.images.length > 0 ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={getMediaUrl(auction.images[0])}
                      alt={auction.title}
                      className="size-full object-cover sm:opacity-90 group-hover:opacity-100 transition-all duration-300 motion-safe:group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div className="size-full flex items-center justify-center text-neutral-400 text-xs">
                      No photo provided
                    </div>
                  )}

                  {/* Top Badges */}
                  <div className="absolute top-2 left-2 flex items-center gap-1.5">
                    <Chip tone="default" className="text-[10px] py-0 px-2 bg-background/85 backdrop-blur-md capitalize">
                      {auction.condition}
                    </Chip>
                  </div>

                  <div className="absolute top-2 right-2">
                    <Chip
                      tone={hasEnded ? "default" : "success"}
                      className="text-[10px] py-0 px-2 bg-background/85 backdrop-blur-md"
                    >
                      {!hasEnded && <LiveDot tone="live" className="size-1.5" />}
                      <span>{hasEnded ? "Closed" : "Live"}</span>
                    </Chip>
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-4 flex flex-1 flex-col justify-between space-y-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-[11px] text-neutral-500">
                      <Tag className="size-3" />
                      <span>{auction.category}</span>
                    </div>
                    <h3 className="font-display text-sm font-semibold leading-snug line-clamp-2 text-foreground group-hover:text-yellow-800 dark:group-hover:text-orange-100 transition-colors">
                      {auction.title}
                    </h3>
                  </div>

                  <div className="pt-2 border-t border-neutral-200/60 dark:border-neutral-800/60 flex items-end justify-between text-xs">
                    <div>
                      <span className="text-[10px] text-neutral-500 block">
                        Current bid
                      </span>
                      <span className="font-display text-base font-bold text-foreground">
                        ${auction.currentBid.toLocaleString()}
                      </span>
                    </div>

                    <div className="text-right flex items-center gap-1 text-[11px] text-neutral-500">
                      <Clock className="size-3" />
                      <span>
                        {formatTimeRemaining(liveRemaining)}
                      </span>
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
