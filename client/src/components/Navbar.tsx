"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useSocket } from "@/context/SocketContext";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { MenuToggle } from "@/components/menu-toggle";
import {
  Gavel,
  User as UserIcon,
  Shield,
  LogOut,
  LayoutDashboard,
  Bell,
} from "lucide-react";

export function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const { socket } = useSocket();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setUnreadCount(0);
      return;
    }
    let isMounted = true;
    api
      .get("/notifications?isRead=false&limit=1")
      .then((res) => {
        if (isMounted && res && res.unreadCount !== undefined) {
          setUnreadCount(res.unreadCount);
        }
      })
      .catch(() => {});

    const handleNotificationsUpdated = (event: Event) => {
      const custom = event as CustomEvent<{ unreadCount?: number }>;
      if (typeof custom.detail?.unreadCount === "number") {
        setUnreadCount(custom.detail.unreadCount);
      }
    };

    window.addEventListener("notifications:updated", handleNotificationsUpdated);

    return () => {
      isMounted = false;
      window.removeEventListener("notifications:updated", handleNotificationsUpdated);
    };
  }, [isAuthenticated]);

  useEffect(() => {
    if (!socket || !isAuthenticated) return;

    const handleNewNotification = () => {
      setUnreadCount((prev) => prev + 1);
    };

    socket.on("notification", handleNewNotification);

    return () => {
      socket.off("notification", handleNewNotification);
    };
  }, [socket, isAuthenticated]);

  return (
    <header
      className={`sticky top-0 z-40 w-full border-b transition-colors duration-200 ${
        scrolled || mobileMenuOpen
          ? "border-border/80 bg-background/80 backdrop-blur-md"
          : "border-transparent bg-transparent"
      }`}
    >
      <div className="max-w-6xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
        {/* Brand / Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="size-8 rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-black flex items-center justify-center font-bold">
            <Gavel className="size-4.5" />
          </div>
          <span className="font-brand font-bold text-lg tracking-tight text-foreground">
            Bid<span className="text-yellow-800 dark:text-orange-100">Now</span>
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav aria-label="Primary navigation" className="hidden md:flex items-center gap-6 text-sm font-medium text-neutral-600 dark:text-neutral-400">
          <Link
            href="/auctions"
            className="hover:text-foreground transition-colors"
          >
            Auctions
          </Link>
          {isAuthenticated && (
            <Link
              href="/dashboard"
              className="hover:text-foreground transition-colors flex items-center gap-1.5"
            >
              <LayoutDashboard className="size-4" />
              Dashboard
            </Link>
          )}
          {isAuthenticated && user?.role === "admin" && (
            <Link
              href="/admin"
              className="text-yellow-800 dark:text-orange-100 hover:opacity-80 transition-opacity flex items-center gap-1"
            >
              <Shield className="size-4" />
              Admin
            </Link>
          )}
        </nav>

        {/* Desktop Auth Actions */}
        <div className="hidden md:flex items-center gap-3">
          <ThemeSwitcher />
          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard/notifications"
                className="p-2 rounded-lg text-neutral-500 hover:text-foreground hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors relative"
                aria-label={unreadCount > 0 ? `Notifications (${unreadCount} unread)` : "Notifications"}
                title="Notifications"
              >
                <Bell className="size-4.5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 flex size-2">
                    <span className="animate-ping absolute inline-flex size-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full size-2 bg-red-500" />
                  </span>
                )}
              </Link>
              <Link
                href="/dashboard/profile"
                className="flex items-center gap-2 text-sm text-foreground hover:text-brand px-3 py-1.5 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors"
              >
                <div className="size-6 rounded-full bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center text-xs font-semibold">
                  {user?.displayName ? (
                    user.displayName[0].toUpperCase()
                  ) : (
                    <UserIcon className="size-3.5" />
                  )}
                </div>
                <span className="font-medium text-xs max-w-30 truncate">
                  {user?.displayName || user?.email}
                </span>
              </Link>
              <Button
                type="button"
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
              <Button asChild variant="ghost" size="sm">
                <Link href="/login">Sign in</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/register">Register</Link>
              </Button>
            </div>
          )}
        </div>

        {/* Mobile menu trigger */}
        <div className="flex md:hidden items-center gap-2">
          <ThemeSwitcher />
          <MenuToggle
            open={mobileMenuOpen}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          />
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <nav aria-label="Mobile navigation" className="md:hidden border-b border-border bg-background px-4 py-4 space-y-3">
          <Link
            href="/auctions"
            className="block text-sm font-medium py-1.5 text-foreground"
            onClick={() => setMobileMenuOpen(false)}
          >
            Browse auctions
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
                className="flex items-center justify-between text-sm font-medium py-1.5 text-foreground"
                onClick={() => setMobileMenuOpen(false)}
              >
                <span>Notifications</span>
                <div className="flex items-center gap-1.5">
                  {unreadCount > 0 && (
                    <Chip tone="danger" className="text-[10px] py-0 px-1.5">
                      {unreadCount}
                    </Chip>
                  )}
                  <Bell className="size-4 text-neutral-400" />
                </div>
              </Link>
              <Link
                href="/dashboard/profile"
                className="block text-sm font-medium py-1.5 text-foreground"
                onClick={() => setMobileMenuOpen(false)}
              >
                Profile ({user?.displayName})
              </Link>
              {user?.role === "admin" && (
                <Link
                  href="/admin"
                  className="block text-sm font-medium py-1.5 text-yellow-800 dark:text-orange-100"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Admin panel
                </Link>
              )}
              <button
                type="button"
                className="w-full text-left text-sm font-medium py-1.5 text-red-500 flex items-center gap-2 cursor-pointer"
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
              <Button asChild variant="ghost" className="w-full justify-center">
                <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                  Sign in
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-center">
                <Link href="/register" onClick={() => setMobileMenuOpen(false)}>
                  Create account
                </Link>
              </Button>
            </div>
          )}
        </nav>
      )}
    </header>
  );
}
