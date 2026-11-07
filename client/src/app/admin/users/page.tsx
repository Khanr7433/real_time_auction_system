'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Chip } from '@/components/ui/chip';
import { Alert } from '@/components/ui/alert';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  Users,
  Search,
  ShieldAlert,
  ShieldCheck,
  UserX,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Filter,
} from 'lucide-react';

interface UserItem {
  _id: string;
  displayName: string;
  email: string;
  role: 'user' | 'admin';
  avatar?: string;
  isSuspended: boolean;
  createdAt: string;
  updatedAt?: string;
}

interface UsersApiResponse {
  users: UserItem[];
  total: number;
  page: number;
  totalPages: number;
  hasMore: boolean;
}

export default function AdminUsersPage() {
  const { user: currentAdmin } = useAuth();

  const [users, setUsers] = useState<UserItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');
  const [roleFilter, setRoleFilter] = useState<'all' | 'user' | 'admin'>('all');

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [actionUserId, setActionUserId] = useState<string | null>(null);
  const [confirmSuspendUser, setConfirmSuspendUser] = useState<{ id: string; displayName: string } | null>(null);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const fetchUsers = useCallback(async (currentPage: number, searchTerm: string, status: string, role: string) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '15',
      });
      if (searchTerm.trim()) params.set('search', searchTerm.trim());
      if (status !== 'all') params.set('status', status);
      if (role !== 'all') params.set('role', role);

      const res = await api.get<UsersApiResponse>(`/admin/users?${params.toString()}`);
      setUsers(res.users || []);
      setTotal(res.total || 0);
      setTotalPages(res.totalPages || 1);
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Failed to load user accounts',
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers(page, search, statusFilter, roleFilter);
  }, [page, statusFilter, roleFilter, fetchUsers]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers(1, search, statusFilter, roleFilter);
  };

  const executeSuspend = async () => {
    if (!confirmSuspendUser) return;
    const { id: userId, displayName } = confirmSuspendUser;

    setActionUserId(userId);
    setNotification(null);
    try {
      const res = await api.patch<{ message: string; user: UserItem }>(`/admin/users/${userId}/suspend`);
      setNotification({
        type: 'success',
        message: res.message || `Account ${displayName} suspended successfully`,
      });
      // Update in state
      setUsers((prev) =>
        prev.map((u) => (u._id === userId ? { ...u, isSuspended: true } : u))
      );
      setConfirmSuspendUser(null);
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Failed to suspend account',
      });
    } finally {
      setActionUserId(null);
    }
  };

  const handleReactivate = async (userId: string, displayName: string) => {
    setActionUserId(userId);
    setNotification(null);
    try {
      const res = await api.patch<{ message: string; user: UserItem }>(`/admin/users/${userId}/reactivate`);
      setNotification({
        type: 'success',
        message: res.message || `Account ${displayName} reactivated successfully`,
      });
      // Update in state
      setUsers((prev) =>
        prev.map((u) => (u._id === userId ? { ...u, isSuspended: false } : u))
      );
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Failed to reactivate account',
      });
    } finally {
      setActionUserId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Controls Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-montserrat text-lg font-bold tracking-tight text-foreground">
            User Moderation
          </h2>
          <p className="text-xs text-neutral-500">
            Search, inspect registered accounts, and manage user suspensions
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchUsers(page, search, statusFilter, roleFilter)}
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
              placeholder="Search by display name or email address..."
              className="pl-9 text-xs"
            />
          </div>
          <Button type="submit" variant="soft" size="sm" className="text-xs shrink-0">
            Search
          </Button>
        </form>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-neutral-800/60 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-neutral-500 font-medium flex items-center gap-1">
              <Filter className="size-3" /> Status:
            </span>
            {(['all', 'active', 'suspended'] as const).map((s) => (
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
                {s}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-neutral-500 font-medium">Role:</span>
            {(['all', 'user', 'admin'] as const).map((r) => (
              <button
                key={r}
                onClick={() => {
                  setRoleFilter(r);
                  setPage(1);
                }}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors capitalize ${
                  roleFilter === r
                    ? 'bg-neutral-800 text-foreground border border-neutral-700'
                    : 'text-neutral-500 hover:text-foreground'
                }`}
              >
                {r === 'all' ? 'All Roles' : r}
              </button>
            ))}
          </div>

          <span className="text-neutral-500 text-[11px]">
            {total} total account{total === 1 ? '' : 's'}
          </span>
        </div>
      </div>

      {/* Users Table */}
      <div className="card-chai overflow-hidden">
        {isLoading && users.length === 0 ? (
          <div className="p-8 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 bg-neutral-800/30 rounded animate-pulse" />
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Users className="size-10 mx-auto text-neutral-600" />
            <p className="text-sm font-medium text-foreground">No users found</p>
            <p className="text-xs text-neutral-500">
              Try adjusting your search criteria or status filters.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="pr-4 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((item) => {
                const isCurrentAdmin = item._id === currentAdmin?.id;
                const isActionLoading = actionUserId === item._id;

                return (
                  <TableRow key={item._id}>
                    {/* Name & Avatar */}
                    <TableCell className="pl-4">
                      <div className="flex items-center gap-3">
                        <div className="size-8 rounded-full bg-neutral-800 flex items-center justify-center font-bold text-[11px] text-foreground border border-neutral-700/80 shrink-0">
                          {item.avatar ? (
                            <img
                              src={item.avatar}
                              alt={item.displayName}
                              className="size-full rounded-full object-cover"
                            />
                          ) : (
                            (item.displayName || 'U')[0].toUpperCase()
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-foreground flex items-center gap-1.5">
                            {item.displayName}
                            {isCurrentAdmin && (
                              <Chip tone="special">
                                You
                              </Chip>
                            )}
                          </p>
                          <span className="text-[10px] text-neutral-500 font-mono">
                            ID: {item._id.slice(-6)}
                          </span>
                        </div>
                      </div>
                    </TableCell>

                    {/* Email */}
                    <TableCell className="text-neutral-300 font-mono text-[11px]">
                      {item.email}
                    </TableCell>

                    {/* Role */}
                    <TableCell>
                      <Chip
                        tone={item.role === 'admin' ? 'special' : 'default'}
                        icon={item.role === 'admin' ? <ShieldCheck className="size-3" /> : undefined}
                      >
                        {item.role}
                      </Chip>
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      {item.isSuspended ? (
                        <Chip tone="danger" icon={<UserX className="size-3" />}>
                          Suspended
                        </Chip>
                      ) : (
                        <Chip tone="success" icon={<UserCheck className="size-3" />}>
                          Active
                        </Chip>
                      )}
                    </TableCell>

                    {/* Joined Date */}
                    <TableCell className="text-neutral-400 text-[11px]">
                      {new Date(item.createdAt).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="pr-4 text-right">
                      {isCurrentAdmin ? (
                        <span className="text-[11px] text-neutral-600 italic">No action</span>
                      ) : item.isSuspended ? (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isActionLoading}
                          onClick={() => handleReactivate(item._id, item.displayName)}
                          className="text-[11px] h-7 px-2.5 text-emerald-400 hover:text-emerald-300 border-emerald-500/30 hover:border-emerald-500/50"
                        >
                          <UserCheck className="size-3 mr-1" />
                          {isActionLoading ? 'Saving...' : 'Reactivate'}
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isActionLoading}
                          onClick={() => setConfirmSuspendUser({ id: item._id, displayName: item.displayName })}
                          className="text-[11px] h-7 px-2.5 text-red-400 hover:text-red-300 border-red-500/30 hover:border-red-500/50"
                        >
                          <UserX className="size-3 mr-1" />
                          {isActionLoading ? 'Saving...' : 'Suspend'}
                        </Button>
                      )}
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

      <ConfirmDialog
        open={!!confirmSuspendUser}
        title="Suspend user account"
        description={`Are you sure you want to suspend "${confirmSuspendUser?.displayName}"? Their active sessions and socket connections will be immediately terminated.`}
        confirmLabel="Suspend User"
        tone="danger"
        busy={actionUserId === confirmSuspendUser?.id}
        onConfirm={executeSuspend}
        onCancel={() => setConfirmSuspendUser(null)}
      />
    </div>
  );
}

