import { Dlq } from '../models/dlq.js';
import { Webhook } from '../models/webhook.js';
import { deadLetterQueue } from '../queues.js';

export async function recordDlq({ sourceId, webhookId, jobName, queueName, reason, error, payload }) {
  const dlq = await Dlq.create({
    sourceId,
    webhookId,
    jobName,
    queueName,
    reason,
    errorStack: error?.stack,
    payload
  });
  if (webhookId) {
    await Webhook.findByIdAndUpdate(webhookId, { status: 'DLQ' });
  }
  await deadLetterQueue.add(jobName, { dlqId: dlq.id, sourceId, webhookId, payload });
  return dlq;
}
