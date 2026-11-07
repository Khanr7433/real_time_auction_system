import User from '../models/User.js';
import { Auction } from '../models/Auction.js';
import { Bid } from '../models/Bid.js';

// GET /api/users/profile
const getProfile = async (req, res, next) => {
  try {
    const user = req.user;
    return res.status(200).json({
      user: {
        id: user._id,
        email: user.email,
        displayName: user.displayName,
        contactInfo: user.contactInfo,
        avatar: user.avatar,
        role: user.role,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
};

// PUT /api/users/profile
const updateProfile = async (req, res, next) => {
  try {
    const { displayName, contactInfo, avatar } = req.body;
    const userId = req.user._id;

    const updates = {};
    if (displayName !== undefined) updates.displayName = displayName.trim();
    if (contactInfo !== undefined) updates.contactInfo = contactInfo.trim();
    if (avatar !== undefined) updates.avatar = avatar;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updates },
      { new: true, runValidators: true }
    );

    return res.status(200).json({
      message: 'Profile updated successfully',
      user: {
        id: updatedUser._id,
        email: updatedUser.email,
        displayName: updatedUser.displayName,
        contactInfo: updatedUser.contactInfo,
        avatar: updatedUser.avatar,
        role: updatedUser.role,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt,
      },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/users/bids - Get active bids placed by authenticated user
const getUserBids = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // Aggregate user's highest bids grouped by auction
    const bidsGroup = await Bid.aggregate([
      { $match: { bidderId: userId } },
      { $sort: { amount: -1, createdAt: -1 } },
      {
        $group: {
          _id: '$auctionId',
          myHighestBid: { $first: '$amount' },
          lastBidAt: { $first: '$createdAt' },
          totalUserBids: { $sum: 1 },
        },
      },
    ]);

    const auctionIds = bidsGroup.map((b) => b._id);
    const auctions = await Auction.find({ _id: { $in: auctionIds } })
      .populate('sellerId', 'displayName avatar email')
      .lean();

    const enriched = bidsGroup
      .map((b) => {
        const auction = auctions.find((a) => a._id.toString() === b._id.toString());
        if (!auction) return null;

        const isWinning = auction.highestBidderId?.toString() === userId.toString();
        const remainingSeconds = Math.max(
          0,
          Math.floor((new Date(auction.endTime).getTime() - Date.now()) / 1000)
        );

        return {
          auction,
          myHighestBid: b.myHighestBid,
          lastBidAt: b.lastBidAt,
          totalUserBids: b.totalUserBids,
          isWinning,
          timeRemainingSeconds: remainingSeconds,
        };
      })
      .filter(Boolean);

    return res.status(200).json({
      bids: enriched,
      total: enriched.length,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/users/won - Get auctions won by authenticated user
const getUserWonAuctions = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const wonAuctions = await Auction.find({
      highestBidderId: userId,
      status: 'completed',
    })
      .populate('sellerId', 'displayName avatar email')
      .sort({ endTime: -1 })
      .lean();

    const enriched = wonAuctions.map((a) => ({
      ...a,
      finalBid: a.currentBid,
    }));

    return res.status(200).json({
      auctions: enriched,
      total: enriched.length,
    });
  } catch (err) {
    next(err);
  }
};

export {
  getProfile,
  updateProfile,
  getUserBids,
  getUserWonAuctions,
};

