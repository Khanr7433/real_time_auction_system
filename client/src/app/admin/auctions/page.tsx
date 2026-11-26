'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { getMediaUrl } from '@/lib/utils';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Chip } from '@/components/ui/chip';
import { Alert } from '@/components/ui/alert';
import { Dialog, DialogActions } from '@/components/ui/dialog';
import { Segmented } from '@/components/ui/segmented';
import {
  Gavel,
  Search,
  Flag,
  Trash2,
  StopCircle,
  ExternalLink,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Filter,
} from 'lucide-react';

interface AuctionItem {
  _id: string;
  title: string;
  description: string;
  category: string;
  startingBid: number;
  currentBid: number;
  bidCount: number;
  status: 'pending' | 'live' | 'completed' | 'unsold' | 'admin-terminated';
  isFlagged?: boolean;
  flagReason?: string;
  images?: string[];
  endTime: string;
  timeRemainingSeconds?: number;
  sellerId?: {
    _id: string;
    displayName: string;
    email: string;
  };
  highestBidderId?: {
    _id: string;
    displayName: string;
    email: string;
  };
  createdAt: string;
}

interface AdminAuctionsResponse {
  auctions: AuctionItem[];
  total: number;
  page: number;
  totalPages: number;
  hasMore: boolean;
}

