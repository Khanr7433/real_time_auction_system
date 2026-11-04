import mongoose from 'mongoose';

const bidSchema = new mongoose.Schema(
  {
    auctionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Auction',
      required: [true, 'Auction reference is required'],
      index: true,
    },
    bidderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Bidder reference is required'],
      index: true,
    },
    amount: {
      type: Number,
      required: [true, 'Bid amount is required'],
      min: [0.01, 'Bid amount must be greater than zero'],
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Compound index for chronological bid retrieval per auction
bidSchema.index({ auctionId: 1, createdAt: -1 });

export const Bid = mongoose.model('Bid', bidSchema);
export default Bid;
