'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert } from '@/components/ui/alert';
import {
  Users,
  Gavel,
  DollarSign,
  AlertTriangle,
  Megaphone,
  Activity,
  RefreshCw,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  ShieldCheck,
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
    fetchAnalytics();
  }, [fetchAnalytics]);

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
      <Card className="p-8 text-center space-y-4 border-red-500/30">
        <AlertTriangle className="size-10 mx-auto text-red-500" />
        <h3 className="font-montserrat text-lg font-bold">Failed to load analytics</h3>
        <p className="text-xs text-neutral-500">{error}</p>
        <Button variant="outline" size="sm" onClick={() => fetchAnalytics()}>
          <RefreshCw className="size-3.5 mr-1" /> Retry
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {/* Top Bar with Refresh button & Last Updated */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-montserrat text-lg font-bold tracking-tight text-foreground">
            Platform Overview
          </h2>
          <p className="text-xs text-neutral-500">
            Real-time aggregates across users, auction states, and 30-day bid volumes
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchAnalytics()}
          disabled={isLoading}
          className="text-xs"
        >
          <RefreshCw className={`size-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh Stats
        </Button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: 30-Day Bid Volume */}
        <div className="card-chai p-5 space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between text-neutral-500">
            <span className="text-xs font-medium">30-Day Bid Volume</span>
            <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
              <TrendingUp className="size-4" />
            </span>
          </div>
          <div className="text-2xl font-bold font-montserrat text-foreground">
            {formatCurrency(data?.bids.thirtyDayVolume || 0)}
          </div>
          <p className="text-[11px] text-neutral-400">
            Across {data?.bids.thirtyDayCount.toLocaleString() || 0} bids placed
          </p>
        </div>

        {/* Metric 2: Live Auctions */}
        <div className="card-chai p-5 space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between text-neutral-500">
            <span className="text-xs font-medium">Live Auctions</span>
            <span className="p-2 rounded-lg border border-neutral-800 text-foreground">
              <Activity className="size-4" />
            </span>
          </div>
          <div className="text-2xl font-bold font-montserrat text-foreground">
            {data?.auctions.live || 0}
          </div>
          <p className="text-[11px] text-neutral-400">
            Out of {data?.auctions.total || 0} all-time listings
          </p>
        </div>

        {/* Metric 3: Active Users */}
        <div className="card-chai p-5 space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between text-neutral-500">
            <span className="text-xs font-medium">Active Users</span>
            <span className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
              <Users className="size-4" />
            </span>
          </div>
          <div className="text-2xl font-bold font-montserrat text-foreground">
            {data?.users.active.toLocaleString() || 0}
          </div>
          <p className="text-[11px] text-neutral-400">
            {data?.users.suspended || 0} suspended accounts
          </p>
        </div>

        {/* Metric 4: Open Disputes */}
        <div className="card-chai p-5 space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between text-neutral-500">
            <span className="text-xs font-medium">Open Disputes</span>
            <span className={`p-2 rounded-lg ${(data?.disputes.open || 0) > 0 ? 'bg-red-500/10 text-red-500' : 'bg-neutral-500/10 text-neutral-400'}`}>
              <AlertTriangle className="size-4" />
            </span>
          </div>
          <div className={`text-2xl font-bold font-montserrat ${(data?.disputes.open || 0) > 0 ? 'text-red-400' : 'text-foreground'}`}>
            {data?.disputes.open || 0}
          </div>
          <p className="text-[11px] text-neutral-400">
            {(data?.disputes.open || 0) > 0 ? 'Action required by admin' : 'All reports resolved'}
          </p>
        </div>
      </div>

      {/* Breakdown Section: Auction Statuses & Quick Links */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Auction Health Breakdown */}
        <div className="lg:col-span-2 card-chai p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="font-montserrat text-sm font-semibold text-foreground">
              Auction Catalog Distribution
            </h3>
            <Link
              href="/admin/auctions"
              className="text-xs text-amber-500 hover:text-amber-400 flex items-center gap-1 font-medium"
            >
              Manage all <ArrowRight className="size-3" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl border border-neutral-800 bg-neutral-900/50 space-y-1">
              <span className="text-[11px] text-neutral-400 uppercase tracking-wider font-semibold">Live</span>
              <p className="text-xl font-bold text-emerald-400 font-montserrat">{data?.auctions.live || 0}</p>
              <p className="text-[10px] text-neutral-500">Accepting active bids</p>
            </div>

            <div className="p-3.5 rounded-xl border border-neutral-800 bg-neutral-900/50 space-y-1">
              <span className="text-[11px] text-neutral-400 uppercase tracking-wider font-semibold">Completed</span>
              <p className="text-xl font-bold text-foreground font-montserrat">{data?.auctions.completed || 0}</p>
              <p className="text-[10px] text-neutral-500">Sold to winners</p>
            </div>

            <div className="p-3.5 rounded-xl border border-neutral-800 bg-neutral-900/50 space-y-1">
              <span className="text-[11px] text-neutral-400 uppercase tracking-wider font-semibold">Unsold</span>
              <p className="text-xl font-bold text-neutral-400 font-montserrat">{data?.auctions.unsold || 0}</p>
              <p className="text-[10px] text-neutral-500">Ended with no bids</p>
            </div>

            <div className="p-3.5 rounded-xl border border-neutral-800 bg-neutral-900/50 space-y-1">
              <span className="text-[11px] text-neutral-400 uppercase tracking-wider font-semibold">Terminated</span>
              <p className="text-xl font-bold text-red-400 font-montserrat">{data?.auctions.terminated || 0}</p>
              <p className="text-[10px] text-neutral-500">Admin closed</p>
            </div>
          </div>

          <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-between text-xs text-neutral-400">
            <span>Total Catalog Items Tracked</span>
            <span className="font-semibold text-foreground">{data?.auctions.total || 0} listings</span>
          </div>
        </div>

        {/* Admin Quick Actions Card */}
        <div className="card-chai p-6 space-y-4">
          <h3 className="font-montserrat text-sm font-semibold text-foreground">
            Moderation Shortlinks
          </h3>

          <div className="space-y-2.5">
            <Link
              href="/admin/users"
              className="flex items-center justify-between p-3 rounded-lg border border-neutral-800 hover:border-neutral-700 bg-neutral-900/40 hover:bg-neutral-900 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <Users className="size-4 text-blue-400" />
                <div>
                  <p className="text-xs font-medium text-foreground">User Management</p>
                  <p className="text-[10px] text-neutral-500">Search, suspend & reactivate</p>
                </div>
              </div>
              <ArrowRight className="size-3.5 text-neutral-500 group-hover:text-foreground transition-colors" />
            </Link>

            <Link
              href="/admin/auctions"
              className="flex items-center justify-between p-3 rounded-lg border border-neutral-800 hover:border-neutral-700 bg-neutral-900/40 hover:bg-neutral-900 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <Gavel className="size-4 text-amber-400" />
                <div>
                  <p className="text-xs font-medium text-foreground">Auction Moderation</p>
                  <p className="text-[10px] text-neutral-500">Flag, terminate & delete listings</p>
                </div>
              </div>
              <ArrowRight className="size-3.5 text-neutral-500 group-hover:text-foreground transition-colors" />
            </Link>

            <Link
              href="/admin/disputes"
              className="flex items-center justify-between p-3 rounded-lg border border-neutral-800 hover:border-neutral-700 bg-neutral-900/40 hover:bg-neutral-900 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <AlertTriangle className="size-4 text-red-400" />
                <div>
                  <p className="text-xs font-medium text-foreground">Dispute Resolution</p>
                  <p className="text-[10px] text-neutral-500">
                    {data?.disputes.open || 0} open case(s)
                  </p>
                </div>
              </div>
              <ArrowRight className="size-3.5 text-neutral-500 group-hover:text-foreground transition-colors" />
            </Link>
          </div>
        </div>
      </div>

      {/* Broadcast Announcement Form */}
      <div className="card-chai p-6 space-y-4">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg border border-neutral-850 text-foreground">
            <Megaphone className="size-4" />
          </span>
          <div>
            <h3 className="font-montserrat text-sm font-semibold text-foreground">
              Broadcast System Announcement
            </h3>
            <p className="text-xs text-neutral-500">
              Dispatches a persistent notification and real-time socket toast to all online users
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
            <label className="block text-xs font-medium text-neutral-400 mb-1">
              Title (Optional)
            </label>
            <Input
              value={announcementTitle}
              onChange={(e) => setAnnouncementTitle(e.target.value)}
              placeholder="e.g. Scheduled Maintenance, New Featured Auctions..."
              className="text-xs"
              maxLength={100}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1">
              Message <span className="text-red-400">*</span>
            </label>
            <Textarea
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
              {isBroadcasting ? 'Broadcasting...' : 'Broadcast Announcement'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

