export type NotificationType =
  | 'outbid'
  | 'auction_won'
  | 'auction_sold'
  | 'auction_unsold'
  | 'ending_soon'
  | 'system_announcement'
  | 'system';

export interface NotificationItem {
  _id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data: Record<string, any>;
  isRead: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface NotificationsResponse {
  notifications: NotificationItem[];
  total: number;
  unreadCount: number;
  page: number;
  totalPages: number;
  hasMore: boolean;
}

