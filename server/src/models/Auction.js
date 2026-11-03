import mongoose from 'mongoose';

const auctionSchema = new mongoose.Schema(
  {
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Auction title is required'],
      trim: true,
      maxlength: [120, 'Title cannot exceed 120 characters'],
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
      index: true,
    },
    condition: {
      type: String,
      enum: ['new', 'like-new', 'good', 'fair', 'poor'],
      default: 'good',
    },
    images: {
      type: [String],
      default: [],
    },
    startingBid: {
      type: Number,
      required: [true, 'Starting bid is required'],
      min: [1, 'Starting bid must be at least 1'],
    },
    currentBid: {
      type: Number,
      default: function () {
        return this.startingBid;
      },
    },
    highestBidderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    bidCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    startTime: {
      type: Date,
      default: Date.now,
    },
    endTime: {
      type: Date,
      required: [true, 'End time is required'],
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'live', 'completed', 'unsold', 'admin-terminated'],
      default: 'live',
      index: true,
    },
    version: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    optimisticConcurrency: false, // We manage version manually for OCC in atomic updates
  }
);

// Indexes per spec & search requirements
auctionSchema.index({ status: 1, endTime: 1 });
auctionSchema.index({ title: 'text', description: 'text' });

export const Auction = mongoose.model('Auction', auctionSchema);
export default Auction;
