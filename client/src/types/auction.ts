export interface AuctionSeller {
  _id: string;
  id?: string;
  displayName: string;
  avatar?: string;
  email?: string;
  createdAt?: string;
}

export interface Auction {
  _id: string;
  id?: string;
  sellerId: AuctionSeller | string;
  title: string;
  category: string;
  description: string;
  condition: 'new' | 'like-new' | 'good' | 'fair' | 'poor';
  startingBid: number;
  currentBid: number;
  highestBidderId?: { _id: string; displayName: string } | null;
  bidCount: number;
  images: string[];
  startTime: string;
  endTime: string;
  status: 'pending' | 'live' | 'completed' | 'unsold' | 'admin-terminated';
  version: number;
  timeRemainingSeconds?: number;
  createdAt?: string;
}

export interface AuctionsResponse {
  auctions: Auction[];
  total: number;
  page: number;
  totalPages: number;
  hasMore: boolean;
}
