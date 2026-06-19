import { z } from 'zod';
import { Source } from '../models/source.js';
import { getVerifier } from '../signatures/index.js';
import { ingestWebhook } from '../services/pipeline.js';
import { normalizeHeaders } from '../utils/headers.js';

const ParamsSchema = z.object({ sourceId: z.string().min(1) });

export async function webhookRoutes(app) {
  app.post('/webhooks/:sourceId', async (request, reply) => {
    const { sourceId } = ParamsSchema.parse(request.params);
    const source = await Source.findOne({ sourceId, enabled: true });
    if (!source) return reply.notFound('Unknown source');

    const headers = normalizeHeaders(request.headers);
    const verifier = getVerifier(source.signature.strategy);
    if (!verifier) return reply.badRequest(`Unsupported signature strategy: ${source.signature.strategy}`);

    const verified = verifier.verify({
      rawBody: request.rawBody,
      headers,
      source
    });
    if (!verified) return reply.unauthorized('Invalid webhook signature');

    const webhook = await ingestWebhook({
      source,
      headers,
      rawPayload: request.body
    });

    return reply.code(202).send({ id: webhook.id, status: 'QUEUED' });
  });
}
