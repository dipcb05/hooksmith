import { Worker } from 'bullmq';
import { connectMongo } from '../db.js';
import { config } from '../config.js';
import { connection } from '../queues.js';
import { Source } from '../models/source.js';
import { Transformation } from '../models/transformation.js';
import { generateTransformation } from '../services/transformationGenerator.js';
import { recordDlq } from '../services/dlqService.js';

export async function startRegenerationWorker() {
  await connectMongo();
  return new Worker(
    'transformation-regeneration',
    async (job) => {
      const source = await Source.findOne({ sourceId: job.data.sourceId, enabled: true });
      if (!source) throw new Error(`Source not found: ${job.data.sourceId}`);
      try {
        const generated = await generateTransformation({
          source,
          schemaShape: job.data.schemaShape
        });
        await Transformation.updateMany(
          { sourceId: source.sourceId, status: 'ACTIVE' },
          { status: 'STALE' }
        );
        return Transformation.create({
          sourceId: source.sourceId,
          schemaFingerprint: job.data.schemaFingerprint,
          functionCode: generated.functionCode,
          status: 'ACTIVE',
          generatedBy: generated.model,
          promptHash: generated.promptHash
        });
      } catch (error) {
        await recordDlq({
          sourceId: job.data.sourceId,
          jobName: job.name,
          queueName: job.queueName,
          reason: error.message,
          error,
          payload: job.data
        });
        throw error;
      }
    },
    { connection, concurrency: config.regenerationConcurrency }
  );
}

if (process.argv[1]?.endsWith('regenerationWorker.js')) {
  startRegenerationWorker().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
