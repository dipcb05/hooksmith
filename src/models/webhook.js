import { Schema, model, Types } from 'mongoose';

const WebhookSchema = new Schema(
  {
    sourceId: { type: String, required: true, index: true },
    headers: { type: Map, of: String, required: true },
    rawPayload: { type: Schema.Types.Mixed, required: true },
    schemaShape: { type: Schema.Types.Mixed, required: true },
    schemaFingerprint: { type: String, required: true, index: true },
    transformationId: { type: Types.ObjectId, ref: 'Transformation' },
    status: {
      type: String,
      enum: ['RECEIVED', 'QUEUED', 'DELIVERED', 'DLQ'],
      default: 'RECEIVED',
      index: true
    },
    receivedAt: { type: Date, default: Date.now, index: true }
  },
  { timestamps: true }
);

export const Webhook = model('Webhook', WebhookSchema);
