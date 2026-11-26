import mongoose from 'mongoose';

const disputeSchema = new mongoose.Schema(
  {
    reporterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Reporter reference is required'],
      index: true,
    },
    reportedUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    auctionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Auction',
      default: null,
      index: true,
    },
    title: {
      type: String,
      default: '',
      trim: true,
      maxlength: [200, 'Dispute title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      required: [true, 'Dispute description is required'],
      trim: true,
      maxlength: [2000, 'Dispute description cannot exceed 2000 characters'],
    },
    status: {
      type: String,
      enum: ['open', 'resolved', 'dismissed'],
      default: 'open',
      index: true,
    },
    resolutionNote: {
      type: String,
      default: '',
      trim: true,
      maxlength: [1000, 'Resolution note cannot exceed 1000 characters'],
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: true },
  }
);

disputeSchema.index({ status: 1, createdAt: -1 });

export const Dispute = mongoose.model('Dispute', disputeSchema);
export default Dispute;

