import Fastify from 'fastify';
import sensible from '@fastify/sensible';
import formbody from '@fastify/formbody';
import { ZodError } from 'zod';
import { webhookRoutes } from './routes/webhooks.js';
import { adminRoutes } from './routes/admin.js';

export function buildApp() {
  const app = Fastify({
    logger: true,
    bodyLimit: 10 * 1024 * 1024
  });

  app.addContentTypeParser(
    'application/json',
    { parseAs: 'buffer' },
    (request, body, done) => {
      request.rawBody = body.toString('utf8');
      try {
        done(null, JSON.parse(request.rawBody || '{}'));
      } catch (error) {
        done(error);
      }
    }
  );

  app.register(sensible);
  app.register(formbody);
  app.register(webhookRoutes);
  app.register(adminRoutes);

  app.get('/healthz', async () => ({ ok: true }));

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ZodError) {
      return reply.code(400).send({ error: 'ValidationError', issues: error.issues });
    }
    request.log.error(error);
    return reply.code(error.statusCode || 500).send({
      error: error.name || 'InternalServerError',
      message: error.message
    });
  });

  return app;
}