export default function AdminAuctionsPage() {
  const { isAuthorized } = useAdminAccess();
  const [auctions, setAuctions] = useState<AuctionItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [searchInput, setSearchInput] = useState<string>('');
  const [submittedSearch, setSubmittedSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [flaggedOnly, setFlaggedOnly] = useState<boolean>(false);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);

  // Modal / prompt dialog states
  const [terminateDialogAuction, setTerminateDialogAuction] = useState<AuctionItem | null>(null);
  const [terminateReason, setTerminateReason] = useState<string>('');

  const [flagDialogAuction, setFlagDialogAuction] = useState<AuctionItem | null>(null);
  const [flagReason, setFlagReason] = useState<string>('');

  const [deleteDialogAuction, setDeleteDialogAuction] = useState<AuctionItem | null>(null);
  const [deleteReason, setDeleteReason] = useState<string>('');

  const fetchAuctions = useCallback(async (
    currentPage: number,
    searchTerm: string,
    status: string,
    onlyFlagged: boolean
  ) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '15',
      });
      if (searchTerm.trim()) params.set('search', searchTerm.trim());
      if (status !== 'all') params.set('status', status);
      if (onlyFlagged) params.set('flagged', 'true');

      const res = await api.get<AdminAuctionsResponse>(`/admin/auctions?${params.toString()}`);
      setAuctions(res.auctions || []);
      setTotal(res.total || 0);
      setTotalPages(res.totalPages || 1);
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Failed to fetch auctions for moderation',
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthorized) return;
    fetchAuctions(page, submittedSearch, statusFilter, flaggedOnly);
  }, [isAuthorized, page, submittedSearch, statusFilter, flaggedOnly, fetchAuctions]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchInput.trim();
    if (page === 1 && trimmed === submittedSearch) {
      fetchAuctions(1, trimmed, statusFilter, flaggedOnly);
      return;
    }
    setPage(1);
    setSubmittedSearch(trimmed);
  };

  // 1. Force Terminate Handler
  const handleTerminateConfirm = async () => {
    if (!terminateDialogAuction) return;
    setActionId(terminateDialogAuction._id);
    setModalError(null);
    setNotification(null);
    try {
      const res = await api.post<{ message: string; auction: AuctionItem }>(
        `/admin/auctions/${terminateDialogAuction._id}/terminate`,
        { reason: terminateReason.trim() || 'Terminated by administrator' }
      );
      setNotification({
        type: 'success',
        message: res.message || 'Auction has been force-terminated successfully',
      });
      setAuctions((prev) =>
        prev.map((a) =>
          a._id === terminateDialogAuction._id ? { ...a, status: 'admin-terminated' } : a
        )
      );
      setTerminateDialogAuction(null);
      setTerminateReason('');
      setModalError(null);
    } catch (err: any) {
      setModalError(err.message || 'Failed to terminate auction');
    } finally {
      setActionId(null);
    }
  };

  // 2. Flag / Unflag Handler
  const handleFlagSubmit = async () => {
    if (!flagDialogAuction) return;
    setActionId(flagDialogAuction._id);
    setModalError(null);
    setNotification(null);
    try {
      const isCurrentlyFlagged = flagDialogAuction.isFlagged;
      const nextReason = isCurrentlyFlagged ? '' : flagReason.trim() || 'Flagged for review';
      const res = await api.patch<{ message: string; auction: AuctionItem }>(
        `/admin/auctions/${flagDialogAuction._id}/flag`,
        {
          isFlagged: !isCurrentlyFlagged,
          reason: nextReason,
        }
      );
      setNotification({
        type: 'success',
        message: res.message || (isCurrentlyFlagged ? 'Auction unflagged' : 'Auction flagged for review'),
      });
      setAuctions((prev) =>
        prev.map((a) =>
          a._id === flagDialogAuction._id
            ? { ...a, isFlagged: !isCurrentlyFlagged, flagReason: nextReason }
            : a
        )
      );
      setFlagDialogAuction(null);
      setFlagReason('');
      setModalError(null);
    } catch (err: any) {
      setModalError(err.message || 'Failed to update flag state');
    } finally {
      setActionId(null);
    }
  };

  // 3. Delete / Remove Handler
  const handleDeleteConfirm = async () => {
    if (!deleteDialogAuction) return;
    setActionId(deleteDialogAuction._id);
    setModalError(null);
    setNotification(null);
    try {
      const res = await api.delete<{ message: string }>(
        `/admin/auctions/${deleteDialogAuction._id}`,
        {
          body: JSON.stringify({ reason: deleteReason.trim() || 'Violation of platform guidelines' }),
        }
      );
      setNotification({
        type: 'success',
        message: res.message || 'Auction deleted successfully and seller notified',
      });
      setAuctions((prev) => prev.filter((a) => a._id !== deleteDialogAuction._id));
      setTotal((prev) => Math.max(0, prev - 1));
      setDeleteDialogAuction(null);
      setDeleteReason('');
      setModalError(null);
    } catch (err: any) {
      setModalError(err.message || 'Failed to remove listing');
    } finally {
      setActionId(null);
    }
  };

  const getStatusBadge = (status: AuctionItem['status']) => {
    switch (status) {
      case 'live':
        return <Chip tone="success">Live</Chip>;
      case 'completed':
        return <Chip tone="default">Completed</Chip>;
      case 'unsold':
        return <Chip tone="default">Unsold</Chip>;
      case 'admin-terminated':
        return <Chip tone="danger">Terminated</Chip>;
      default:
        return <Chip tone="default">{status}</Chip>;
    }
  };

  if (!isAuthorized) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Title & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            Auction moderation
          </h2>
          <p className="text-xs text-muted-foreground">
            Review active and closed listings, flag suspicious activity, or terminate items
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fetchAuctions(page, submittedSearch, statusFilter, flaggedOnly)}
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

      {/* Filter and Search Bar */}
      <div className="card-chai p-4 space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="Search auctions"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by title, description, or seller name/email..."
              className="pl-9 text-xs"
            />
          </div>
          <Button type="submit" variant="soft" size="sm" className="text-xs shrink-0">
            Search
          </Button>
        </form>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/60 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground font-medium flex items-center gap-1">
              <Filter className="size-3" /> Status:
            </span>
            <Segmented<string>
              label="Auction status filter"
              options={[
                { value: 'all', label: 'All' },
                { value: 'live', label: 'Live' },
                { value: 'completed', label: 'Completed' },
                { value: 'unsold', label: 'Unsold' },
                { value: 'admin-terminated', label: 'Admin terminated' },
              ]}
              value={statusFilter}
              onChange={(s) => {
                setStatusFilter(s);
                setPage(1);
              }}
            />
          </div>

          <div className="flex items-center gap-4">
            <label htmlFor="flagged-only-filter" className="flex items-center gap-1.5 cursor-pointer text-xs text-muted-foreground hover:text-foreground">
              <input
                id="flagged-only-filter"
                type="checkbox"
                checked={flaggedOnly}
                onChange={(e) => {
                  setFlaggedOnly(e.target.checked);
                  setPage(1);
                }}
                className="rounded border-border bg-background text-brand focus:ring-0"
              />
              <span className="flex items-center gap-1">
                <Flag className="size-3 text-red-500" /> Flagged only
              </span>
            </label>

            <span className="text-muted-foreground text-[11px]">
              {total} auction{total === 1 ? '' : 's'}
            </span>
          </div>
        </div>
      </div>

      {/* Auctions Table */}
      <div className="card-chai overflow-hidden">
        {isLoading && auctions.length === 0 ? (
          <div className="p-8 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 bg-muted/40 rounded animate-pulse" />
            ))}
          </div>
        ) : auctions.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Gavel className="size-10 mx-auto text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">No auctions found</p>
            <p className="text-xs text-muted-foreground">
              No listings match the selected filters or query.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Item</TableHead>
                <TableHead>Seller</TableHead>
                <TableHead>Current bid</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Flags</TableHead>
                <TableHead className="pr-4 text-right">Moderation actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {auctions.map((item) => {
                const isActionLoading = actionId === item._id;

                return (
                  <TableRow key={item._id}>
                    {/* Item Title & Thumbnail */}
                    <TableCell className="pl-4 max-w-xs">
                      <div className="flex items-center gap-3">
                        <div className="size-10 rounded-lg bg-muted overflow-hidden border border-border shrink-0">
                          {item.images && item.images.length > 0 ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={getMediaUrl(item.images[0])}
                              alt={item.title}
                              className="size-full object-cover"
                            />
                          ) : (
                            <div className="size-full flex items-center justify-center text-muted-foreground">
                              <Gavel className="size-4" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <Link
                            href={`/auctions/${item._id}`}
                            target="_blank"
                            className="font-semibold text-foreground hover:text-yellow-800 dark:hover:text-orange-100 flex items-center gap-1 group truncate"
                          >
                            <span className="truncate">{item.title}</span>
                            <ExternalLink className="size-3 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </Link>
                          <p className="text-[10px] text-muted-foreground font-mono">
                            ID: {item._id.slice(-6)} • {item.bidCount || 0} bids
                          </p>
                        </div>
                      </div>
                    </TableCell>

                    {/* Seller Info */}
                    <TableCell>
                      <p className="text-foreground font-medium text-[11px]">
                        {item.sellerId?.displayName || 'Unknown'}
                      </p>
                      <p className="text-[10px] text-muted-foreground font-mono truncate max-w-[120px]">
                        {item.sellerId?.email || 'N/A'}
                      </p>
                    </TableCell>

                    {/* Price */}
                    <TableCell className="font-mono">
                      <span className="text-foreground font-bold">
                        ${(item.currentBid || item.startingBid || 0).toLocaleString()}
                      </span>
                      <span className="block text-[10px] text-muted-foreground">
                        Start: ${(item.startingBid || 0).toLocaleString()}
                      </span>
                    </TableCell>

                    {/* Status */}
                    <TableCell>{getStatusBadge(item.status)}</TableCell>

                    {/* Flag state */}
                    <TableCell>
                      {item.isFlagged ? (
                        <div className="space-y-0.5">
                          <Chip tone="danger">
                            <Flag className="size-2.5" /> Flagged
                          </Chip>
                          {item.flagReason && (
                            <p className="text-[10px] text-muted-foreground line-clamp-1 max-w-[140px]" title={item.flagReason}>
                              {item.flagReason}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-[11px] text-muted-foreground">None</span>
                      )}
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="pr-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Flag / Unflag Button */}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isActionLoading}
                          onClick={() => {
                            setModalError(null);
                            setFlagDialogAuction(item);
                            setFlagReason(item.flagReason || '');
                          }}
                          className={`text-[11px] h-7 px-2 ${
                            item.isFlagged
                              ? 'text-yellow-800 dark:text-orange-100 border-brand/40'
                              : 'text-muted-foreground hover:text-foreground'
                          }`}
                          aria-label={item.isFlagged ? `Review or unflag ${item.title}` : `Flag ${item.title}`}
                          title={item.isFlagged ? 'Review / unflag' : 'Flag listing'}
                        >
                          <Flag className="size-3" />
                        </Button>

                        {/* Terminate Button (Only for live auctions) */}
                        {item.status === 'live' && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={isActionLoading}
                            onClick={() => {
                              setModalError(null);
                              setTerminateDialogAuction(item);
                              setTerminateReason('');
                            }}
                            className="text-[11px] h-7 px-2 text-red-600 dark:text-red-400 border-red-500/30 hover:border-red-500/50"
                            title="Force-terminate auction"
                          >
                            <StopCircle className="size-3 mr-1" />
                            End
                          </Button>
                        )}

                        {/* Delete Button */}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isActionLoading}
                          onClick={() => {
                            setModalError(null);
                            setDeleteDialogAuction(item);
                            setDeleteReason('');
                          }}
                          className="text-[11px] h-7 px-2 text-muted-foreground hover:text-red-500 border-border hover:border-red-500/30"
                          aria-label={`Delete ${item.title}`}
                          title="Delete listing completely"
                        >
                          <Trash2 className="size-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-3.5 border-t border-border bg-card-fill text-xs">
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

      {/* Force Terminate Modal Dialog */}
      {terminateDialogAuction && (
        <Dialog
          open={!!terminateDialogAuction}
          onClose={() => {
            if (!actionId) {
              setTerminateDialogAuction(null);
              setModalError(null);
            }
          }}
          title="Force-terminate auction"
          description={`Instantly close active bidding for "${terminateDialogAuction.title}"`}
          busy={actionId === terminateDialogAuction._id}
        >
          {modalError && (
            <div className="mt-3">
              <Alert tone="danger">{modalError}</Alert>
            </div>
          )}

          <p className="mt-3 text-xs text-muted-foreground leading-relaxed">
            This action terminates the auction immediately. Connected clients in the auction room will receive the <code className="text-red-500">auction_ended</code> socket event and the seller will be notified.
          </p>

          <div className="mt-3">
            <label htmlFor="terminate-reason-input" className="block text-xs font-medium text-muted-foreground mb-1">
              Termination reason
            </label>
            <Input
              id="terminate-reason-input"
              value={terminateReason}
              onChange={(e) => setTerminateReason(e.target.value)}
              placeholder="e.g. Terms of service violation, duplicate listing..."
              className="text-xs"
            />
          </div>

          <DialogActions>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={actionId === terminateDialogAuction._id}
              onClick={() => {
                if (!actionId) {
                  setTerminateDialogAuction(null);
                  setModalError(null);
                }
              }}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={handleTerminateConfirm}
              disabled={actionId === terminateDialogAuction._id}
              className="text-xs"
            >
              {actionId === terminateDialogAuction._id ? 'Terminating...' : 'Confirm termination'}
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {/* Flag / Unflag Modal Dialog */}
      {flagDialogAuction && (
        <Dialog
          open={!!flagDialogAuction}
          onClose={() => {
            if (!actionId) {
              setFlagDialogAuction(null);
              setModalError(null);
            }
          }}
          title={flagDialogAuction.isFlagged ? 'Review / remove flag' : 'Flag listing for review'}
          description={flagDialogAuction.title}
          busy={actionId === flagDialogAuction._id}
        >
          {modalError && (
            <div className="mt-3">
              <Alert tone="danger">{modalError}</Alert>
            </div>
          )}

          {!flagDialogAuction.isFlagged ? (
            <div className="mt-3">
              <label htmlFor="flag-reason-input" className="block text-xs font-medium text-muted-foreground mb-1">
                Reason for flagging
              </label>
              <Input
                id="flag-reason-input"
                value={flagReason}
                onChange={(e) => setFlagReason(e.target.value)}
                placeholder="e.g. Suspicious bids, counterfeit risk, prohibited item..."
                className="text-xs"
              />
            </div>
          ) : (
            <p className="text-xs text-muted-foreground mt-3">
              This listing is currently flagged. Clicking confirm will clear the flag status.
            </p>
          )}

          <DialogActions>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={actionId === flagDialogAuction._id}
              onClick={() => {
                if (!actionId) {
                  setFlagDialogAuction(null);
                  setModalError(null);
                }
              }}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="soft"
              size="sm"
              onClick={handleFlagSubmit}
              disabled={actionId === flagDialogAuction._id}
              className="text-xs"
            >
              {flagDialogAuction.isFlagged ? 'Remove flag' : 'Flag listing'}
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {/* Delete Auction Modal Dialog */}
      {deleteDialogAuction && (
        <Dialog
          open={!!deleteDialogAuction}
          onClose={() => {
            if (!actionId) {
              setDeleteDialogAuction(null);
              setModalError(null);
            }
          }}
          title="Delete auction listing"
          description={`Permanently remove "${deleteDialogAuction.title}"`}
          busy={actionId === deleteDialogAuction._id}
        >
          {modalError && (
            <div className="mt-3">
              <Alert tone="danger">{modalError}</Alert>
            </div>
          )}

          <p className="mt-3 text-xs text-red-600 dark:text-red-400 leading-relaxed">
            Warning: This permanently removes the listing from the database and notifies the seller. This action cannot be undone.
          </p>

          <div className="mt-3">
            <label htmlFor="delete-reason-input" className="block text-xs font-medium text-muted-foreground mb-1">
              Removal reason
            </label>
            <Input
              id="delete-reason-input"
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              placeholder="e.g. Fraudulent listing, prohibited goods..."
              className="text-xs"
            />
          </div>

          <DialogActions>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={actionId === deleteDialogAuction._id}
              onClick={() => {
                if (!actionId) {
                  setDeleteDialogAuction(null);
                  setModalError(null);
                }
              }}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={handleDeleteConfirm}
              disabled={actionId === deleteDialogAuction._id}
              className="text-xs"
            >
              {actionId === deleteDialogAuction._id ? 'Deleting...' : 'Delete listing'}
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </div>
  );
}

