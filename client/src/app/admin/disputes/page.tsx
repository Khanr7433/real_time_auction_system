'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Chip } from '@/components/ui/chip';
import { Alert } from '@/components/ui/alert';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Gavel,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Filter,
  MessageSquare,
  FileText,
  Send,
} from 'lucide-react';

interface DisputeUser {
  _id: string;
  displayName: string;
  email: string;
  avatar?: string;
}

interface DisputeAuction {
  _id: string;
  title: string;
  currentBid: number;
  status: string;
}

interface DisputeItem {
  _id: string;
  reporterId: DisputeUser;
  reportedUserId: DisputeUser;
  auctionId?: DisputeAuction;
  reason: string;
  description: string;
  status: 'open' | 'resolved' | 'dismissed';
  resolutionNote?: string;
  resolvedAt?: string;
  createdAt: string;
}

interface DisputesApiResponse {
  disputes: DisputeItem[];
  total: number;
  page: number;
  totalPages: number;
  hasMore: boolean;
}

export default function AdminDisputesPage() {
  const [disputes, setDisputes] = useState<DisputeItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'resolved' | 'dismissed'>('open');

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Resolution modal state
  const [resolvingDispute, setResolvingDispute] = useState<DisputeItem | null>(null);
  const [resolutionStatus, setResolutionStatus] = useState<'resolved' | 'dismissed'>('resolved');
  const [resolutionNote, setResolutionNote] = useState<string>('');

  const fetchDisputes = useCallback(async (currentPage: number, status: string) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '15',
      });
      if (status !== 'all') params.set('status', status);

      const res = await api.get<DisputesApiResponse>(`/admin/disputes?${params.toString()}`);
      setDisputes(res.disputes || []);
      setTotal(res.total || 0);
      setTotalPages(res.totalPages || 1);
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Failed to fetch disputes',
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDisputes(page, statusFilter);
  }, [page, statusFilter, fetchDisputes]);

  const handleResolveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvingDispute || !resolutionNote.trim()) return;

    setActionId(resolvingDispute._id);
    setNotification(null);
    try {
      const res = await api.patch<{ message: string; dispute: DisputeItem }>(
        `/admin/disputes/${resolvingDispute._id}/resolve`,
        {
          status: resolutionStatus,
          resolutionNote: resolutionNote.trim(),
        }
      );

      setNotification({
        type: 'success',
        message: res.message || 'Dispute resolved and both parties notified via message and notification.',
      });

      // Update in state
      setDisputes((prev) =>
        prev.map((d) =>
          d._id === resolvingDispute._id
            ? {
                ...d,
                status: resolutionStatus,
                resolutionNote: resolutionNote.trim(),
                resolvedAt: new Date().toISOString(),
              }
            : d
        )
      );

      setResolvingDispute(null);
      setResolutionNote('');
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Failed to submit dispute resolution',
      });
    } finally {
      setActionId(null);
    }
  };

  const formatReason = (reason: string) => {
    return reason
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const getStatusBadge = (status: DisputeItem['status']) => {
    switch (status) {
      case 'open':
        return (
          <Chip tone="danger" icon={<AlertTriangle className="size-3" />}>
            Open Case
          </Chip>
        );
      case 'resolved':
        return (
          <Chip tone="success" icon={<CheckCircle2 className="size-3" />}>
            Resolved
          </Chip>
        );
      case 'dismissed':
        return (
          <Chip tone="default" icon={<XCircle className="size-3" />}>
            Dismissed
          </Chip>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Controls Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-montserrat text-lg font-bold tracking-tight text-foreground">
            Dispute Resolution Center
          </h2>
          <p className="text-xs text-neutral-500">
            Arbitrate member grievances, investigate reports, and notify parties of official outcomes
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchDisputes(page, statusFilter)}
          disabled={isLoading}
          className="text-xs self-start sm:self-auto"
        >
          <RefreshCw className={`size-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Notification Banner */}
      {notification && (
        <Alert
          tone={notification.type === 'success' ? 'success' : 'danger'}
          onClose={() => setNotification(null)}
        >
          {notification.message}
        </Alert>
      )}

      {/* Status Filter Tabs */}
      <div className="card-chai p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-neutral-500 font-medium flex items-center gap-1">
            <Filter className="size-3" /> Status:
          </span>
          {(['open', 'resolved', 'dismissed', 'all'] as const).map((s) => (
            <button
              key={s}
              onClick={() => {
                setStatusFilter(s);
                setPage(1);
              }}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors capitalize ${
                statusFilter === s
                  ? 'bg-neutral-800 text-foreground border border-neutral-700'
                  : 'text-neutral-500 hover:text-foreground'
              }`}
            >
              {s === 'all' ? 'All Disputes' : `${s} cases`}
            </button>
          ))}
        </div>

        <span className="text-neutral-500 text-[11px]">
          {total} dispute{total === 1 ? '' : 's'} recorded
        </span>
      </div>

      {/* Disputes List */}
      <div className="space-y-4">
        {isLoading && disputes.length === 0 ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card-chai p-6 h-48 animate-pulse bg-neutral-200/20 dark:bg-neutral-800/20" />
            ))}
          </div>
        ) : disputes.length === 0 ? (
          <div className="card-chai p-12 text-center space-y-3">
            <ShieldCheck className="size-10 mx-auto text-emerald-500/80" />
            <p className="text-sm font-medium text-foreground">
              {statusFilter === 'open' ? 'No open disputes pending' : 'No disputes found'}
            </p>
            <p className="text-xs text-neutral-500">
              {statusFilter === 'open'
                ? 'All user dispute cases have been arbitrated and resolved.'
                : 'No dispute records match the selected filter.'}
            </p>
          </div>
        ) : (
          disputes.map((item) => {
            const isOpen = item.status === 'open';

            return (
              <div
                key={item._id}
                className="card-chai p-5 sm:p-6 space-y-4 border border-neutral-800 hover:border-neutral-700/80 transition-colors"
              >
                {/* Header: Status, Reason, Date */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-neutral-800/80">
                  <div className="flex flex-wrap items-center gap-2">
                    {getStatusBadge(item.status)}
                    <Chip tone="warning">
                      {formatReason(item.reason)}
                    </Chip>
                    <span className="text-[11px] font-mono text-neutral-500">
                      Case #{item._id.slice(-8).toUpperCase()}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-[11px] text-neutral-500">
                    <Clock className="size-3" />
                    <span>
                      Opened {new Date(item.createdAt).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>

                {/* Dispute Details & Parties Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  {/* Reporter Column */}
                  <div className="p-3.5 rounded-xl border border-neutral-800/90 bg-neutral-900/40 space-y-1.5">
                    <span className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold block">
                      Reporter (Filing Party)
                    </span>
                    <div className="flex items-center gap-2.5 pt-1">
                      <div className="size-7 rounded-full bg-neutral-800 flex items-center justify-center text-xs font-bold text-foreground">
                        {(item.reporterId?.displayName || 'U')[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground truncate">
                          {item.reporterId?.displayName || 'Unknown User'}
                        </p>
                        <p className="text-[10px] text-neutral-500 font-mono truncate">
                          {item.reporterId?.email || 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Reported User Column */}
                  <div className="p-3.5 rounded-xl border border-neutral-800/90 bg-neutral-900/40 space-y-1.5">
                    <span className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold block">
                      Reported Party
                    </span>
                    <div className="flex items-center gap-2.5 pt-1">
                      <div className="size-7 rounded-full bg-neutral-800 flex items-center justify-center text-xs font-bold text-foreground">
                        {(item.reportedUserId?.displayName || 'U')[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground truncate">
                          {item.reportedUserId?.displayName || 'Unknown User'}
                        </p>
                        <p className="text-[10px] text-neutral-500 font-mono truncate">
                          {item.reportedUserId?.email || 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Referenced Auction Column */}
                  <div className="p-3.5 rounded-xl border border-neutral-800/90 bg-neutral-900/40 space-y-1.5">
                    <span className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold block">
                      Referenced Auction
                    </span>
                    {item.auctionId ? (
                      <div className="pt-1">
                        <Link
                          href={`/auctions/${item.auctionId._id}`}
                          target="_blank"
                          className="font-semibold text-foreground hover:text-amber-400 flex items-center gap-1 group truncate"
                        >
                          <span className="truncate">{item.auctionId.title}</span>
                          <ExternalLink className="size-3 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </Link>
                        <p className="text-[10px] text-neutral-500 font-mono">
                          Bid: ${(item.auctionId.currentBid || 0).toLocaleString()} • {item.auctionId.status}
                        </p>
                      </div>
                    ) : (
                      <p className="text-neutral-500 text-[11px] pt-1">Direct member report</p>
                    )}
                  </div>
                </div>

                {/* Grievance Statement */}
                <div className="p-3.5 rounded-xl bg-neutral-900/60 border border-neutral-800 space-y-1">
                  <div className="flex items-center gap-1.5 text-[11px] text-neutral-400 font-medium">
                    <MessageSquare className="size-3.5 text-neutral-500" />
                    <span>Grievance Description</span>
                  </div>
                  <p className="text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed pl-5">
                    {item.description}
                  </p>
                </div>

                {/* Resolution Outcome Box (If resolved or dismissed) */}
                {item.resolutionNote && (
                  <div
                    className={`p-3.5 rounded-xl border space-y-1 text-xs ${
                      item.status === 'resolved'
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                        : 'bg-neutral-900/80 border-neutral-800 text-neutral-400'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold flex items-center gap-1.5">
                        <CheckCircle2 className="size-3.5 text-emerald-400" />
                        Official Resolution Note:
                      </span>
                      {item.resolvedAt && (
                        <span className="text-[10px] text-neutral-400">
                          {new Date(item.resolvedAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-foreground/90 pl-5 whitespace-pre-wrap">
                      {item.resolutionNote}
                    </p>
                  </div>
                )}

                {/* Action Footer for Open Disputes */}
                {isOpen && (
                  <div className="flex justify-end pt-2">
                    <Button
                      variant="soft"
                      size="sm"
                      onClick={() => {
                        setResolvingDispute(item);
                        setResolutionStatus('resolved');
                        setResolutionNote('');
                      }}
                      className="text-xs"
                    >
                      <ShieldCheck className="size-3.5 mr-1.5" />
                      Arbitrate & Resolve Case
                    </Button>
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="card-chai flex items-center justify-between p-3.5 text-xs">
            <span className="text-neutral-500">
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || isLoading}
                className="text-xs h-7 px-2.5"
              >
                <ChevronLeft className="size-3.5 mr-1" /> Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || isLoading}
                className="text-xs h-7 px-2.5"
              >
                Next <ChevronRight className="size-3.5 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Resolution Decision Modal Dialog */}
      {resolvingDispute && (
        <Dialog open={!!resolvingDispute} onClose={() => setResolvingDispute(null)}>
          <DialogHeader>
            <div className="flex items-center gap-3">
              <span className="p-2 rounded-xl border border-emerald-500/40 text-emerald-400 bg-transparent">
                <ShieldCheck className="size-5" />
              </span>
              <div>
                <DialogTitle>
                  Arbitrate Dispute Case #{resolvingDispute._id.slice(-8).toUpperCase()}
                </DialogTitle>
                <DialogDescription>
                  Enter final findings. Both parties will be immediately notified.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleResolveSubmit} className="space-y-4 mt-2">
            {/* Outcome Selection */}
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                Resolution Outcome
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setResolutionStatus('resolved')}
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    resolutionStatus === 'resolved'
                      ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400 font-semibold'
                      : 'border-neutral-800 bg-neutral-900/60 text-neutral-400'
                  }`}
                >
                  <p className="text-xs flex items-center gap-1.5">
                    <CheckCircle2 className="size-3.5" /> Resolved
                  </p>
                  <p className="text-[10px] text-neutral-500 mt-0.5">
                    Finding in favor or settlement reached
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setResolutionStatus('dismissed')}
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    resolutionStatus === 'dismissed'
                      ? 'border-neutral-600 bg-neutral-800 text-foreground font-semibold'
                      : 'border-neutral-800 bg-neutral-900/60 text-neutral-400'
                  }`}
                >
                  <p className="text-xs flex items-center gap-1.5">
                    <XCircle className="size-3.5" /> Dismissed
                  </p>
                  <p className="text-[10px] text-neutral-500 mt-0.5">
                    Unsubstantiated or invalid claim
                  </p>
                </button>
              </div>
            </div>

            {/* Resolution Note */}
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">
                Resolution Decision Note <span className="text-red-400">*</span>
              </label>
              <Textarea
                value={resolutionNote}
                onChange={(e) => setResolutionNote(e.target.value)}
                placeholder="Detail the rationale, any actions taken (e.g. refunds issued, seller warned), and guidance for both parties..."
                required
                rows={4}
                className="resize-none"
                maxLength={1000}
              />
              <span className="text-[10px] text-neutral-500 text-right block mt-1">
                {resolutionNote.length} / 1000 characters
              </span>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setResolvingDispute(null)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="solid"
                size="sm"
                disabled={actionId === resolvingDispute._id || !resolutionNote.trim()}
                className="text-xs"
              >
                <Send className="size-3.5 mr-1.5" />
                {actionId === resolvingDispute._id ? 'Submitting...' : 'Submit Resolution'}
              </Button>
            </DialogFooter>
          </form>
        </Dialog>
      )}
    </div>
  );
}

