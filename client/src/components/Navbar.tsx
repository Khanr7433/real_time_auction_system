'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Gavel, User as UserIcon, Shield, Menu, X, LogOut, LayoutDashboard, Bell } from 'lucide-react';

export function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-neutral-200/80 dark:border-neutral-800/80 bg-white/70 dark:bg-black/60 backdrop-blur-md transition-colors">
      <div className="max-w-6xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
        {/* Brand / Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="size-8 rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-black flex items-center justify-center font-bold">
            <Gavel className="size-4.5" />
          </div>
          <span className="font-montserrat font-bold text-lg tracking-tight text-foreground">
            Bid<span className="text-yellow-800 dark:text-orange-100">Now</span>
          </span>
          <Chip tone="success" dot className="text-[10px] py-0 px-1.5 uppercase font-semibold">
            Live
          </Chip>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-neutral-600 dark:text-neutral-400">
          <Link href="/auctions" className="hover:text-foreground transition-colors">
            Auctions
          </Link>
          {isAuthenticated && (
            <Link href="/dashboard" className="hover:text-foreground transition-colors flex items-center gap-1.5">
              <LayoutDashboard className="size-4" />
              Dashboard
            </Link>
          )}
          {isAuthenticated && user?.role === 'admin' && (
            <Link
              href="/admin"
              className="text-amber-600 dark:text-amber-400 hover:text-amber-500 flex items-center gap-1"
            >
              <Shield className="size-4" />
              Admin
            </Link>
          )}
        </nav>

        {/* Desktop Auth Actions */}
        <div className="hidden md:flex items-center gap-3">
          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard/notifications"
                className="p-2 rounded-lg text-neutral-500 hover:text-foreground hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors relative"
                title="Notifications"
              >
                <Bell className="size-4.5" />
              </Link>
              <Link
                href="/dashboard/profile"
                className="flex items-center gap-2 text-sm text-foreground hover:text-brand px-3 py-1.5 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors"
              >
                <div className="size-6 rounded-full bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center text-xs font-semibold">
                  {user?.displayName ? user.displayName[0].toUpperCase() : <UserIcon className="size-3.5" />}
                </div>
                <span className="font-medium text-xs max-w-[120px] truncate">{user?.displayName || user?.email}</span>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => logout()}
                className="text-neutral-500 hover:text-red-500 dark:hover:text-red-400"
              >
                <LogOut className="size-4 mr-1" />
                Logout
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  Sign in
                </Button>
              </Link>
              <Link href="/register">
                <Button variant="solid" size="sm">
                  Register
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Mobile menu trigger */}
        <button
          className="md:hidden p-2 text-neutral-600 dark:text-neutral-300"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-neutral-200 dark:border-neutral-800 bg-background px-4 py-4 space-y-3">
          <Link
            href="/auctions"
            className="block text-sm font-medium py-1.5 text-foreground"
            onClick={() => setMobileMenuOpen(false)}
          >
            Browse Auctions
          </Link>
          {isAuthenticated && (
            <>
              <Link
                href="/dashboard"
                className="block text-sm font-medium py-1.5 text-foreground"
                onClick={() => setMobileMenuOpen(false)}
              >
                Dashboard
              </Link>
              <Link
                href="/dashboard/notifications"
                className="block text-sm font-medium py-1.5 text-foreground flex items-center justify-between"
                onClick={() => setMobileMenuOpen(false)}
              >
                <span>Notifications</span>
                <Bell className="size-4 text-neutral-400" />
              </Link>
              <Link
                href="/dashboard/profile"
                className="block text-sm font-medium py-1.5 text-foreground"
                onClick={() => setMobileMenuOpen(false)}
              >
                Profile ({user?.displayName})
              </Link>
              {user?.role === 'admin' && (
                <Link
                  href="/admin"
                  className="block text-sm font-medium py-1.5 text-amber-500"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Admin Panel
                </Link>
              )}
              <button
                className="w-full text-left text-sm font-medium py-1.5 text-red-500 flex items-center gap-2"
                onClick={() => {
                  logout();
                  setMobileMenuOpen(false);
                }}
              >
                <LogOut className="size-4" />
                Sign out
              </button>
            </>
          )}
          {!isAuthenticated && (
            <div className="pt-2 flex flex-col gap-2">
              <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="outline" className="w-full justify-center">
                  Sign in
                </Button>
              </Link>
              <Link href="/register" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="solid" className="w-full justify-center">
                  Create account
                </Button>
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}

