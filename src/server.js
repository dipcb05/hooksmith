import { buildApp } from './app.js';
import { config } from './config.js';
import { connectMongo } from './db.js';
import { loadConnectors } from './services/connectorLoader.js';
import { startDeliveryWorker } from './workers/deliveryWorker.js';
import { startRegenerationWorker } from './workers/regenerationWorker.js';
import { closeQueues } from './queues.js';

const app = buildApp();

async function main() {
  await connectMongo();
  await loadConnectors();
  const workers = await Promise.all([startDeliveryWorker(), startRegenerationWorker()]);

  const shutdown = async () => {
    app.log.info('Shutting down');
    await Promise.all(workers.map((worker) => worker.close()));
    await closeQueues();
    await app.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  await app.listen({ port: config.port, host: '0.0.0.0' });
}

main().catch((error) => {
  app.log.error(error);
  process.exit(1);
});
