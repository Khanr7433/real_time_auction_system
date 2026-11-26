'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Chip } from '@/components/ui/chip';
import { Alert } from '@/components/ui/alert';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { User, Mail, Shield, Calendar, Phone, Image as ImageIcon } from 'lucide-react';

export default function ProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, updateUser } = useAuth();

  const [displayName, setDisplayName] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [avatar, setAvatar] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || '');
      setContactInfo(user.contactInfo || '');
      setAvatar(user.avatar || '');
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!displayName.trim()) {
      setError('Display name is required');
      return;
    }

    setIsSaving(true);
    try {
      const res = await api.put('/users/profile', {
        displayName,
        contactInfo,
        avatar,
      });

      if (res && res.user) {
        updateUser(res.user);
        setMessage('Profile updated successfully');
      } else {
        setMessage('Profile saved');
      }
    } catch (err: any) {
      setError(err instanceof ApiError ? err.message : 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || !user) {
    return (
      <div className="max-w-4xl mx-auto p-6 sm:p-12">
        <p className="text-sm text-neutral-500">Loading your profile...</p>
      </div>
    );
  }

  const memberSince = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'Recently';

  return (
    <div className="max-w-4xl mx-auto p-6 sm:p-12 space-y-8">
      {/* Page Header */}
      <div className="space-y-1">
        <h1 className="font-montserrat text-2xl sm:text-3xl font-semibold tracking-tight">User profile</h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Manage your personal information and <span className="highlight">bidding account preferences</span>.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* User Card Overview */}
        <Card className="md:col-span-1 flex flex-col items-center text-center p-6 space-y-4">
          <div className="size-20 rounded-full bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center text-2xl font-bold text-foreground border border-neutral-300 dark:border-neutral-700 overflow-hidden">
            {avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatar} alt={user.displayName || user.email || 'User avatar'} className="size-full object-cover" />
            ) : (
              user.displayName?.trim()?.[0]?.toUpperCase() || <User className="size-8" />
            )}
          </div>

          <div className="space-y-1 w-full">
            <h2 className="font-montserrat font-semibold text-lg text-foreground truncate">{user.displayName || user.email || 'User'}</h2>
            <p className="text-xs text-neutral-500 truncate">{user.email ?? ''}</p>
          </div>

          <div className="w-full pt-4 border-t border-neutral-200 dark:border-neutral-800 space-y-2 text-left text-xs">
            <div className="flex items-center justify-between text-neutral-500">
              <span className="flex items-center gap-1.5">
                <Shield className="size-3.5" /> Role
              </span>
              <Chip tone="special" className="capitalize">
                {user.role}
              </Chip>
            </div>
            <div className="flex items-center justify-between text-neutral-500">
              <span className="flex items-center gap-1.5">
                <Calendar className="size-3.5" /> Joined
              </span>
              <span className="font-medium text-foreground">{memberSince}</span>
            </div>
          </div>
        </Card>

        {/* Edit Form */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-xl">Account details</CardTitle>
            <CardDescription>Update your public identity on BidNow.</CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4">
                <Alert tone="danger">{error}</Alert>
              </div>
            )}
            {message && (
              <div className="mb-4">
                <Alert tone="success">{message}</Alert>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                  <User className="size-3.5" /> Display name
                </label>
                <Input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your public name"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                  <Mail className="size-3.5" /> Email address (read-only)
                </label>
                <Input
                  type="email"
                  value={user.email ?? ''}
                  disabled
                  className="opacity-60 cursor-not-allowed"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                  <Phone className="size-3.5" /> Contact info (optional)
                </label>
                <Input
                  type="text"
                  value={contactInfo}
                  onChange={(e) => setContactInfo(e.target.value)}
                  placeholder="e.g. +1 555-0199 or discord handle"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                  <ImageIcon className="size-3.5" /> Avatar image URL (optional)
                </label>
                <Input
                  type="url"
                  value={avatar}
                  onChange={(e) => setAvatar(e.target.value)}
                  placeholder="https://example.com/avatar.jpg"
                />
              </div>

              <Button
                type="submit"
                variant="solid"
                size="md"
                className="mt-2"
                disabled={isSaving}
              >
                {isSaving ? 'Saving changes...' : 'Save changes'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

