import mongoose, { Schema, Document } from 'mongoose';

/**
 * DismissedNotification — Tracks per-user notification dismissals.
 *
 * Notifications are generated dynamically (not stored), but their IDs are
 * deterministic (same workId + type → same hash). This collection simply
 * records "user X has seen/dismissed notification Y", allowing the
 * notification generator to filter them out on subsequent requests.
 */

export interface IDismissedNotification extends Document {
  userId: mongoose.Types.ObjectId;
  notificationId: string;
  dismissedAt: Date;
}

const DismissedNotificationSchema = new Schema<IDismissedNotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    notificationId: { type: String, required: true },
    dismissedAt: { type: Date, default: Date.now, required: true },
  },
  { timestamps: false }
);

// Unique compound index — each user can dismiss each notification exactly once
DismissedNotificationSchema.index({ userId: 1, notificationId: 1 }, { unique: true });

// Fast lookup: all dismissed notification IDs for a given user
DismissedNotificationSchema.index({ userId: 1 });

export const DismissedNotificationModel = mongoose.model<IDismissedNotification>(
  'DismissedNotification',
  DismissedNotificationSchema
);
