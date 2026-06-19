import { Schema, model } from 'mongoose';

const DestinationSchema = new Schema(
  {
    url: { type: String, required: true },
    method: { type: String, enum: ['POST', 'PUT', 'PATCH'], default: 'POST' },
    headers: { type: Map, of: String, default: {} },
    maxAttempts: { type: Number, default: 5, min: 1, max: 25 },
    timeoutMs: { type: Number, default: 10000, min: 1000, max: 60000 }
  },
  { _id: false }
);

const SourceSchema = new Schema(
  {
    sourceId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    enabled: { type: Boolean, default: true },
    signature: {
      strategy: { type: String, required: true },
      secretHeader: { type: String },
      signatureHeader: { type: String },
      timestampHeader: { type: String },
      secret: { type: String, required: true }
    },
    outputDescription: { type: String, required: true },
    schemaFingerprint: { type: String },
    destination: { type: DestinationSchema, required: true },
    connectorVersion: { type: String, default: '1.0.0' }
  },
  { timestamps: true }
);

export const Source = model('Source', SourceSchema);
