import fs from 'node:fs/promises';
import path from 'node:path';
import yaml from 'js-yaml';
import { z } from 'zod';
import { Source } from '../models/source.js';
import { config } from '../config.js';

const ConnectorSchema = z.object({
  sourceId: z.string().min(1),
  name: z.string().min(1),
  enabled: z.boolean().default(true),
  signature: z.object({
    strategy: z.string().min(1),
    secretHeader: z.string().optional(),
    signatureHeader: z.string().optional(),
    timestampHeader: z.string().optional(),
    secret: z.string().optional()
  }),
  outputDescription: z.string().min(1),
  destination: z.object({
    url: z.string().url(),
    method: z.enum(['POST', 'PUT', 'PATCH']).default('POST'),
    headers: z.record(z.string()).default({}),
    maxAttempts: z.number().int().min(1).max(25).default(5),
    timeoutMs: z.number().int().min(1000).max(60000).default(10000)
  }),
  outputLanguage: z.enum(['javascript', 'python', 'php', 'java', 'csharp', 'go', 'ruby', 'cpp']).default('javascript'),
  connectorVersion: z.string().default('1.0.0')
});

export async function loadConnectors() {
  const dir = path.resolve(config.connectorsDir);
  const files = await fs.readdir(dir).catch(() => []);
  const yamlFiles = files.filter((file) => file.endsWith('.yaml') || file.endsWith('.yml'));

  for (const file of yamlFiles) {
    const document = yaml.load(await fs.readFile(path.join(dir, file), 'utf8'));
    const connector = ConnectorSchema.parse(document);
    const { sourceId, ...rest } = connector;
    await Source.findOneAndUpdate(
      { sourceId },
      { $set: rest },
      { upsert: true, new: true }
    );
  }
}
