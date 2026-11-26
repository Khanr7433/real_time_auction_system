'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert } from '@/components/ui/alert';
import {
  Users,
  Gavel,
  AlertTriangle,
  Megaphone,
  Activity,
  RefreshCw,
  TrendingUp,
  ArrowRight,
  Send,
} from 'lucide-react';

interface AnalyticsData {
  users: {
    active: number;
    total: number;
    suspended: number;
  };
  auctions: {
    live: number;
    completed: number;
    unsold: number;
    terminated: number;
    total: number;
  };
  bids: {
    thirtyDayVolume: number;
    thirtyDayCount: number;
  };
  disputes: {
    open: number;
  };
  timestamp?: string;
}

export default function AdminOverviewPage() {
  const { isAuthorized } = useAdminAccess();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Announcement form state
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementMessage, setAnnouncementMessage] = useState('');
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastStatus, setBroadcastStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const fetchAnalytics = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get<AnalyticsData>('/admin/analytics');
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch platform analytics');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthorized) return;
    fetchAnalytics();
  }, [isAuthorized, fetchAnalytics]);

  const handleBroadcastAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcementMessage.trim()) return;

    setIsBroadcasting(true);
    setBroadcastStatus(null);
    try {
      await api.post('/admin/announcements', {
        title: announcementTitle.trim() || 'Platform Announcement',
        message: announcementMessage.trim(),
      });
      setBroadcastStatus({
        type: 'success',
        message: 'Announcement broadcast successfully to all live clients!',
      });
      setAnnouncementTitle('');
      setAnnouncementMessage('');
    } catch (err: any) {
      setBroadcastStatus({
        type: 'error',
        message: err.message || 'Failed to broadcast announcement',
      });
    } finally {
      setIsBroadcasting(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  if (!isAuthorized) {
    return null;
  }

  if (isLoading && !data) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card-chai p-5 h-32 animate-pulse bg-neutral-200/20 dark:bg-neutral-800/20" />
          ))}
        </div>
        <div className="card-chai p-6 h-64 animate-pulse bg-neutral-200/20 dark:bg-neutral-800/20" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <Card className="p-8 text-center space-y-4 border-red-500/30 sm:opacity-100">
        <AlertTriangle className="size-10 mx-auto text-red-500" />
        <h2 className="font-display text-lg font-semibold">Failed to load analytics</h2>
        <p className="text-xs text-muted-foreground">{error}</p>
        <div>
          <Button type="button" variant="outline" size="sm" onClick={() => fetchAnalytics()}>
            <RefreshCw className="size-3.5 mr-1" /> Retry
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {/* Top Bar with Refresh button & Last Updated */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            Platform overview
          </h2>
          <p className="text-xs text-muted-foreground">
            Real-time aggregates across users, auction states, and 30-day bid volumes
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fetchAnalytics()}
          disabled={isLoading}
          className="text-xs"
        >
          <RefreshCw className={`size-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh stats
        </Button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: 30-Day Bid Volume */}
        <div className="card-chai p-5 space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">30-day bid volume</span>
            <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="size-4" />
            </span>
          </div>
          <div className="text-2xl font-bold font-display text-foreground">
            {formatCurrency(data?.bids.thirtyDayVolume || 0)}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Across {data?.bids.thirtyDayCount.toLocaleString() || 0} bids placed
          </p>
        </div>

        {/* Metric 2: Live Auctions */}
        <div className="card-chai p-5 space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Live auctions</span>
            <span className="p-2 rounded-lg border border-border text-foreground">
              <Activity className="size-4" />
            </span>
          </div>
          <div className="text-2xl font-bold font-display text-foreground">
            {data?.auctions.live || 0}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Out of {data?.auctions.total || 0} all-time listings
          </p>
        </div>

        {/* Metric 3: Active Users */}
        <div className="card-chai p-5 space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Active users</span>
            <span className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Users className="size-4" />
            </span>
          </div>
          <div className="text-2xl font-bold font-display text-foreground">
            {data?.users.active.toLocaleString() || 0}
          </div>
          <p className="text-[11px] text-muted-foreground">
            {data?.users.suspended || 0} suspended accounts
          </p>
        </div>

        {/* Metric 4: Open Disputes */}
        <div className="card-chai p-5 space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Open disputes</span>
            <span className={`p-2 rounded-lg ${(data?.disputes.open || 0) > 0 ? 'bg-red-500/10 text-red-600 dark:text-red-400' : 'bg-muted text-muted-foreground'}`}>
              <AlertTriangle className="size-4" />
            </span>
          </div>
          <div className={`text-2xl font-bold font-display ${(data?.disputes.open || 0) > 0 ? 'text-red-600 dark:text-red-400' : 'text-foreground'}`}>
            {data?.disputes.open || 0}
          </div>
          <p className="text-[11px] text-muted-foreground">
            {(data?.disputes.open || 0) > 0 ? 'Action required by admin' : 'All reports resolved'}
          </p>
        </div>
      </div>

      {/* Breakdown Section: Auction Statuses & Quick Links */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Auction Health Breakdown */}
        <div className="lg:col-span-2 card-chai p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-sm font-semibold text-foreground">
              Auction catalog distribution
            </h3>
            <Link
              href="/admin/auctions"
              className="text-xs text-yellow-800 dark:text-orange-100 hover:underline flex items-center gap-1 font-medium"
            >
              Manage all <ArrowRight className="size-3" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl border border-card-edge bg-card-fill space-y-1">
              <span className="text-[11px] text-muted-foreground font-semibold">Live</span>
              <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 font-display">{data?.auctions.live || 0}</p>
              <p className="text-[10px] text-muted-foreground">Accepting active bids</p>
            </div>

            <div className="p-3.5 rounded-xl border border-card-edge bg-card-fill space-y-1">
              <span className="text-[11px] text-muted-foreground font-semibold">Completed</span>
              <p className="text-xl font-bold text-foreground font-display">{data?.auctions.completed || 0}</p>
              <p className="text-[10px] text-muted-foreground">Sold to winners</p>
            </div>

            <div className="p-3.5 rounded-xl border border-card-edge bg-card-fill space-y-1">
              <span className="text-[11px] text-muted-foreground font-semibold">Unsold</span>
              <p className="text-xl font-bold text-muted-foreground font-display">{data?.auctions.unsold || 0}</p>
              <p className="text-[10px] text-muted-foreground">Ended with no bids</p>
            </div>

            <div className="p-3.5 rounded-xl border border-card-edge bg-card-fill space-y-1">
              <span className="text-[11px] text-muted-foreground font-semibold">Terminated</span>
              <p className="text-xl font-bold text-red-600 dark:text-red-400 font-display">{data?.auctions.terminated || 0}</p>
              <p className="text-[10px] text-muted-foreground">Admin closed</p>
            </div>
          </div>

          <div className="pt-2 border-t border-border/80 flex items-center justify-between text-xs text-muted-foreground">
            <span>Total catalog items tracked</span>
            <span className="font-semibold text-foreground">{data?.auctions.total || 0} listings</span>
          </div>
        </div>

        {/* Admin Quick Actions Card */}
        <div className="card-chai p-6 space-y-4">
          <h3 className="font-display text-sm font-semibold text-foreground">
            Moderation shortlinks
          </h3>

          <div className="space-y-2.5">
            <Link
              href="/admin/users"
              className="flex items-center justify-between p-3 rounded-lg border border-card-edge hover:border-card-edge-hover bg-card-fill hover:bg-accent/50 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <Users className="size-4 text-blue-600 dark:text-blue-400" />
                <div>
                  <p className="text-xs font-medium text-foreground">User management</p>
                  <p className="text-[10px] text-muted-foreground">Search, suspend &amp; reactivate</p>
                </div>
              </div>
              <ArrowRight className="size-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
            </Link>

            <Link
              href="/admin/auctions"
              className="flex items-center justify-between p-3 rounded-lg border border-card-edge hover:border-card-edge-hover bg-card-fill hover:bg-accent/50 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <Gavel className="size-4 text-yellow-800 dark:text-orange-100" />
                <div>
                  <p className="text-xs font-medium text-foreground">Auction moderation</p>
                  <p className="text-[10px] text-muted-foreground">Flag, terminate &amp; delete listings</p>
                </div>
              </div>
              <ArrowRight className="size-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
            </Link>

            <Link
              href="/admin/disputes"
              className="flex items-center justify-between p-3 rounded-lg border border-card-edge hover:border-card-edge-hover bg-card-fill hover:bg-accent/50 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <AlertTriangle className="size-4 text-red-600 dark:text-red-400" />
                <div>
                  <p className="text-xs font-medium text-foreground">Dispute resolution</p>
                  <p className="text-[10px] text-muted-foreground">
                    {data?.disputes.open || 0} open case(s)
                  </p>
                </div>
              </div>
              <ArrowRight className="size-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
            </Link>
          </div>
        </div>
      </div>

      {/* Broadcast Announcement Form */}
      <div className="card-chai p-6 space-y-4">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg border border-border text-foreground">
            <Megaphone className="size-4" />
          </span>
          <div>
            <h3 className="font-display text-sm font-semibold text-foreground">
              Broadcast system announcement
            </h3>
            <p className="text-xs text-muted-foreground">
              Persists a notification for every active user and pushes a real-time socket toast to online users
            </p>
          </div>
        </div>

        {broadcastStatus && (
          <Alert tone={broadcastStatus.type === 'success' ? 'success' : 'danger'}>
            {broadcastStatus.message}
          </Alert>
        )}

        <form onSubmit={handleBroadcastAnnouncement} className="space-y-3">
          <div>
            <label htmlFor="announcement-title" className="block text-xs font-medium text-muted-foreground mb-1">
              Title (optional)
            </label>
            <Input
              id="announcement-title"
              value={announcementTitle}
              onChange={(e) => setAnnouncementTitle(e.target.value)}
              placeholder="e.g. Scheduled maintenance, new featured auctions..."
              className="text-xs"
              maxLength={100}
            />
          </div>

          <div>
            <label htmlFor="announcement-message" className="block text-xs font-medium text-muted-foreground mb-1">
              Message <span className="text-red-500">*</span>
            </label>
            <Textarea
              id="announcement-message"
              value={announcementMessage}
              onChange={(e) => setAnnouncementMessage(e.target.value)}
              placeholder="Enter announcement text to broadcast to all users..."
              required
              rows={3}
              className="resize-none"
              maxLength={500}
            />
          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              variant="solid"
              size="sm"
              disabled={isBroadcasting || !announcementMessage.trim()}
              className="text-xs"
            >
              <Send className="size-3.5 mr-1.5" />
              {isBroadcasting ? 'Broadcasting...' : 'Broadcast announcement'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

