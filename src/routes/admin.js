import { z } from 'zod';
import { Dlq } from '../models/dlq.js';
import { Transformation } from '../models/transformation.js';
import { Webhook } from '../models/webhook.js';
import { deliveryQueue } from '../queues.js';
import { replayWebhook } from '../services/pipeline.js';

const WebhookQuerySchema = z.object({
  sourceId: z.string().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50)
});

export async function adminRoutes(app) {
  app.get('/admin/webhooks', async (request) => {
    const query = WebhookQuerySchema.parse(request.query);
    const filter = {};
    if (query.sourceId) filter.sourceId = query.sourceId;
    if (query.from || query.to) {
      filter.receivedAt = {};
      if (query.from) filter.receivedAt.$gte = query.from;
      if (query.to) filter.receivedAt.$lte = query.to;
    }
    return Webhook.find(filter).sort({ receivedAt: -1 }).limit(query.limit).lean();
  });

  app.get('/admin/transformations/:sourceId', async (request, reply) => {
    const params = z.object({ sourceId: z.string().min(1) }).parse(request.params);
    const transformation = await Transformation.findOne({ sourceId: params.sourceId })
      .sort({ createdAt: -1 })
      .lean();
    if (!transformation) return reply.notFound('Transformation not found');
    return transformation;
  });

  app.post('/admin/webhooks/:id/replay', async (request, reply) => {
    const params = z.object({ id: z.string().min(1) }).parse(request.params);
    const webhook = await replayWebhook(params.id);
    if (!webhook) return reply.notFound('Webhook not found');
    return reply.code(202).send({ id: webhook.id, status: 'QUEUED' });
  });

  app.get('/admin/dlq', async (request) => {
    const query = z.object({ limit: z.coerce.number().int().min(1).max(100).default(50) }).parse(request.query);
    return Dlq.find({}).sort({ createdAt: -1 }).limit(query.limit).lean();
  });

  app.post('/admin/dlq/:id/replay', async (request, reply) => {
    const params = z.object({ id: z.string().min(1) }).parse(request.params);
    const dlq = await Dlq.findById(params.id);
    if (!dlq) return reply.notFound('DLQ document not found');
    if (!dlq.webhookId) return reply.badRequest('DLQ item has no webhookId to replay');
    await deliveryQueue.add('deliver-webhook', { webhookId: dlq.webhookId.toString(), replay: true });
    dlq.replayedAt = new Date();
    await dlq.save();
    return reply.code(202).send({ id: dlq.id, status: 'REENQUEUED' });
  });
}
