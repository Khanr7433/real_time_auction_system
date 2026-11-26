'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useSocket } from '@/context/SocketContext';
import { NotificationItem, NotificationsResponse } from '@/types/notification';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { Alert } from '@/components/ui/alert';
import { Segmented } from '@/components/ui/segmented';
import {
  Bell,
  CheckCircle2,
  Clock,
  Trophy,
  Tag,
  AlertCircle,
  Megaphone,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

export default function NotificationsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { socket } = useSocket();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const emitUnreadSync = useCallback((count: number) => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('notifications:updated', { detail: { unreadCount: count } }));
    }
  }, []);

  const fetchNotifications = useCallback(
    async (currentPage: number, currentFilter: 'all' | 'unread') => {
      setIsLoading(true);
      setError(null);
      try {
        const queryParams = new URLSearchParams({
          page: currentPage.toString(),
          limit: '15',
        });
        if (currentFilter === 'unread') {
          queryParams.set('isRead', 'false');
        }

        const data: NotificationsResponse = await api.get(`/notifications?${queryParams.toString()}`);
        setNotifications(data.notifications || []);
        setTotal(data.total || 0);
        const nextUnread = data.unreadCount || 0;
        setUnreadCount(nextUnread);
        setTotalPages(data.totalPages || 1);
        emitUnreadSync(nextUnread);
      } catch (err: any) {
        setError(err.message || 'Failed to load notifications');
      } finally {
        setIsLoading(false);
      }
    },
    [emitUnreadSync]
  );

  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications(page, filter);
    }
  }, [isAuthenticated, page, filter, fetchNotifications]);

  // Listen to new real-time notifications to update list dynamically
  useEffect(() => {
    if (!socket) return;

    const handleNewNotification = (notif: NotificationItem) => {
      setNotifications((prev) => {
        if (notif._id && prev.some((item) => item._id === notif._id)) {
          return prev;
        }
        return [notif, ...prev];
      });
      if (notif._id) {
        setUnreadCount((prev) => prev + 1);
      }
      setTotal((prev) => prev + 1);
    };

    socket.on('notification', handleNewNotification);

    return () => {
      socket.off('notification', handleNewNotification);
    };
  }, [socket]);

  const handleMarkAsRead = async (notif: NotificationItem, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (notif.isRead) return;

    if (!notif._id) {
      setNotifications((prev) =>
        filter === 'unread'
          ? prev.filter((n) => n !== notif)
          : prev.map((n) => (n === notif ? { ...n, isRead: true } : n))
      );
      return;
    }

    const notifId = notif._id;
    try {
      const res = await api.patch(`/notifications/${notifId}/read`);
      setNotifications((prev) =>
        filter === 'unread'
          ? prev.filter((n) => n._id !== notifId)
          : prev.map((n) => (n._id === notifId ? { ...n, isRead: true } : n))
      );
      const nextUnread = res?.unreadCount !== undefined ? res.unreadCount : Math.max(0, unreadCount - 1);
      setUnreadCount(nextUnread);
      emitUnreadSync(nextUnread);
    } catch (err: any) {
      console.error('Failed to mark notification as read:', err.message);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications((prev) =>
        filter === 'unread' ? [] : prev.map((n) => ({ ...n, isRead: true }))
      );
      setUnreadCount(0);
      emitUnreadSync(0);
    } catch (err: any) {
      console.error('Failed to mark all as read:', err.message);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'outbid':
        return <AlertCircle className="size-5 text-red-500 shrink-0" />;
      case 'auction_won':
        return <Trophy className="size-5 text-amber-400 shrink-0" />;
      case 'auction_sold':
        return <Tag className="size-5 text-emerald-400 shrink-0" />;
      case 'auction_unsold':
        return <Clock className="size-5 text-neutral-400 shrink-0" />;
      case 'ending_soon':
      case 'auction_ending_soon':
        return <Clock className="size-5 text-orange-400 shrink-0" />;
      case 'system_announcement':
      case 'system':
        return <Megaphone className="size-5 text-blue-400 shrink-0" />;
      default:
        return <Bell className="size-5 text-neutral-300 shrink-0" />;
    }
  };

  const formatRelativeTime = (isoString: string) => {
    const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return new Date(isoString).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
  };

  if (authLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6 sm:p-12 space-y-4">
        <div className="h-8 w-48 bg-neutral-200/50 dark:bg-neutral-800/50 rounded animate-pulse" />
        <div className="card-chai h-64 bg-neutral-200/30 dark:bg-neutral-800/30 animate-pulse" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 text-center space-y-4 card-chai">
        <Bell className="size-10 mx-auto text-yellow-800 dark:text-orange-200" />
        <h1 className="text-xl font-medium text-foreground">Sign in required</h1>
        <p className="text-xs text-neutral-500">
          Please sign in to access your notification history and auction alerts.
        </p>
        <div className="pt-2">
          <Button asChild variant="solid" size="md" className="w-full">
            <Link href="/login">Sign in</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 sm:p-12 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200 dark:border-neutral-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-medium tracking-tight text-foreground">
              Notifications
            </h1>
            {unreadCount > 0 && (
              <Chip tone="special">
                {unreadCount} unread
              </Chip>
            )}
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            Real-time updates on bids, auction results, and announcements
          </p>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleMarkAllAsRead}
              className="text-xs flex items-center gap-1.5"
            >
              <CheckCheck className="size-3.5" /> Mark all read
            </Button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="pb-1">
        <Segmented<'all' | 'unread'>
          label="Notification filter"
          options={[
            { value: 'all', label: `All (${total})` },
            { value: 'unread', label: `Unread only (${unreadCount})` },
          ]}
          value={filter}
          onChange={(val) => {
            setFilter(val);
            setPage(1);
          }}
        />
      </div>

      {/* Error State */}
      {error && (
        <Alert tone="danger">
          {error}
        </Alert>
      )}

      {/* Notification List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="card-chai h-20 bg-neutral-200/40 dark:bg-neutral-800/40 animate-pulse"
            />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <Card className="text-center py-16 px-6 space-y-3 sm:opacity-100">
          <Sparkles className="size-8 mx-auto text-neutral-400" />
          <h2 className="font-display text-sm font-semibold text-foreground">
            No notifications yet
          </h2>
          <p className="text-xs text-neutral-500 max-w-sm mx-auto">
            {filter === 'unread'
              ? 'You have caught up with all your notifications!'
              : 'When you place bids or list items, updates will appear here.'}
          </p>
          <div className="pt-2">
            <Button asChild variant="soft" size="sm">
              <Link href="/auctions">Explore live auctions</Link>
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-2.5">
          {notifications.map((notif, index) => {
            const auctionId = notif.data?.auctionId;
            const itemKey = notif._id || `local-${index}-${notif.createdAt || ''}`;
            return (
              <div
                key={itemKey}
                onClick={() => !notif.isRead && handleMarkAsRead(notif)}
                className={`card-chai group relative p-4 transition-all duration-200 cursor-pointer ${
                  notif.isRead
                    ? 'opacity-75 hover:opacity-100'
                    : 'border-brand/30'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div className="p-2 rounded-lg bg-neutral-200/60 dark:bg-neutral-800/80">
                    {getNotificationIcon(notif.type)}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <h3
                        className={`text-sm tracking-tight truncate ${
                          notif.isRead ? 'font-medium text-neutral-700 dark:text-neutral-300' : 'font-semibold text-foreground font-display'
                        }`}
                      >
                        {notif.title || 'Notification'}
                      </h3>
                      <span className="text-[11px] text-neutral-500 shrink-0">
                        {formatRelativeTime(notif.createdAt)}
                      </span>
                    </div>

                    <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                      {notif.message}
                    </p>

                    {auctionId && (
                      <div className="pt-1.5 flex items-center gap-3">
                        <Link
                          href={`/auctions/${auctionId}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!notif.isRead) handleMarkAsRead(notif);
                          }}
                          className="inline-flex items-center gap-1 text-xs text-yellow-800 dark:text-orange-200 hover:underline font-medium"
                        >
                          View auction <ArrowRight className="size-3" />
                        </Link>
                      </div>
                    )}
                  </div>

                  {!notif.isRead && (
                    <button
                      type="button"
                      onClick={(e) => handleMarkAsRead(notif, e)}
                      aria-label="Mark notification as read"
                      title="Mark as read"
                      className="size-2 rounded-full bg-foreground dark:bg-white shrink-0 mt-2 hover:scale-125 transition-transform cursor-pointer"
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-neutral-200 dark:border-neutral-800">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || isLoading}
            className="flex items-center gap-1"
          >
            <ChevronLeft className="size-4" /> Previous
          </Button>

          <span className="text-xs text-neutral-500">
            Page {page} of {totalPages}
          </span>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || isLoading}
            className="flex items-center gap-1"
          >
            Next <ChevronRight className="size-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

