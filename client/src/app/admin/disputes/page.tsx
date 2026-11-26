'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Chip } from '@/components/ui/chip';
import { Alert } from '@/components/ui/alert';
import { Dialog, DialogActions } from '@/components/ui/dialog';
import { Segmented } from '@/components/ui/segmented';
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Filter,
  MessageSquare,
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
  reporterId?: DisputeUser | null;
  reportedUserId?: DisputeUser | null;
  auctionId?: DisputeAuction | null;
  title?: string;
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
  const { isAuthorized } = useAdminAccess();
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
  const [modalError, setModalError] = useState<string | null>(null);

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
    if (!isAuthorized) return;
    fetchDisputes(page, statusFilter);
  }, [isAuthorized, page, statusFilter, fetchDisputes]);

  const handleResolveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvingDispute || !resolutionNote.trim()) return;

    setActionId(resolvingDispute._id);
    setModalError(null);
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
        message: res.message || 'Dispute resolved and both parties notified.',
      });

      // Remove newly resolved/dismissed dispute from active 'open' view, otherwise update in place
      setDisputes((prev) =>
        statusFilter === 'open'
          ? prev.filter((d) => d._id !== resolvingDispute._id)
          : prev.map((d) =>
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
      if (statusFilter === 'open') {
        setTotal((prev) => Math.max(0, prev - 1));
      }

      setResolvingDispute(null);
      setResolutionNote('');
      setModalError(null);
    } catch (err: any) {
      setModalError(err.message || 'Failed to submit dispute resolution');
    } finally {
      setActionId(null);
    }
  };

  const getStatusBadge = (status: DisputeItem['status']) => {
    switch (status) {
      case 'open':
        return (
          <Chip tone="danger">
            <AlertTriangle className="size-3" /> Open case
          </Chip>
        );
      case 'resolved':
        return (
          <Chip tone="success">
            <CheckCircle2 className="size-3" /> Resolved
          </Chip>
        );
      case 'dismissed':
        return (
          <Chip tone="default">
            <XCircle className="size-3" /> Dismissed
          </Chip>
        );
      default:
        return null;
    }
  };

  if (!isAuthorized) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Title & Controls Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            Dispute resolution center
          </h2>
          <p className="text-xs text-muted-foreground">
            Arbitrate member grievances, investigate reports, and notify parties of official outcomes
          </p>
        </div>

        <Button
          type="button"
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
        <Alert tone={notification.type === 'success' ? 'success' : 'danger'}>
          {notification.message}
        </Alert>
      )}

      {/* Status Filter Tabs */}
      <div className="card-chai p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground font-medium flex items-center gap-1">
            <Filter className="size-3" /> Status:
          </span>
          <Segmented<'open' | 'resolved' | 'dismissed' | 'all'>
            label="Dispute status filter"
            options={[
              { value: 'open', label: 'Open cases' },
              { value: 'resolved', label: 'Resolved' },
              { value: 'dismissed', label: 'Dismissed' },
              { value: 'all', label: 'All disputes' },
            ]}
            value={statusFilter}
            onChange={(s) => {
              setStatusFilter(s);
              setPage(1);
            }}
          />
        </div>

        <span className="text-muted-foreground text-[11px]">
          {total} dispute{total === 1 ? '' : 's'} recorded
        </span>
      </div>

      {/* Disputes List */}
      <div className="space-y-4">
        {isLoading && disputes.length === 0 ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card-chai p-6 h-48 animate-pulse bg-muted/40" />
            ))}
          </div>
        ) : disputes.length === 0 ? (
          <div className="card-chai p-12 text-center space-y-3">
            <ShieldCheck className="size-10 mx-auto text-emerald-500/80" />
            <p className="text-sm font-medium text-foreground">
              {statusFilter === 'open' ? 'No open disputes pending' : 'No disputes found'}
            </p>
            <p className="text-xs text-muted-foreground">
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
                className="card-chai p-5 sm:p-6 space-y-4"
              >
                {/* Header: Status, Title, Date */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-border/80">
                  <div className="flex flex-wrap items-center gap-2">
                    {getStatusBadge(item.status)}
                    <Chip tone="special">
                      {item.title?.trim() || 'User dispute'}
                    </Chip>
                    <span className="text-[11px] font-mono text-muted-foreground">
                      Case #{item._id.slice(-8).toUpperCase()}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
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
                  <div className="p-3.5 rounded-xl border border-card-edge bg-card-fill space-y-1.5">
                    <span className="text-[10px] text-muted-foreground font-semibold block">
                      Reporter (filing party)
                    </span>
                    <div className="flex items-center gap-2.5 pt-1">
                      <div className="size-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-foreground">
                        {(item.reporterId?.displayName || 'U')[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground truncate">
                          {item.reporterId?.displayName || 'Unknown User'}
                        </p>
                        <p className="text-[10px] text-muted-foreground font-mono truncate">
                          {item.reporterId?.email || 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Reported User Column */}
                  <div className="p-3.5 rounded-xl border border-card-edge bg-card-fill space-y-1.5">
                    <span className="text-[10px] text-muted-foreground font-semibold block">
                      Reported party
                    </span>
                    {item.reportedUserId ? (
                      <div className="flex items-center gap-2.5 pt-1">
                        <div className="size-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-foreground">
                          {(item.reportedUserId.displayName || 'U')[0].toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground truncate">
                            {item.reportedUserId.displayName || 'Unknown User'}
                          </p>
                          <p className="text-[10px] text-muted-foreground font-mono truncate">
                            {item.reportedUserId.email || 'N/A'}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-[11px] pt-1">No specific user reported</p>
                    )}
                  </div>

                  {/* Referenced Auction Column */}
                  <div className="p-3.5 rounded-xl border border-card-edge bg-card-fill space-y-1.5">
                    <span className="text-[10px] text-muted-foreground font-semibold block">
                      Referenced auction
                    </span>
                    {item.auctionId ? (
                      <div className="pt-1">
                        <Link
                          href={`/auctions/${item.auctionId._id}`}
                          target="_blank"
                          className="font-semibold text-foreground hover:text-yellow-800 dark:hover:text-orange-100 flex items-center gap-1 group truncate"
                        >
                          <span className="truncate">{item.auctionId.title}</span>
                          <ExternalLink className="size-3 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </Link>
                        <p className="text-[10px] text-muted-foreground font-mono">
                          Bid: ${(item.auctionId.currentBid || 0).toLocaleString()} • {item.auctionId.status}
                        </p>
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-[11px] pt-1">Direct member report</p>
                    )}
                  </div>
                </div>

                {/* Grievance Statement */}
                <div className="p-3.5 rounded-xl bg-card-fill border border-card-edge space-y-1">
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium">
                    <MessageSquare className="size-3.5 text-muted-foreground" />
                    <span>Grievance description</span>
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
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                        : 'bg-card-fill border-card-edge text-muted-foreground'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold flex items-center gap-1.5">
                        <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                        Official resolution note:
                      </span>
                      {item.resolvedAt && (
                        <span className="text-[10px] text-muted-foreground">
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
                      type="button"
                      variant="soft"
                      size="sm"
                      onClick={() => {
                        setResolvingDispute(item);
                        setResolutionStatus('resolved');
                        setResolutionNote('');
                        setModalError(null);
                      }}
                      className="text-xs"
                    >
                      <ShieldCheck className="size-3.5 mr-1.5" />
                      Arbitrate &amp; resolve case
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
            <span className="text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || isLoading}
                className="text-xs h-7 px-2.5"
              >
                <ChevronLeft className="size-3.5 mr-1" /> Previous
              </Button>
              <Button
                type="button"
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
        <Dialog
          open={!!resolvingDispute}
          onClose={() => {
            if (!actionId) {
              setResolvingDispute(null);
              setModalError(null);
            }
          }}
          title={`Arbitrate dispute case #${resolvingDispute._id.slice(-8).toUpperCase()}`}
          description="Enter final findings. Both parties will be immediately notified."
          busy={actionId === resolvingDispute._id}
        >
          {modalError && (
            <div className="mt-3">
              <Alert tone="danger">{modalError}</Alert>
            </div>
          )}

          <form onSubmit={handleResolveSubmit} className="space-y-4 mt-4">
            {/* Outcome Selection */}
            <div>
              <span className="block text-xs font-medium text-muted-foreground mb-1.5">
                Resolution outcome
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setResolutionStatus('resolved')}
                  className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                    resolutionStatus === 'resolved'
                      ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-semibold'
                      : 'border-border bg-card-fill text-muted-foreground'
                  }`}
                >
                  <p className="text-xs flex items-center gap-1.5">
                    <CheckCircle2 className="size-3.5" /> Resolved
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Finding in favor or settlement reached
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setResolutionStatus('dismissed')}
                  className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                    resolutionStatus === 'dismissed'
                      ? 'border-foreground/30 bg-muted text-foreground font-semibold'
                      : 'border-border bg-card-fill text-muted-foreground'
                  }`}
                >
                  <p className="text-xs flex items-center gap-1.5">
                    <XCircle className="size-3.5" /> Dismissed
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Unsubstantiated or invalid claim
                  </p>
                </button>
              </div>
            </div>

            {/* Resolution Note */}
            <div>
              <label htmlFor="resolution-note-textarea" className="block text-xs font-medium text-muted-foreground mb-1">
                Resolution decision note <span className="text-red-500">*</span>
              </label>
              <Textarea
                id="resolution-note-textarea"
                value={resolutionNote}
                onChange={(e) => setResolutionNote(e.target.value)}
                placeholder="Detail the rationale, any actions taken (e.g. refunds issued, seller warned), and guidance for both parties..."
                required
                rows={4}
                className="resize-none"
                maxLength={1000}
              />
              <span className="text-[10px] text-muted-foreground text-right block mt-1">
                {resolutionNote.length} / 1000 characters
              </span>
            </div>

            <DialogActions>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={actionId === resolvingDispute._id}
                onClick={() => {
                  if (!actionId) {
                    setResolvingDispute(null);
                    setModalError(null);
                  }
                }}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="soft"
                size="sm"
                disabled={actionId === resolvingDispute._id || !resolutionNote.trim()}
                className="text-xs"
              >
                <Send className="size-3.5 mr-1.5" />
                {actionId === resolvingDispute._id ? 'Submitting...' : 'Submit resolution'}
              </Button>
            </DialogActions>
          </form>
        </Dialog>
      )}
    </div>
  );
}

