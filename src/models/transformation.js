import { Schema, model } from 'mongoose';

const TransformationSchema = new Schema(
  {
    sourceId: { type: String, required: true, index: true },
    schemaFingerprint: { type: String, required: true },
    functionCode: { type: String, required: true },
    status: { type: String, enum: ['ACTIVE', 'STALE'], default: 'ACTIVE', index: true },
    generatedBy: { type: String, required: true },
    promptHash: { type: String, required: true },
    error: { type: String }
  },
  { timestamps: true }
);

TransformationSchema.index({ sourceId: 1, status: 1 });

export const Transformation = model('Transformation', TransformationSchema);
