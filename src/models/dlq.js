import { Schema, model, Types } from 'mongoose';

const DlqSchema = new Schema(
  {
    sourceId: { type: String, required: true, index: true },
    webhookId: { type: Types.ObjectId, ref: 'Webhook' },
    jobName: { type: String, required: true },
    queueName: { type: String, required: true },
    reason: { type: String, required: true },
    errorStack: { type: String },
    payload: { type: Schema.Types.Mixed },
    replayable: { type: Boolean, default: true },
    replayedAt: { type: Date },
    createdAt: { type: Date, default: Date.now, index: true }
  },
  { timestamps: true }
);

export const Dlq = model('Dlq', DlqSchema);
