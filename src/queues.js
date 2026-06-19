import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { config } from './config.js';

export const connection = new IORedis(config.redisUrl, {
  maxRetriesPerRequest: null
});

export const regenerationQueue = new Queue('transformation-regeneration', { connection });
export const deliveryQueue = new Queue('webhook-delivery', { connection });
export const deadLetterQueue = new Queue('webhook-dead-letter', { connection });

export async function closeQueues() {
  await Promise.all([
    regenerationQueue.close(),
    deliveryQueue.close(),
    deadLetterQueue.close(),
    connection.quit()
  ]);
}
