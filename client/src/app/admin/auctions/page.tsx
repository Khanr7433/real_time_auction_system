'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Chip } from '@/components/ui/chip';
import { Alert } from '@/components/ui/alert';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import {
  Gavel,
  Search,
  AlertTriangle,
  Flag,
  Trash2,
  StopCircle,
  ExternalLink,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Filter,
  Clock,
  Eye,
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
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [flaggedOnly, setFlaggedOnly] = useState<boolean>(false);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

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
    fetchAuctions(page, search, statusFilter, flaggedOnly);
  }, [isAuthorized, page, statusFilter, flaggedOnly, fetchAuctions]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchAuctions(1, search, statusFilter, flaggedOnly);
  };

  // 1. Force Terminate Handler
  const handleTerminateConfirm = async () => {
    if (!terminateDialogAuction) return;
    setActionId(terminateDialogAuction._id);
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
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Failed to terminate auction',
      });
    } finally {
      setActionId(null);
    }
  };

  // 2. Flag / Unflag Handler
  const handleFlagSubmit = async () => {
    if (!flagDialogAuction) return;
    setActionId(flagDialogAuction._id);
    setNotification(null);
    try {
      const isCurrentlyFlagged = flagDialogAuction.isFlagged;
      const res = await api.patch<{ message: string; auction: AuctionItem }>(
        `/admin/auctions/${flagDialogAuction._id}/flag`,
        {
          isFlagged: !isCurrentlyFlagged,
          reason: isCurrentlyFlagged ? '' : flagReason.trim() || 'Flagged for review',
        }
      );
      setNotification({
        type: 'success',
        message: res.message || (isCurrentlyFlagged ? 'Auction unflagged' : 'Auction flagged for review'),
      });
      setAuctions((prev) =>
        prev.map((a) =>
          a._id === flagDialogAuction._id
            ? { ...a, isFlagged: !isCurrentlyFlagged, flagReason: isCurrentlyFlagged ? '' : flagReason.trim() }
            : a
        )
      );
      setFlagDialogAuction(null);
      setFlagReason('');
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Failed to update flag state',
      });
    } finally {
      setActionId(null);
    }
  };

  // 3. Delete / Remove Handler
  const handleDeleteConfirm = async () => {
    if (!deleteDialogAuction) return;
    setActionId(deleteDialogAuction._id);
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
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Failed to remove listing',
      });
    } finally {
      setActionId(null);
    }
  };

  const getStatusBadge = (status: AuctionItem['status']) => {
    switch (status) {
      case 'live':
        return (
          <Chip tone="success" dot>
            Live
          </Chip>
        );
      case 'completed':
        return (
          <Chip tone="default">
            Completed
          </Chip>
        );
      case 'unsold':
        return (
          <Chip tone="default">
            Unsold
          </Chip>
        );
      case 'admin-terminated':
        return (
          <Chip tone="danger">
            Terminated
          </Chip>
        );
      default:
        return (
          <Chip tone="default">
            {status}
          </Chip>
        );
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
          <h2 className="font-montserrat text-lg font-bold tracking-tight text-foreground">
            Auction Moderation
          </h2>
          <p className="text-xs text-neutral-500">
            Review active and closed listings, flag suspicious activity, or terminate items
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchAuctions(page, search, statusFilter, flaggedOnly)}
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

      {/* Filter and Search Bar */}
      <div className="card-chai p-4 space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title, description or seller..."
              className="pl-9 text-xs"
            />
          </div>
          <Button type="submit" variant="soft" size="sm" className="text-xs shrink-0">
            Search
          </Button>
        </form>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-neutral-800/60 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-neutral-500 font-medium flex items-center gap-1">
              <Filter className="size-3" /> Status:
            </span>
            {['all', 'live', 'completed', 'unsold', 'admin-terminated'].map((s) => (
              <button
                key={s}
                onClick={() => {
                  setStatusFilter(s);
                  setPage(1);
                }}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors capitalize ${
                  statusFilter === s
                    ? 'bg-neutral-800 text-foreground border border-neutral-700'
                    : 'text-neutral-500 hover:text-foreground'
                }`}
              >
                {s.replace('-', ' ')}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-1.5 cursor-pointer text-xs text-neutral-400 hover:text-foreground">
              <input
                type="checkbox"
                checked={flaggedOnly}
                onChange={(e) => {
                  setFlaggedOnly(e.target.checked);
                  setPage(1);
                }}
                className="rounded border-neutral-700 bg-neutral-900 text-amber-500 focus:ring-0"
              />
              <span className="flex items-center gap-1">
                <Flag className="size-3 text-red-400" /> Flagged only
              </span>
            </label>

            <span className="text-neutral-500 text-[11px]">
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
              <div key={i} className="h-12 bg-neutral-800/30 rounded animate-pulse" />
            ))}
          </div>
        ) : auctions.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Gavel className="size-10 mx-auto text-neutral-600" />
            <p className="text-sm font-medium text-foreground">No auctions found</p>
            <p className="text-xs text-neutral-500">
              No listings match the selected filters or query.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Item</TableHead>
                <TableHead>Seller</TableHead>
                <TableHead>Current Bid</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Flags</TableHead>
                <TableHead className="pr-4 text-right">Moderation Actions</TableHead>
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
                        <div className="size-10 rounded-lg bg-neutral-800 overflow-hidden border border-neutral-800 shrink-0">
                          {item.images && item.images.length > 0 ? (
                            <img
                              src={item.images[0]}
                              alt={item.title}
                              className="size-full object-cover"
                            />
                          ) : (
                            <div className="size-full flex items-center justify-center text-neutral-600">
                              <Gavel className="size-4" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <Link
                            href={`/auctions/${item._id}`}
                            target="_blank"
                            className="font-semibold text-foreground hover:text-amber-400 flex items-center gap-1 group truncate"
                          >
                            <span className="truncate">{item.title}</span>
                            <ExternalLink className="size-3 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </Link>
                          <p className="text-[10px] text-neutral-500 font-mono">
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
                      <p className="text-[10px] text-neutral-500 font-mono truncate max-w-[120px]">
                        {item.sellerId?.email || 'N/A'}
                      </p>
                    </TableCell>

                    {/* Price */}
                    <TableCell className="font-mono">
                      <span className="text-foreground font-bold">
                        ${(item.currentBid || item.startingBid || 0).toLocaleString()}
                      </span>
                      <span className="block text-[10px] text-neutral-500">
                        Start: ${(item.startingBid || 0).toLocaleString()}
                      </span>
                    </TableCell>

                    {/* Status */}
                    <TableCell>{getStatusBadge(item.status)}</TableCell>

                    {/* Flag state */}
                    <TableCell>
                      {item.isFlagged ? (
                        <div className="space-y-0.5">
                          <Chip tone="danger" icon={<Flag className="size-2.5 fill-red-400" />}>
                            Flagged
                          </Chip>
                          {item.flagReason && (
                            <p className="text-[10px] text-neutral-400 line-clamp-1 max-w-[140px]" title={item.flagReason}>
                              {item.flagReason}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-[11px] text-neutral-600">None</span>
                      )}
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="pr-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Flag / Unflag Button */}
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isActionLoading}
                          onClick={() => {
                            setFlagDialogAuction(item);
                            setFlagReason(item.flagReason || '');
                          }}
                          className={`text-[11px] h-7 px-2 ${
                            item.isFlagged
                              ? 'text-amber-400 border-amber-500/30 hover:border-amber-500/50'
                              : 'text-neutral-400 hover:text-foreground'
                          }`}
                          title={item.isFlagged ? 'Review / Unflag' : 'Flag Listing'}
                        >
                          <Flag className={`size-3 ${item.isFlagged ? 'fill-amber-400' : ''}`} />
                        </Button>

                        {/* Terminate Button (Only for live auctions) */}
                        {item.status === 'live' && (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={isActionLoading}
                            onClick={() => {
                              setTerminateDialogAuction(item);
                              setTerminateReason('');
                            }}
                            className="text-[11px] h-7 px-2 text-red-400 hover:text-red-300 border-red-500/30 hover:border-red-500/50"
                            title="Force-terminate auction"
                          >
                            <StopCircle className="size-3 mr-1" />
                            End
                          </Button>
                        )}

                        {/* Delete Button */}
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isActionLoading}
                          onClick={() => {
                            setDeleteDialogAuction(item);
                            setDeleteReason('');
                          }}
                          className="text-[11px] h-7 px-2 text-neutral-500 hover:text-red-400 border-neutral-800 hover:border-red-500/30"
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
          <div className="flex items-center justify-between p-3.5 border-t border-neutral-800 bg-neutral-900/40 text-xs">
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

      {/* Force Terminate Modal Dialog */}
      {terminateDialogAuction && (
        <Dialog open={!!terminateDialogAuction} onClose={() => setTerminateDialogAuction(null)}>
          <DialogHeader>
            <div className="flex items-center gap-3">
              <span className="p-2 rounded-xl border border-red-500/40 text-red-500 bg-red-500/10">
                <StopCircle className="size-5" />
              </span>
              <div>
                <DialogTitle>Force-Terminate Auction</DialogTitle>
                <DialogDescription>
                  Instantly close active bidding for &quot;{terminateDialogAuction.title}&quot;
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <p className="text-xs text-neutral-400 leading-relaxed">
            This action terminates the auction immediately. Connected clients in the auction room will receive the <code className="text-red-400">auction_ended</code> socket event and the seller will be notified.
          </p>

          <div className="mt-3">
            <label className="block text-xs font-medium text-neutral-400 mb-1">
              Termination Reason
            </label>
            <Input
              value={terminateReason}
              onChange={(e) => setTerminateReason(e.target.value)}
              placeholder="e.g. Terms of Service violation, duplicate listing..."
              className="text-xs"
            />
          </div>

          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTerminateDialogAuction(null)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleTerminateConfirm}
              disabled={actionId === terminateDialogAuction._id}
              className="text-xs"
            >
              {actionId === terminateDialogAuction._id ? 'Terminating...' : 'Confirm Termination'}
            </Button>
          </DialogFooter>
        </Dialog>
      )}

      {/* Flag / Unflag Modal Dialog */}
      {flagDialogAuction && (
        <Dialog open={!!flagDialogAuction} onClose={() => setFlagDialogAuction(null)}>
          <DialogHeader>
            <div className="flex items-center gap-3">
              <span className="p-2 rounded-xl border border-neutral-700 text-foreground bg-neutral-800">
                <Flag className="size-5" />
              </span>
              <div>
                <DialogTitle>
                  {flagDialogAuction.isFlagged ? 'Review / Remove Flag' : 'Flag Listing for Review'}
                </DialogTitle>
                <DialogDescription>
                  {flagDialogAuction.title}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {!flagDialogAuction.isFlagged ? (
            <div className="mt-2">
              <label className="block text-xs font-medium text-neutral-400 mb-1">
                Reason for Flagging
              </label>
              <Input
                value={flagReason}
                onChange={(e) => setFlagReason(e.target.value)}
                placeholder="e.g. Suspicious bids, counterfeit risk, prohibited item..."
                className="text-xs"
              />
            </div>
          ) : (
            <p className="text-xs text-neutral-300 mt-2">
              This listing is currently flagged. Clicking confirm will clear the flag status.
            </p>
          )}

          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFlagDialogAuction(null)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              variant="solid"
              size="sm"
              onClick={handleFlagSubmit}
              disabled={actionId === flagDialogAuction._id}
              className="text-xs"
            >
              {flagDialogAuction.isFlagged ? 'Remove Flag' : 'Flag Listing'}
            </Button>
          </DialogFooter>
        </Dialog>
      )}

      {/* Delete Auction Modal Dialog */}
      {deleteDialogAuction && (
        <Dialog open={!!deleteDialogAuction} onClose={() => setDeleteDialogAuction(null)}>
          <DialogHeader>
            <div className="flex items-center gap-3">
              <span className="p-2 rounded-xl border border-red-500/40 text-red-500 bg-red-500/10">
                <Trash2 className="size-5" />
              </span>
              <div>
                <DialogTitle>Delete Auction Listing</DialogTitle>
                <DialogDescription>
                  Permanently remove &quot;{deleteDialogAuction.title}&quot;
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <p className="text-xs text-red-400/90 leading-relaxed">
            Warning: This permanently removes the listing from the database and notifies the seller. This action cannot be undone.
          </p>

          <div className="mt-3">
            <label className="block text-xs font-medium text-neutral-400 mb-1">
              Removal Reason
            </label>
            <Input
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              placeholder="e.g. Fraudulent listing, prohibited goods..."
              className="text-xs"
            />
          </div>

          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteDialogAuction(null)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleDeleteConfirm}
              disabled={actionId === deleteDialogAuction._id}
              className="text-xs"
            >
              {actionId === deleteDialogAuction._id ? 'Deleting...' : 'Delete Listing'}
            </Button>
          </DialogFooter>
        </Dialog>
      )}
    </div>
  );
}

