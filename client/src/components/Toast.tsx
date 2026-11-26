'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useSocket } from '@/context/SocketContext';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Trophy,
  Megaphone,
  X,
  Tag,
  Info,
} from 'lucide-react';

export type ToastType =
  | 'outbid'
  | 'auction_won'
  | 'auction_sold'
  | 'auction_unsold'
  | 'auction_ending_soon'
  | 'system_announcement'
  | 'info'
  | 'success'
  | 'error';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message: string;
  data?: any;
  duration?: number;
}

interface ToastContextType {
  addToast: (toast: Omit<ToastItem, 'id'>) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const { socket } = useSocket();
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const removeToast = useCallback((id: string) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (toast: Omit<ToastItem, 'id'>) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const newToast: ToastItem = { ...toast, id };

      setToasts((prev) => [newToast, ...prev].slice(0, 5)); // Keep up to 5 visible toasts

      const duration = toast.duration ?? 6000;
      if (duration > 0) {
        const timer = setTimeout(() => {
          timersRef.current.delete(id);
          removeToast(id);
        }, duration);
        timersRef.current.set(id, timer);
      }
    },
    [removeToast]
  );

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
    };
  }, []);

  // Listen to WebSocket notification events from server
  useEffect(() => {
    if (!socket) return;

    // 1. Outbid event
    const handleOutbid = (data: any) => {
      addToast({
        type: 'outbid',
        title: data.title || 'Outbid Alert!',
        message:
          data.message ||
          `You were outbid on auction. New highest bid is $${data.data?.newBid?.toLocaleString() || ''}.`,
        data: data.data,
      });
    };

    // 2. Auction Won
    const handleAuctionWon = (data: any) => {
      addToast({
        type: 'auction_won',
        title: data.title || 'Auction Won!',
        message:
          data.message ||
          `Congratulations! You won the auction for $${data.data?.finalPrice?.toLocaleString() || ''}.`,
        data: data.data,
        duration: 9000,
      });
    };

    // 3. Auction Sold
    const handleAuctionSold = (data: any) => {
      addToast({
        type: 'auction_sold',
        title: data.title || 'Listing Sold!',
        message:
          data.message ||
          `Your item has sold for $${data.data?.finalPrice?.toLocaleString() || ''}!`,
        data: data.data,
        duration: 8000,
      });
    };

    // 4. Auction Unsold
    const handleAuctionUnsold = (data: any) => {
      addToast({
        type: 'auction_unsold',
        title: data.title || 'Listing Ended',
        message: data.message || 'Your listing concluded with no bids placed.',
        data: data.data,
      });
    };

    // 5. Ending Soon Warning
    const handleEndingSoon = (data: any) => {
      addToast({
        type: 'auction_ending_soon',
        title: data?.title || 'Ending Soon',
        message: data?.message || 'An auction you are watching will end in 5 minutes!',
        data: data?.data ?? data,
      });
    };

    // 6. System Announcement
    const handleSystemAnnouncement = (data: any) => {
      addToast({
        type: 'system_announcement',
        title: data?.title || 'System Announcement',
        message: data?.message || 'Notice from BidNow administration.',
        data: data?.data ?? data,
        duration: 10000,
      });
    };

    socket.on('outbid', handleOutbid);
    socket.on('auction_won', handleAuctionWon);
    socket.on('auction_sold', handleAuctionSold);
    socket.on('auction_unsold', handleAuctionUnsold);
    socket.on('auction_ending_soon', handleEndingSoon);
    socket.on('ending_soon', handleEndingSoon);
    socket.on('system_announcement', handleSystemAnnouncement);

    return () => {
      socket.off('outbid', handleOutbid);
      socket.off('auction_won', handleAuctionWon);
      socket.off('auction_sold', handleAuctionSold);
      socket.off('auction_unsold', handleAuctionUnsold);
      socket.off('auction_ending_soon', handleEndingSoon);
      socket.off('ending_soon', handleEndingSoon);
      socket.off('system_announcement', handleSystemAnnouncement);
    };
  }, [socket, addToast]);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      {/* Toast rendering portal / overlay */}
      <div
        aria-live="polite"
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0"
      >
        {toasts.map((toast) => (
          <ToastCard key={toast.id} toast={toast} onDismiss={() => removeToast(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

function ToastCard({ toast, onDismiss }: { toast: ToastItem; onDismiss: () => void }) {
  const getIconAndStyle = () => {
    switch (toast.type) {
      case 'outbid':
        return {
          icon: <AlertCircle className="size-5 text-red-500 shrink-0" />,
          border: 'border-red-500/30',
          bg: 'bg-red-950/20 dark:bg-red-950/40',
        };
      case 'auction_won':
        return {
          icon: <Trophy className="size-5 text-amber-400 shrink-0" />,
          border: 'border-amber-400/30',
          bg: 'bg-neutral-900/80',
        };
      case 'auction_sold':
        return {
          icon: <Tag className="size-5 text-emerald-400 shrink-0" />,
          border: 'border-emerald-500/30',
          bg: 'bg-neutral-900/80',
        };
      case 'auction_unsold':
        return {
          icon: <Clock className="size-5 text-neutral-400 shrink-0" />,
          border: 'border-neutral-700',
          bg: 'bg-neutral-900/80',
        };
      case 'auction_ending_soon':
        return {
          icon: <Clock className="size-5 text-amber-400 shrink-0" />,
          border: 'border-amber-500/30',
          bg: 'bg-neutral-900/80',
        };
      case 'system_announcement':
        return {
          icon: <Megaphone className="size-5 text-blue-400 shrink-0" />,
          border: 'border-blue-500/40',
          bg: 'bg-blue-950/20 dark:bg-blue-950/40',
        };
      case 'success':
        return {
          icon: <CheckCircle2 className="size-5 text-emerald-400 shrink-0" />,
          border: 'border-emerald-500/30',
          bg: 'bg-emerald-950/20',
        };
      case 'error':
        return {
          icon: <AlertCircle className="size-5 text-red-500 shrink-0" />,
          border: 'border-red-500/30',
          bg: 'bg-red-950/20',
        };
      default:
        return {
          icon: <Info className="size-5 text-neutral-300 shrink-0" />,
          border: 'border-neutral-500/20',
          bg: 'bg-neutral-900/40',
        };
    }
  };

  const style = getIconAndStyle();
  const auctionId = toast.data?.auctionId;

  return (
    <div
      className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border ${style.border} ${style.bg} backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-3`}
    >
      {style.icon}
      <div className="flex-1 min-w-0 space-y-1">
        <h4 className="font-montserrat text-sm font-semibold text-foreground tracking-tight">
          {toast.title}
        </h4>
        <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
          {toast.message}
        </p>
        {auctionId && (
          <Link
            href={`/auctions/${auctionId}`}
            onClick={onDismiss}
            className="inline-block pt-1 text-xs text-yellow-800 dark:text-orange-200 hover:underline font-medium"
          >
            View auction &rarr;
          </Link>
        )}
      </div>
      <button
        onClick={onDismiss}
        className="text-neutral-400 hover:text-foreground transition-colors p-0.5 rounded cursor-pointer"
        aria-label="Dismiss toast"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}

export default ToastProvider;

