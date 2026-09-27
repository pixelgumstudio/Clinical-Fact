import mongoose, { Document, Schema } from 'mongoose';

interface IPlatformCounts {
  ios: number;
  android: number;
}

export interface INotificationCampaign extends Document {
  title: string;
  body: string;
  data?: Record<string, any>;
  platform: 'ios' | 'android' | 'all';
  audienceFilter: Record<string, any>;
  audienceCount: number;
  sentCount: number;
  failedCount: number;
  sentByPlatform: IPlatformCounts;
  failedByPlatform: IPlatformCounts;
  status: 'sent' | 'partial' | 'failed' | 'no_recipients';
  createdAt: Date;
  updatedAt: Date;
}

const PlatformCountsSchema = new Schema<IPlatformCounts>(
  {
    ios: { type: Number, default: 0 },
    android: { type: Number, default: 0 },
  },
  { _id: false }
);

const NotificationCampaignSchema = new Schema<INotificationCampaign>(
  {
    title: {
      type: String,
      required: true,
    },
    body: {
      type: String,
      required: true,
    },
    data: {
      type: Schema.Types.Mixed,
    },
    platform: {
      type: String,
      enum: ['ios', 'android', 'all'],
      default: 'all',
    },
    audienceFilter: {
      type: Schema.Types.Mixed,
      default: {},
    },
    audienceCount: {
      type: Number,
      default: 0,
    },
    sentCount: {
      type: Number,
      default: 0,
    },
    failedCount: {
      type: Number,
      default: 0,
    },
    sentByPlatform: {
      type: PlatformCountsSchema,
      default: () => ({ ios: 0, android: 0 }),
    },
    failedByPlatform: {
      type: PlatformCountsSchema,
      default: () => ({ ios: 0, android: 0 }),
    },
    status: {
      type: String,
      enum: ['sent', 'partial', 'failed', 'no_recipients'],
      default: 'no_recipients',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

NotificationCampaignSchema.index({ createdAt: -1 });

export default mongoose.model<INotificationCampaign>('NotificationCampaign', NotificationCampaignSchema);
