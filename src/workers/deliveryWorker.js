import { Worker } from 'bullmq';
import { setTimeout as sleep } from 'node:timers/promises';
import { connectMongo } from '../db.js';
import { config } from '../config.js';
import { connection, deliveryQueue } from '../queues.js';
import { Source } from '../models/source.js';
import { Webhook } from '../models/webhook.js';
import { Transformation } from '../models/transformation.js';
import { executeTransformation } from '../services/transformationExecutor.js';
import { deliver } from '../services/deliveryService.js';
import { recordDlq } from '../services/dlqService.js';

function decorrelatedJitterDelay(previous, base = 1000, cap = 30000) {
  const min = base;
  const max = Math.max(base, previous * 3);
  return Math.min(cap, Math.floor(min + Math.random() * (max - min)));
}

async function waitForTransformation(job, webhook) {
  const waitAttempts = job.data.waitForTransformationAttempts || 0;
  if (waitAttempts >= 10) {
    await recordDlq({
      sourceId: webhook.sourceId,
      webhookId: webhook.id,
      jobName: job.name,
      queueName: job.queueName,
      reason: `No active transformation for source ${webhook.sourceId}`,
      payload: { webhookId: webhook.id }
    });
    return;
  }

  await deliveryQueue.add(
    'deliver-webhook',
    {
      ...job.data,
      waitForTransformationAttempts: waitAttempts + 1
    },
    { delay: decorrelatedJitterDelay(1000, 1000, 10000), attempts: 1 }
  );
}

export async function startDeliveryWorker() {
  await connectMongo();
  return new Worker(
    'webhook-delivery',
    async (job) => {
      const webhook = await Webhook.findById(job.data.webhookId);
      if (!webhook) throw new Error(`Webhook not found: ${job.data.webhookId}`);
      const source = await Source.findOne({ sourceId: webhook.sourceId, enabled: true });
      if (!source) throw new Error(`Source not found: ${webhook.sourceId}`);

      const transformation = await Transformation.findOne({
        sourceId: webhook.sourceId,
        status: 'ACTIVE'
      }).sort({ createdAt: -1 });

      if (!transformation) {
        await waitForTransformation(job, webhook);
        return;
      }

      let result;
      try {
        result = executeTransformation(transformation.functionCode, webhook.rawPayload);
      } catch (error) {
        await recordDlq({
          sourceId: webhook.sourceId,
          webhookId: webhook.id,
          jobName: job.name,
          queueName: job.queueName,
          reason: `Transformation failed: ${error.message}`,
          error,
          payload: { webhookId: webhook.id }
        });
        return;
      }

      let previousDelay = 1000;
      const maxAttempts = source.destination.maxAttempts || 5;
      for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        try {
          await deliver({ destination: source.destination, body: result });
          await Webhook.findByIdAndUpdate(webhook.id, {
            status: 'DELIVERED',
            transformationId: transformation._id
          });
          return;
        } catch (error) {
          if (attempt === maxAttempts) {
            await recordDlq({
              sourceId: webhook.sourceId,
              webhookId: webhook.id,
              jobName: job.name,
              queueName: job.queueName,
              reason: `Delivery exhausted after ${maxAttempts} attempts: ${error.message}`,
              error,
              payload: { webhookId: webhook.id, transformedPayload: result }
            });
            return;
          }
          previousDelay = decorrelatedJitterDelay(previousDelay);
          await sleep(previousDelay);
        }
      }
    },
    { connection, concurrency: config.deliveryConcurrency }
  );
}

if (process.argv[1]?.endsWith('deliveryWorker.js')) {
  startDeliveryWorker().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
