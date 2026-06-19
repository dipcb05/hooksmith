import { Source } from '../models/source.js';
import { Webhook } from '../models/webhook.js';
import { Transformation } from '../models/transformation.js';
import { deliveryQueue, regenerationQueue } from '../queues.js';
import { schemaFingerprint } from '../utils/schemaFingerprint.js';

export async function ingestWebhook({ source, headers, rawPayload }) {
  const { shape, fingerprint } = schemaFingerprint(rawPayload);
  const webhook = await Webhook.create({
    sourceId: source.sourceId,
    headers,
    rawPayload,
    schemaShape: shape,
    schemaFingerprint: fingerprint
  });

  const schemaChanged = source.schemaFingerprint !== fingerprint;
  if (schemaChanged) {
    await Transformation.updateMany(
      { sourceId: source.sourceId, status: 'ACTIVE' },
      { status: 'STALE' }
    );
    await Source.updateOne({ _id: source._id }, { schemaFingerprint: fingerprint });
    await regenerationQueue.add(
      'regenerate-transformation',
      { sourceId: source.sourceId, schemaShape: shape, schemaFingerprint: fingerprint },
      { jobId: `${source.sourceId}:${fingerprint}` }
    );
  }

  await deliveryQueue.add(
    'deliver-webhook',
    { webhookId: webhook.id },
    { attempts: 1, delay: schemaChanged ? 2000 : 0 }
  );
  await Webhook.findByIdAndUpdate(webhook.id, { status: 'QUEUED' });
  return webhook;
}

export async function replayWebhook(webhookId) {
  const webhook = await Webhook.findById(webhookId);
  if (!webhook) return null;
  await deliveryQueue.add('deliver-webhook', { webhookId: webhook.id, replay: true });
  await Webhook.findByIdAndUpdate(webhook.id, { status: 'QUEUED' });
  return webhook;
}
